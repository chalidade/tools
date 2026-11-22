import type { PDFDict, PDFObject, PDFRawStream } from 'pdf-lib'
import { canvasBlob, newCanvas } from '@/lib/image'
import { openPdfDoc } from '@/lib/pdf-doc'
import { applyAlpha, toRgba, unpredictPng, type PixelSpec } from './pixels'

export interface ExtractedImage {
  id: number
  /** 1-based page the image is used on (0 when no page references it). */
  page: number
  width: number
  height: number
  ext: 'jpg' | 'png'
  blob: Blob
}

export interface ExtractResult {
  images: ExtractedImage[]
  /** Images that could not be decoded (JPEG 2000, JBIG2, CCITT, stencil masks, special colour spaces). */
  skipped: number
}

const FLATE_LIKE = new Set(['FlateDecode', 'LZWDecode', 'ASCII85Decode', 'ASCIIHexDecode', 'RunLengthDecode', 'Fl', 'LZW', 'A85', 'AHx', 'RL'])

export async function extractImages(file: File, onProgress?: (done: number, total: number) => void): Promise<ExtractResult> {
  const lib = await import('pdf-lib')
  const { PDFName, PDFNumber, PDFArray, PDFDict, PDFRawStream, PDFRef, PDFBool, PDFHexString, PDFString, decodePDFRawStream } = lib
  const doc = await openPdfDoc(new Uint8Array(await file.arrayBuffer()))
  const ctx = doc.context

  const name = (o: PDFObject | undefined) => (o instanceof PDFName ? o.decodeText() : undefined)
  const num = (o: PDFObject | undefined) => (o instanceof PDFNumber ? o.asNumber() : undefined)
  const get = (d: PDFDict, key: string) => d.lookup(PDFName.of(key))

  const images = new Map<string, PDFRawStream>()
  const maskRefs = new Set<string>()
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || name(get(obj.dict, 'Subtype')) !== 'Image') continue
    images.set(ref.tag, obj)
    for (const key of ['SMask', 'Mask']) {
      const m = obj.dict.get(PDFName.of(key))
      if (m instanceof PDFRef) maskRefs.add(m.tag)
    }
  }

  // Which page uses which image (walks Form XObjects too).
  const pageOf = new Map<string, number>()
  const seenForms = new Set<string>()
  const walk = (resources: PDFObject | undefined, page: number, depth: number) => {
    if (!(resources instanceof PDFDict) || depth > 4) return
    const xo = resources.lookup(PDFName.of('XObject'))
    if (!(xo instanceof PDFDict)) return
    for (const [, v] of xo.entries()) {
      if (!(v instanceof PDFRef)) continue
      const s = ctx.lookup(v)
      if (!(s instanceof PDFRawStream)) continue
      const sub = name(get(s.dict, 'Subtype'))
      if (sub === 'Image') {
        if (!pageOf.has(v.tag)) pageOf.set(v.tag, page)
      } else if (sub === 'Form' && !seenForms.has(v.tag + ':' + page)) {
        seenForms.add(v.tag + ':' + page)
        walk(get(s.dict, 'Resources'), page, depth + 1)
      }
    }
  }
  doc.getPages().forEach((p, i) => walk(p.node.Resources(), i + 1, 0))

  const todo = [...images].filter(([tag]) => !maskRefs.has(tag))
  const out: ExtractedImage[] = []
  let skipped = 0

  const filters = (d: PDFDict) => {
    const f = d.lookup(PDFName.of('Filter')) ?? d.lookup(PDFName.of('F'))
    if (f instanceof PDFName) return [f.decodeText()]
    if (f instanceof PDFArray) return f.asArray().map((x) => name(ctx.lookup(x)) ?? '?')
    return []
  }

  function bytesOf(s: PDFRawStream): Uint8Array {
    return decodePDFRawStream(s).decode()
  }

  /** Decoded RGBA (alpha 255) for a non-JPEG image stream, or null. */
  function decodeRaw(s: PDFRawStream, rawData?: Uint8Array): { rgba: Uint8ClampedArray; width: number; height: number } | null {
    const d = s.dict
    const width = num(get(d, 'Width') ?? get(d, 'W'))
    const height = num(get(d, 'Height') ?? get(d, 'H'))
    if (!width || !height) return null
    const im = get(d, 'ImageMask')
    if (im instanceof PDFBool && im.asBoolean()) return null
    const bpc = num(get(d, 'BitsPerComponent')) ?? 8
    if (![1, 2, 4, 8, 16].includes(bpc)) return null
    const fl = filters(d)
    if (!fl.every((f) => FLATE_LIKE.has(f))) return null

    // Colour space → components / palette
    let cs = d.lookup(PDFName.of('ColorSpace'))
    let comps = 0
    let palette: PixelSpec['palette']
    const compsOf = (c: PDFObject | undefined): number => {
      const n = name(c)
      if (n === 'DeviceGray' || n === 'G' || n === 'CalGray') return 1
      if (n === 'DeviceRGB' || n === 'RGB' || n === 'CalRGB') return 3
      if (n === 'DeviceCMYK' || n === 'CMYK') return 4
      if (c instanceof PDFArray) {
        const k = name(c.lookup(0))
        if (k === 'CalGray') return 1
        if (k === 'CalRGB' || k === 'Lab') return 3
        if (k === 'ICCBased') {
          const st = c.lookup(1)
          return st instanceof PDFRawStream ? (num(get(st.dict, 'N')) ?? 0) : 0
        }
      }
      return 0
    }
    if (cs instanceof PDFArray && (name(cs.lookup(0)) === 'Indexed' || name(cs.lookup(0)) === 'I')) {
      const base = compsOf(cs.lookup(1))
      const tbl = cs.lookup(3)
      if (!base || base === 0) return null
      let table: Uint8Array | undefined
      if (tbl instanceof PDFRawStream) table = bytesOf(tbl)
      else if (tbl instanceof PDFHexString || tbl instanceof PDFString) table = tbl.asBytes()
      if (!table) return null
      palette = { base, table }
      comps = 1
    } else {
      comps = compsOf(cs)
    }
    if (![1, 3, 4].includes(comps)) return null
    if (cs === undefined) return null

    let data = rawData ?? bytesOf(s)
    const parms = get(d, 'DecodeParms') ?? get(d, 'DP')
    const p = parms instanceof PDFArray ? parms.lookupMaybe(parms.size() - 1, PDFDict) : parms instanceof PDFDict ? parms : undefined
    const predictor = p ? (num(p.lookup(PDFName.of('Predictor'))) ?? 1) : 1
    if (predictor >= 10) {
      const colors = num(p!.lookup(PDFName.of('Colors'))) ?? 1
      const pbpc = num(p!.lookup(PDFName.of('BitsPerComponent'))) ?? 8
      const columns = num(p!.lookup(PDFName.of('Columns'))) ?? 1
      data = unpredictPng(data, colors, pbpc, columns)
    } else if (predictor === 2) return null

    const dec = d.lookup(PDFName.of('Decode'))
    const invert = dec instanceof PDFArray && !palette && num(dec.lookup(0)) === 1 && num(dec.lookup(1)) === 0
    const rgba = toRgba(data, { width, height, bpc, comps, palette, invert })
    return rgba ? { rgba, width, height } : null
  }

  async function encodePng(rgba: Uint8ClampedArray, width: number, height: number) {
    const canvas = newCanvas(width, height)
    const c = canvas.getContext('2d')!
    c.putImageData(new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0)
    return canvasBlob(canvas, 'image/png')
  }

  let done = 0
  for (const [tag, s] of todo) {
    onProgress?.(done++, todo.length)
    if (done % 4 === 0) await new Promise((r) => setTimeout(r, 0))
    try {
      const width = num(get(s.dict, 'Width')) ?? 0
      const height = num(get(s.dict, 'Height')) ?? 0
      if (width < 1 || height < 1) {
        skipped++
        continue
      }
      const fl = filters(s.dict)
      const page = pageOf.get(tag) ?? 0
      if (fl.length === 1 && (fl[0] === 'DCTDecode' || fl[0] === 'DCT')) {
        // Stored as-is: the very same bytes, no recompression.
        const copy = new Uint8Array(s.contents)
        out.push({ id: out.length + 1, page, width, height, ext: 'jpg', blob: new Blob([copy], { type: 'image/jpeg' }) })
        continue
      }
      const img = decodeRaw(s)
      if (!img) {
        skipped++
        continue
      }
      // Soft mask → alpha
      const sm = s.dict.get(PDFName.of('SMask'))
      if (sm instanceof PDFRef) {
        const ms = ctx.lookup(sm)
        if (ms instanceof PDFRawStream) {
          const mfl = filters(ms.dict)
          if (mfl.length === 1 && mfl[0] === 'DCTDecode') {
            // rare: JPEG-compressed mask — keep the image opaque
          } else {
            const m = decodeRaw(ms)
            if (m) applyAlpha(img.rgba, img.width, img.height, m.rgba, m.width, m.height)
          }
        }
      }
      out.push({ id: out.length + 1, page, width: img.width, height: img.height, ext: 'png', blob: await encodePng(img.rgba, img.width, img.height) })
    } catch {
      skipped++
    }
  }
  onProgress?.(todo.length, todo.length)
  out.sort((a, b) => (a.page || 1e9) - (b.page || 1e9))
  out.forEach((im, i) => (im.id = i + 1))
  return { images: out, skipped }
}

/** "foto-p3-2.jpg" */
export function imageFileName(base: string, im: ExtractedImage, index: number) {
  return `${base}-${im.page ? `p${im.page}-` : ''}${index + 1}.${im.ext}`
}
