// Reads the EXIF block of a JPEG or PNG and removes metadata from JPEG, PNG
// and WebP files without re-encoding the picture. Pure functions over bytes; nothing leaves
// the browser.

export interface ExifField {
  /** [Indonesian, English] label. */
  label: readonly [string, string]
  value: string
}

export interface ExifInfo {
  fields: ExifField[]
  /** Decimal degrees, when the photo carries a GPS position. */
  gps?: { lat: number; lon: number; altitude?: number }
  orientation: number
  /** Which kinds of metadata the file holds (for the summary line). */
  has: { exif: boolean; xmp: boolean; iptc: boolean; comment: boolean }
}

type Kind = 'jpeg' | 'png' | 'webp' | 'other'

export function sniff(bytes: Uint8Array): Kind {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png'
  if (startsWith(bytes, 0, 'RIFF') && startsWith(bytes, 8, 'WEBP')) return 'webp'
  return 'other'
}

interface Segment {
  marker: number
  /** Offset of the 0xFF byte, and the offset just past the segment. */
  start: number
  end: number
}

/** Walks the header segments of a JPEG up to the start of the scan. */
function jpegSegments(b: Uint8Array): Segment[] {
  const out: Segment[] = []
  let p = 2
  while (p + 4 <= b.length && b[p] === 0xff) {
    const marker = b[p + 1]
    if (marker === 0xff) {
      p++
      continue
    }
    if (marker === 0xda || marker === 0xd9) break // start of scan: image data follows
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      p += 2
      continue
    }
    const len = (b[p + 2] << 8) | b[p + 3]
    if (len < 2) break
    out.push({ marker, start: p, end: Math.min(b.length, p + 2 + len) })
    p += 2 + len
  }
  return out
}

const ascii = (b: Uint8Array, from: number, to: number) => {
  let s = ''
  for (let i = from; i < to && i < b.length; i++) s += String.fromCharCode(b[i])
  return s
}

const startsWith = (b: Uint8Array, at: number, text: string) => ascii(b, at, at + text.length) === text

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 }

type Value = number[] | string

/** Reads one IFD of a TIFF block into a tag → value map. */
function readIfd(view: DataView, b: Uint8Array, base: number, offset: number, little: boolean) {
  const tags = new Map<number, Value>()
  if (offset + 2 > view.byteLength - base) return tags
  const count = view.getUint16(base + offset, little)
  for (let i = 0; i < count; i++) {
    const e = base + offset + 2 + i * 12
    if (e + 12 > view.byteLength) break
    const tag = view.getUint16(e, little)
    const type = view.getUint16(e + 2, little)
    const n = view.getUint32(e + 4, little)
    const size = (TYPE_SIZE[type] ?? 0) * n
    if (!size) continue
    const at = size <= 4 ? e + 8 : base + view.getUint32(e + 8, little)
    if (at + size > view.byteLength) continue
    if (type === 2) {
      tags.set(tag, ascii(b, at, at + n).replace(/\0.*$/s, '').trim())
      continue
    }
    const nums: number[] = []
    for (let k = 0; k < Math.min(n, 16); k++) {
      const q = at + k * TYPE_SIZE[type]
      if (type === 1 || type === 7) nums.push(view.getUint8(q))
      else if (type === 3) nums.push(view.getUint16(q, little))
      else if (type === 4) nums.push(view.getUint32(q, little))
      else if (type === 9) nums.push(view.getInt32(q, little))
      else if (type === 5) {
        const d = view.getUint32(q + 4, little)
        nums.push(d ? view.getUint32(q, little) / d : 0)
      } else if (type === 10) {
        const d = view.getInt32(q + 4, little)
        nums.push(d ? view.getInt32(q, little) / d : 0)
      }
    }
    tags.set(tag, nums)
  }
  return tags
}

const num = (v: Value | undefined, i = 0) => (Array.isArray(v) && v.length > i ? v[i] : undefined)
const str = (v: Value | undefined) => (typeof v === 'string' && v ? v : undefined)

function dms(v: Value | undefined, ref: string | undefined) {
  if (!Array.isArray(v) || v.length < 3) return undefined
  const deg = v[0] + v[1] / 60 + v[2] / 3600
  return ref === 'S' || ref === 'W' ? -deg : deg
}

/** "2024:05:17 14:03:09" → "17 Mei 2024, 14:03" is left to the UI; here we only tidy the separator. */
const tidyDate = (s: string) => s.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')

