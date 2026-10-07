// Compresses a PDF in the visitor's browser, keeping its text as text.
//
// 1. qpdf dumps the PDF as JSON with every stream's raw bytes inline.
// 2. Each JPEG image (DCTDecode) is decoded by the browser, scaled down and
//    re-encoded at a lower quality — kept only when it actually got smaller.
// 3. qpdf rebuilds the PDF from that JSON, recompressing every other stream
//    and packing objects into compressed object streams.
//
// Other image kinds (PNG-style Flate images, CMYK JPEGs) are left as they are.

import { tr } from '@/lib/i18n'
import { runQpdf } from '@/lib/qpdf'

export type Level = 'light' | 'medium' | 'strong'

const LEVELS: Record<Level, { maxSide: number; quality: number }> = {
  light: { maxSide: 2400, quality: 0.82 },
  medium: { maxSide: 1600, quality: 0.7 },
  strong: { maxSide: 1100, quality: 0.55 },
}

export interface CompressResult {
  output: Uint8Array
  before: number
  after: number
  images: { found: number; shrunk: number }
}

type PdfValue = string | number | boolean | null | PdfValue[] | { [key: string]: PdfValue }
type PdfDict = Record<string, PdfValue>
type JsonObject = { value?: PdfValue; stream?: { dict: PdfDict; data?: string } }

const OPTIMIZE = ['--object-streams=generate', '--compress-streams=y', '--recompress-flate', '--compression-level=9']

function fromBase64(b64: string) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function toBase64(blob: Blob) {
  const url: string = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
  return url.slice(url.indexOf(',') + 1)
}

/** Colour components of an image's colour space; null when it is one we should not touch. */
function components(space: PdfValue | undefined, objects: Record<string, JsonObject>): number | null {
  if (space === '/DeviceRGB') return 3
  if (space === '/DeviceGray') return 1
  if (Array.isArray(space) && space[0] === '/ICCBased' && typeof space[1] === 'string') {
    const n = objects[`obj:${space[1]}`]?.stream?.dict['/N']
    return n === 1 || n === 3 ? n : null
  }
  return null // CMYK, Lab, Indexed, separations… browsers decode these unreliably
}

const isDct = (filter: PdfValue | undefined) =>
  filter === '/DCTDecode' || (Array.isArray(filter) && filter.length === 1 && filter[0] === '/DCTDecode')

async function shrinkJpeg(data: Uint8Array, maxSide: number, quality: number) {
  const bitmap = await createImageBitmap(new Blob([data as BlobPart], { type: 'image/jpeg' }))
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality),
    )
    return { blob, width: canvas.width, height: canvas.height }
  } finally {
    bitmap.close()
  }
}

export async function compressPdf(
  input: Uint8Array,
  level: Level,
  onProgress: (stage: string) => void,
): Promise<CompressResult> {
  const { maxSide, quality } = LEVELS[level]

  onProgress(tr('Membaca struktur PDF…', 'Reading the PDF structure…'))
  const dump = await runQpdf(input, (i, o) => [i, '--json-output=2', '--json-stream-data=inline', '--decode-level=none', o])
  if (dump.code === 2 || !dump.output) throw new Error('read')
  const json = JSON.parse(new TextDecoder().decode(dump.output)) as { qpdf: [unknown, Record<string, JsonObject>] }
  const objects = json.qpdf[1]

  const candidates = Object.values(objects).filter((o) => {
    const d = o.stream?.dict
    return (
      d && o.stream?.data && d['/Subtype'] === '/Image' && isDct(d['/Filter']) && d['/BitsPerComponent'] === 8 &&
      !d['/Decode'] && !d['/ImageMask'] && components(d['/ColorSpace'], objects) !== null
    )
  })

  let shrunk = 0
  for (const [i, obj] of candidates.entries()) {
    onProgress(tr(`Mengecilkan gambar ${i + 1}/${candidates.length}…`, `Shrinking image ${i + 1}/${candidates.length}…`))
    const stream = obj.stream!
    const original = fromBase64(stream.data!)
    try {
      const { blob, width, height } = await shrinkJpeg(original, maxSide, quality)
      if (blob.size >= original.length * 0.9) continue // not worth it: keep the original
      stream.data = await toBase64(blob)
      stream.dict['/Width'] = width
      stream.dict['/Height'] = height
      // The canvas always writes an 8-bit RGB (YCbCr) JPEG.
      if (components(stream.dict['/ColorSpace'], objects) === 1) stream.dict['/ColorSpace'] = '/DeviceRGB'
      delete stream.dict['/ColorTransform']
      delete stream.dict['/DecodeParms']
      delete stream.dict['/Length']
      shrunk++
    } catch {
      // The browser could not decode this JPEG: leave it untouched.
    }
  }

  onProgress(tr('Menyusun ulang PDF…', 'Rebuilding the PDF…'))
  const rebuilt = shrunk
    ? await runQpdf(new TextEncoder().encode(JSON.stringify(json)), (i, o) => ['--json-input', i, ...OPTIMIZE, o])
    : await runQpdf(input, (i, o) => [i, ...OPTIMIZE, o])
  if (rebuilt.code === 2 || !rebuilt.output) throw new Error('write')

  // Never hand back something bigger than what came in.
  const output = rebuilt.output.length < input.length ? rebuilt.output : input
  return { output, before: input.length, after: output.length, images: { found: candidates.length, shrunk } }
}
