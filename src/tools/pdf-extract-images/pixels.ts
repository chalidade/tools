// Pure pixel helpers for pulling images out of a PDF: undo PNG predictors and
// turn raw samples (gray / RGB / CMYK / indexed, 1-16 bits) into RGBA.

/** Undoes the PNG predictors (Predictor 10-15) of a Flate stream. */
export function unpredictPng(data: Uint8Array, colors: number, bpc: number, columns: number): Uint8Array {
  const rowBytes = Math.ceil((colors * bpc * columns) / 8)
  const bpp = Math.max(1, Math.ceil((colors * bpc) / 8))
  const rows = Math.floor(data.length / (rowBytes + 1))
  const out = new Uint8Array(rows * rowBytes)
  for (let y = 0; y < rows; y++) {
    const type = data[y * (rowBytes + 1)]
    const src = y * (rowBytes + 1) + 1
    const dst = y * rowBytes
    for (let x = 0; x < rowBytes; x++) {
      const raw = data[src + x]
      const a = x >= bpp ? out[dst + x - bpp] : 0
      const b = y > 0 ? out[dst - rowBytes + x] : 0
      const c = x >= bpp && y > 0 ? out[dst - rowBytes + x - bpp] : 0
      let v = raw
      if (type === 1) v = raw + a
      else if (type === 2) v = raw + b
      else if (type === 3) v = raw + ((a + b) >> 1)
      else if (type === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
      }
      out[dst + x] = v & 255
    }
  }
  return out
}

export interface PixelSpec {
  width: number
  height: number
  bpc: number
  /** Colour components per pixel: 1 gray, 3 RGB, 4 CMYK. */
  comps: number
  /** Indexed images: palette of `base` components per entry (already in base space). */
  palette?: { base: number; table: Uint8Array }
  /** Decode array was [1 0 …]: samples are inverted. */
  invert?: boolean
}

/** Reads sample `i` (0-based, along the row) of row `y`, scaled to 0-255 (or the raw index for palettes). */
function sample(data: Uint8Array, rowBytes: number, y: number, i: number, bpc: number, raw: boolean) {
  if (bpc === 8) return data[y * rowBytes + i] ?? 0
  if (bpc === 16) return data[y * rowBytes + i * 2] ?? 0
  const bitPos = i * bpc
  const byte = data[y * rowBytes + (bitPos >> 3)] ?? 0
  const v = (byte >> (8 - bpc - (bitPos & 7))) & ((1 << bpc) - 1)
  return raw ? v : Math.round((v * 255) / ((1 << bpc) - 1))
}

/** Raw samples → RGBA (alpha 255). Returns null when the data is too short to be this image. */
export function toRgba(data: Uint8Array, spec: PixelSpec): Uint8ClampedArray | null {
  const { width, height, bpc, comps, palette, invert } = spec
  const n = palette ? 1 : comps
  const rowBytes = Math.ceil((n * bpc * width) / 8)
  if (data.length < rowBytes * height * 0.9 || width * height > 120_000_000) return null
  const out = new Uint8ClampedArray(width * height * 4)
  let o = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0
      let g = 0
      let b = 0
      if (palette) {
        const idx = sample(data, rowBytes, y, x, bpc, true)
        const t = palette.table
        const k = idx * palette.base
        if (palette.base === 1) r = g = b = t[k] ?? 0
        else if (palette.base === 3) [r, g, b] = [t[k] ?? 0, t[k + 1] ?? 0, t[k + 2] ?? 0]
        else [r, g, b] = cmyk(t[k] ?? 0, t[k + 1] ?? 0, t[k + 2] ?? 0, t[k + 3] ?? 0)
      } else if (comps === 1) {
        r = g = b = sample(data, rowBytes, y, x, bpc, false)
        if (invert) r = g = b = 255 - r
      } else if (comps === 3) {
        r = sample(data, rowBytes, y, x * 3, bpc, false)
        g = sample(data, rowBytes, y, x * 3 + 1, bpc, false)
        b = sample(data, rowBytes, y, x * 3 + 2, bpc, false)
        if (invert) [r, g, b] = [255 - r, 255 - g, 255 - b]
      } else {
        let c = sample(data, rowBytes, y, x * 4, bpc, false)
        let m = sample(data, rowBytes, y, x * 4 + 1, bpc, false)
        let yy = sample(data, rowBytes, y, x * 4 + 2, bpc, false)
        let k = sample(data, rowBytes, y, x * 4 + 3, bpc, false)
        if (invert) [c, m, yy, k] = [255 - c, 255 - m, 255 - yy, 255 - k]
        ;[r, g, b] = cmyk(c, m, yy, k)
      }
      out[o++] = r
      out[o++] = g
      out[o++] = b
      out[o++] = 255
    }
  }
  return out
}

export function cmyk(c: number, m: number, y: number, k: number): [number, number, number] {
  const kk = 1 - k / 255
  return [Math.round((255 - c) * kk), Math.round((255 - m) * kk), Math.round((255 - y) * kk)]
}

/** Writes a soft mask (8-bit gray, any size) into the alpha channel, nearest-neighbour when sizes differ. */
export function applyAlpha(rgba: Uint8ClampedArray, width: number, height: number, mask: Uint8ClampedArray, mw: number, mh: number) {
  for (let y = 0; y < height; y++) {
    const my = Math.min(mh - 1, Math.floor((y * mh) / height))
    for (let x = 0; x < width; x++) {
      const mx = Math.min(mw - 1, Math.floor((x * mw) / width))
      rgba[(y * width + x) * 4 + 3] = mask[(my * mw + mx) * 4]
    }
  }
}