export function readExif(b: Uint8Array): ExifInfo {
  const info: ExifInfo = { fields: [], orientation: 1, has: { exif: false, xmp: false, iptc: false, comment: false } }
  const kind = sniff(b)
  let tiff = -1
  if (kind === 'jpeg') {
    for (const s of jpegSegments(b)) {
      if (s.marker === 0xe1 && startsWith(b, s.start + 4, 'Exif\0\0')) {
        info.has.exif = true
        tiff = s.start + 10
      } else if (s.marker === 0xe1 && startsWith(b, s.start + 4, 'http://ns.adobe.com/')) info.has.xmp = true
      else if (s.marker === 0xed) info.has.iptc = true
      else if (s.marker === 0xfe) info.has.comment = true
    }
  } else if (kind === 'png') {
    for (const c of pngChunks(b)) {
      if (c.type === 'eXIf') {
        info.has.exif = true
        tiff = c.data
      } else if (c.type === 'iTXt' && startsWith(b, c.data, 'XML:com.adobe.xmp')) info.has.xmp = true
      else if (c.type === 'tEXt' || c.type === 'zTXt' || c.type === 'iTXt') info.has.comment = true
    }
  } else if (kind === 'webp') {
    for (const c of webpChunks(b)) {
      if (c.type === 'EXIF') {
        info.has.exif = true
        // Some writers keep JPEG's "Exif\0\0" prefix in the chunk.
        tiff = startsWith(b, c.data, 'Exif\0\0') ? c.data + 6 : c.data
      } else if (c.type === 'XMP ') info.has.xmp = true
    }
  }
  if (tiff < 0 || tiff + 8 > b.length) return info
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const order = ascii(b, tiff, tiff + 2)
  if (order !== 'II' && order !== 'MM') return info
  const little = order === 'II'
  const ifd0 = readIfd(view, b, tiff, view.getUint32(tiff + 4, little), little)
  const exifPtr = num(ifd0.get(0x8769))
  const gpsPtr = num(ifd0.get(0x8825))
  const sub = exifPtr ? readIfd(view, b, tiff, exifPtr, little) : new Map<number, Value>()
  const gps = gpsPtr ? readIfd(view, b, tiff, gpsPtr, little) : new Map<number, Value>()

  info.orientation = num(ifd0.get(0x0112)) ?? 1
  const add = (label: readonly [string, string], value: string | undefined) => {
    if (value) info.fields.push({ label, value })
  }
  const make = str(ifd0.get(0x010f))
  const model = str(ifd0.get(0x0110))
  add(['Kamera', 'Camera'], [make, model && make && model.startsWith(make) ? model.slice(make.length).trim() : model].filter(Boolean).join(' ') || undefined)
  add(['Lensa', 'Lens'], str(sub.get(0xa434)))
  const taken = str(sub.get(0x9003)) ?? str(ifd0.get(0x0132))
  add(['Tanggal foto', 'Date taken'], taken && tidyDate(taken))
  add(['Aplikasi', 'Software'], str(ifd0.get(0x0131)))
  const f = num(sub.get(0x829d))
  add(['Bukaan', 'Aperture'], f ? `f/${+f.toFixed(1)}` : undefined)
  const exp = num(sub.get(0x829a))
  add(['Kecepatan rana', 'Shutter'], exp ? (exp >= 1 ? `${+exp.toFixed(1)} s` : `1/${Math.round(1 / exp)} s`) : undefined)
  const iso = num(sub.get(0x8827))
  add(['ISO', 'ISO'], iso ? String(iso) : undefined)
  const focal = num(sub.get(0x920a))
  add(['Panjang fokus', 'Focal length'], focal ? `${+focal.toFixed(1)} mm` : undefined)
  const w = num(sub.get(0xa002))
  const h = num(sub.get(0xa003))
  add(['Ukuran', 'Size'], w && h ? `${w}×${h}` : undefined)

  const lat = dms(gps.get(2), str(gps.get(1)))
  const lon = dms(gps.get(4), str(gps.get(3)))
  if (lat !== undefined && lon !== undefined) {
    const alt = num(gps.get(6))
    info.gps = { lat, lon, altitude: alt === undefined ? undefined : num(gps.get(5)) === 1 ? -alt : alt }
  }
  return info
}

