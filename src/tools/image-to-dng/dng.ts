// Writes a DNG (Adobe's open raw format, a TIFF underneath) from 8-bit sRGB
// pixels. A JPG or PNG has no sensor data, so the picture is stored as
// "LinearRaw": already demosaiced RGB, converted back to linear light as
// 16-bit samples, in 256×256 lossless-JPEG tiles. The colour matrix says the
// samples are linear sRGB under D65, so Lightroom, Photoshop (Camera Raw),
// darktable and RawTherapee open it with the right colours and white balance
// "As Shot" at about 6500 K. A linear profile tone curve keeps the first look
// close to the original instead of Adobe's default contrast curve.
//
// Layout: IFD0 is a small RGB preview (NewSubFileType 1) carrying the DNG
// tags; the full image is its SubIFD (NewSubFileType 0), like Adobe DNG
// Converter writes it.

import { encodeLosslessJpeg } from './ljpeg'

export interface DngInput {
  /** RGBA, row by row, alpha ignored (flatten before). */
  rgba: Uint8ClampedArray
  width: number
  height: number
  /** Capture/creation time written as DateTime. */
  date?: Date
  /** Called with 0…1 while tiles are encoded. */
  onProgress?: (done: number) => void
}

const TILE = 256
const PREVIEW = 256

// Tag types
const BYTE = 1
const ASCII = 2
const SHORT = 3
const LONG = 4
const RATIONAL = 5
const SRATIONAL = 10
const FLOAT = 11

/** XYZ (D65) → linear sRGB, i.e. the ColorMatrix of a "camera" that sees sRGB. */
const XYZ_TO_SRGB = [3.2404542, -1.5371385, -0.4985314, -0.969266, 1.8760108, 0.041556, 0.0556434, -0.2040259, 1.0572252]

let linearLut: Uint16Array | undefined
function srgbToLinear16() {
  if (linearLut) return linearLut
  linearLut = new Uint16Array(256)
  for (let i = 0; i < 256; i++) {
    const c = i / 255
    const l = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    linearLut[i] = Math.round(l * 65535)
  }
  return linearLut
}

interface Entry {
  tag: number
  type: number
  count: number
  data: Uint8Array
}

const TYPE_SIZE: Record<number, number> = { [BYTE]: 1, [ASCII]: 1, [SHORT]: 2, [LONG]: 4, [RATIONAL]: 8, [SRATIONAL]: 8, [FLOAT]: 4 }

function entry(tag: number, type: number, values: number[] | string): Entry {
  if (typeof values === 'string') {
    const bytes = new TextEncoder().encode(values + '\0')
    return { tag, type, count: bytes.length, data: bytes }
  }
  const count = type === RATIONAL || type === SRATIONAL ? values.length / 2 : values.length
  const data = new Uint8Array(count * TYPE_SIZE[type])
  const view = new DataView(data.buffer)
  values.forEach((v, i) => {
    if (type === BYTE) view.setUint8(i, v)
    else if (type === SHORT) view.setUint16(i * 2, v, true)
    else if (type === LONG || type === RATIONAL) view.setUint32(i * 4, v, true)
    else if (type === SRATIONAL) view.setInt32(i * 4, v, true)
    else if (type === FLOAT) view.setFloat32(i * 4, v, true)
  })
  return { tag, type, count, data }
}

const rational = (v: number, den = 1_000_000) => [Math.round(v * den), den]

/** Bytes an IFD takes: count, entries, next-IFD pointer, then values over 4 bytes (word aligned). */
function ifdSize(entries: Entry[]) {
  let size = 2 + entries.length * 12 + 4
  for (const e of entries) if (e.data.length > 4) size += e.data.length + (e.data.length & 1)
  return size
}

function writeIfd(out: Uint8Array, offset: number, entries: Entry[]) {
  const view = new DataView(out.buffer, out.byteOffset)
  entries.sort((a, b) => a.tag - b.tag)
  view.setUint16(offset, entries.length, true)
  let extra = offset + 2 + entries.length * 12 + 4
  entries.forEach((e, i) => {
    const at = offset + 2 + i * 12
    view.setUint16(at, e.tag, true)
    view.setUint16(at + 2, e.type, true)
    view.setUint32(at + 4, e.count, true)
    if (e.data.length <= 4) out.set(e.data, at + 8)
    else {
      view.setUint32(at + 8, extra, true)
      out.set(e.data, extra)
      extra += e.data.length + (e.data.length & 1)
    }
  })
  view.setUint32(offset + 2 + entries.length * 12, 0, true)
}

function tiffDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}:${p(d.getMonth() + 1)}:${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** Encodes the picture as a DNG file. */
export function encodeDng({ rgba, width, height, date = new Date(), onProgress }: DngInput): Blob {
  // Small RGB preview for file browsers (nearest neighbour is fine at this size).
  const scale = Math.min(1, PREVIEW / Math.max(width, height))
  const pw = Math.max(1, Math.round(width * scale))
  const ph = Math.max(1, Math.round(height * scale))
  const preview = new Uint8Array(pw * ph * 3)
  for (let y = 0; y < ph; y++) {
    const sy = Math.min(height - 1, Math.floor((y + 0.5) / scale))
    for (let x = 0; x < pw; x++) {
      const sx = Math.min(width - 1, Math.floor((x + 0.5) / scale))
      const s = (sy * width + sx) * 4
      const d = (y * pw + x) * 3
      preview[d] = rgba[s]
      preview[d + 1] = rgba[s + 1]
      preview[d + 2] = rgba[s + 2]
    }
  }

  // Full image: linear 16-bit tiles. Edge tiles are padded by repeating the
  // last row/column (readers crop to ImageWidth/ImageLength).
  const lut = srgbToLinear16()
  const across = Math.ceil(width / TILE)
  const down = Math.ceil(height / TILE)
  const tiles: Uint8Array<ArrayBuffer>[] = []
  const samples = new Uint16Array(TILE * TILE * 3)
  for (let ty = 0; ty < down; ty++) {
    for (let tx = 0; tx < across; tx++) {
      for (let y = 0; y < TILE; y++) {
        const sy = Math.min(height - 1, ty * TILE + y)
        for (let x = 0; x < TILE; x++) {
          const sx = Math.min(width - 1, tx * TILE + x)
          const s = (sy * width + sx) * 4
          const d = (y * TILE + x) * 3
          samples[d] = lut[rgba[s]]
          samples[d + 1] = lut[rgba[s + 1]]
          samples[d + 2] = lut[rgba[s + 2]]
        }
      }
      tiles.push(encodeLosslessJpeg(samples, TILE, TILE, 3))
      onProgress?.(tiles.length / (across * down))
    }
  }

  const sub: Entry[] = [
    entry(254, LONG, [0]), // NewSubFileType: main image
    entry(256, LONG, [width]),
    entry(257, LONG, [height]),
    entry(258, SHORT, [16, 16, 16]),
    entry(259, SHORT, [7]), // lossless JPEG
    entry(262, SHORT, [34892]), // LinearRaw
    entry(277, SHORT, [3]),
    entry(284, SHORT, [1]),
    entry(322, LONG, [TILE]),
    entry(323, LONG, [TILE]),
    entry(324, LONG, new Array(tiles.length).fill(0)), // TileOffsets, filled below
    entry(325, LONG, tiles.map((t) => t.length)),
    entry(50714, LONG, [0, 0, 0]), // BlackLevel per sample
    entry(50717, LONG, [65535, 65535, 65535]), // WhiteLevel
    entry(50719, LONG, [0, 0]), // DefaultCropOrigin
    entry(50720, LONG, [width, height]), // DefaultCropSize
  ]
  const ifd0: Entry[] = [
    entry(254, LONG, [1]), // NewSubFileType: preview
    entry(256, LONG, [pw]),
    entry(257, LONG, [ph]),
    entry(258, SHORT, [8, 8, 8]),
    entry(259, SHORT, [1]),
    entry(262, SHORT, [2]), // RGB
    entry(271, ASCII, 'toowl'), // Make
    entry(272, ASCII, 'toowl'), // Model
    entry(273, LONG, [0]), // StripOffsets, filled below
    entry(274, SHORT, [1]), // Orientation (pixels are already upright)
    entry(277, SHORT, [3]),
    entry(278, LONG, [ph]),
    entry(279, LONG, [preview.length]),
    entry(284, SHORT, [1]),
    entry(305, ASCII, 'toowl.my.id'), // Software
    entry(306, ASCII, tiffDate(date)), // DateTime
    entry(330, LONG, [0]), // SubIFDs, filled below
    entry(50706, BYTE, [1, 4, 0, 0]), // DNGVersion
    entry(50707, BYTE, [1, 1, 0, 0]), // DNGBackwardVersion
    entry(50708, ASCII, 'toowl sRGB'), // UniqueCameraModel
    entry(50721, SRATIONAL, XYZ_TO_SRGB.flatMap((v) => rational(v))), // ColorMatrix1
    entry(50728, RATIONAL, [1, 1, 1, 1, 1, 1]), // AsShotNeutral
    entry(50730, SRATIONAL, [0, 1]), // BaselineExposure
    entry(50778, SHORT, [21]), // CalibrationIlluminant1: D65
    entry(50936, ASCII, 'toowl sRGB'), // ProfileName
    entry(50940, FLOAT, [0, 0, 1, 1]), // ProfileToneCurve: linear
    entry(50941, LONG, [1]), // ProfileEmbedPolicy: allow copying
  ]

  const ifd0Offset = 8
  const subOffset = ifd0Offset + ifdSize(ifd0)
  const previewOffset = subOffset + ifdSize(sub)
  let at = previewOffset + preview.length
  at += at & 1
  const tileOffsets = tiles.map((t) => {
    const o = at
    at += t.length + (t.length & 1)
    return o
  })
  const set = (list: Entry[], tag: number, values: number[]) => {
    const i = list.findIndex((e) => e.tag === tag)
    list[i] = entry(tag, LONG, values)
  }
  set(ifd0, 273, [previewOffset])
  set(ifd0, 330, [subOffset])
  set(sub, 324, tileOffsets)

  const head = new Uint8Array(previewOffset)
  head.set([0x49, 0x49, 42, 0, ifd0Offset, 0, 0, 0]) // "II", 42, IFD0 at 8
  writeIfd(head, ifd0Offset, ifd0)
  writeIfd(head, subOffset, sub)

  const pad = new Uint8Array(1)
  const parts: BlobPart[] = [head, preview]
  if ((previewOffset + preview.length) & 1) parts.push(pad)
  for (const t of tiles) {
    parts.push(t)
    if (t.length & 1) parts.push(pad)
  }
  return new Blob(parts, { type: 'image/x-adobe-dng' })
}