/** "6.2088° S, 106.8456° E" */
export function formatCoords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(5)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon).toFixed(5)}° ${lon < 0 ? 'W' : 'E'}`
}

/**
 * Text map of a position: a small grid of the world with a marker, enough to
 * tell the continent and rough area apart without loading any map tiles.
 */
export function textMap(lat: number, lon: number, cols = 36, rows = 12) {
  const x = Math.min(cols - 1, Math.max(0, Math.floor(((lon + 180) / 360) * cols)))
  const y = Math.min(rows - 1, Math.max(0, Math.floor(((90 - lat) / 180) * rows)))
  const lines: string[] = []
  for (let r = 0; r < rows; r++) {
    let line = ''
    for (let c = 0; c < cols; c++) line += r === y && c === x ? '◉' : r === Math.floor(rows / 2) ? '─' : c === Math.floor(cols / 2) ? '│' : '·'
    lines.push(line)
  }
  return lines.join('\n')
}

interface Chunk {
  type: string
  /** Offset of the chunk's length field, of its data, and just past its CRC. */
  start: number
  data: number
  end: number
}

function pngChunks(b: Uint8Array): Chunk[] {
  const out: Chunk[] = []
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let p = 8
  while (p + 12 <= b.length) {
    const len = view.getUint32(p)
    out.push({ type: ascii(b, p + 4, p + 8), start: p, data: p + 8, end: Math.min(b.length, p + 12 + len) })
    p += 12 + len
  }
  return out
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, a) => n + a.length, 0))
  let p = 0
  for (const a of parts) {
    out.set(a, p)
    p += a.length
  }
  return out
}

/** Just past the JPEG's end-of-image marker; data after it (MPF previews, phone trailers) is not part of the picture. */
function jpegEnd(b: Uint8Array) {
  let p = 2
  while (p + 4 <= b.length) {
    if (b[p] !== 0xff) return b.length // not a stream we understand: cut nothing
    const marker = b[p + 1]
    if (marker === 0xff) {
      p++
      continue
    }
    if (marker === 0xd9) return p + 2
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      p += 2
      continue
    }
    p += 2 + ((b[p + 2] << 8) | b[p + 3])
    // Entropy-coded data runs until a marker that is not stuffing (FF00) or a restart (FFD0–D7).
    if (marker === 0xda) while (p + 1 < b.length && !(b[p] === 0xff && b[p + 1] !== 0 && (b[p + 1] < 0xd0 || b[p + 1] > 0xd7))) p++
  }
  return b.length
}

/** APP segments the picture needs: the JFIF header, the colour profile, Adobe's colour transform. */
const KEEP_APP: Record<number, string> = { 0xe0: 'JFIF\0', 0xe2: 'ICC_PROFILE\0', 0xee: 'Adobe' }

/**
 * The same JPEG without EXIF, XMP (also Extended XMP), IPTC, comments, any
 * other APP segment, and whatever follows the image (MPF previews and phone
 * trailers carry their own EXIF). The colour profile and the image data are
 * untouched, so quality is identical.
 */
export function stripJpeg(b: Uint8Array): Uint8Array {
  const drop: { start: number; end: number }[] = jpegSegments(b).filter(
    (s) => s.marker === 0xfe || (s.marker >= 0xe0 && s.marker <= 0xef && !(KEEP_APP[s.marker] && startsWith(b, s.start + 4, KEEP_APP[s.marker]))),
  )
  const end = jpegEnd(b)
  if (end < b.length) drop.push({ start: end, end: b.length })
  return cut(b, drop)
}

/** The same PNG without eXIf, text chunks (tEXt, zTXt, iTXt, which also carry XMP), tIME, and anything after IEND. */
export function stripPng(b: Uint8Array): Uint8Array {
  const chunks = pngChunks(b)
  const iend = chunks.findIndex((c) => c.type === 'IEND')
  const drop: { start: number; end: number }[] = chunks.filter((c, i) => ['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'].includes(c.type) && (iend < 0 || i < iend))
  if (iend >= 0 && chunks[iend].end < b.length) drop.push({ start: chunks[iend].end, end: b.length })
  return cut(b, drop)
}

function webpChunks(b: Uint8Array): Chunk[] {
  const out: Chunk[] = []
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const end = Math.min(b.length, 8 + view.getUint32(4, true))
  for (let p = 12; p + 8 <= end; ) {
    const len = view.getUint32(p + 4, true)
    const next = Math.min(end, p + 8 + len + (len & 1)) // chunks are padded to an even size
    out.push({ type: ascii(b, p, p + 4), start: p, data: p + 8, end: next })
    p = next
  }
  return out
}

/** The same WebP without its EXIF and XMP chunks and anything after the RIFF (the VP8X flags and RIFF size are fixed up). */
export function stripWebp(b: Uint8Array): Uint8Array {
  const keep = [b.subarray(0, 12), ...webpChunks(b).filter((c) => c.type !== 'EXIF' && c.type !== 'XMP ').map((c) => b.subarray(c.start, c.end))]
  const out = concat(keep)
  const o = new DataView(out.buffer)
  o.setUint32(4, out.length - 8, true)
  // VP8X flags: bit 3 = has EXIF, bit 2 = has XMP.
  if (startsWith(out, 12, 'VP8X')) out[20] &= ~0x0c
  return out
}

/**
 * Removes the metadata of a JPEG, PNG or WebP without re-encoding it; null
 * for other formats, and for a JPEG whose picture relies on its EXIF
 * orientation (without the tag it would turn sideways, so re-encode those).
 */
export function stripMetadata(b: Uint8Array): Uint8Array | null {
  const kind = sniff(b)
  if (kind === 'jpeg') return readExif(b).orientation <= 1 ? stripJpeg(b) : null
  if (kind === 'png') return stripPng(b)
  if (kind === 'webp') return stripWebp(b)
  return null
}

function cut(b: Uint8Array, parts: { start: number; end: number }[]) {
  if (!parts.length) return b
  const keep: Uint8Array[] = []
  let p = 0
  for (const s of parts) {
    keep.push(b.subarray(p, s.start))
    p = s.end
  }
  keep.push(b.subarray(p))
  return concat(keep)
}
