// Pixel work for the censor tool. Coordinates are in image pixels unless noted.

export type Region =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'brush'; size: number; points: { x: number; y: number }[] }

export type Mode = 'black' | 'pixel' | 'blur'

/** Normalises a drag between two corners into a positive-size rect. */
export function rectFrom(a: { x: number; y: number }, b: { x: number; y: number }): Region {
  return { kind: 'rect', x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
}

/** Block size for the pixelate effect, from the 1–10 strength slider. */
export const pixelBlock = (width: number, level: number) => Math.max(4, Math.round((width * level) / 120))

/** Blur radius for the blur effect, from the 1–10 strength slider. */
export const blurRadius = (width: number, level: number) => Math.max(2, Math.round((width * level) / 200))

/** One in-place horizontal box blur pass over RGBA data (edges clamp). */
function boxH(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number) {
  const n = 2 * r + 1
  for (let y = 0; y < h; y++) {
    const row = y * w * 4
    for (let c = 0; c < 4; c++) {
      let sum = 0
      for (let k = -r; k <= r; k++) sum += src[row + Math.min(w - 1, Math.max(0, k)) * 4 + c]
      for (let x = 0; x < w; x++) {
        dst[row + x * 4 + c] = sum / n
        sum += src[row + Math.min(w - 1, x + r + 1) * 4 + c] - src[row + Math.max(0, x - r) * 4 + c]
      }
    }
  }
}

function boxV(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number) {
  const n = 2 * r + 1
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0
      for (let k = -r; k <= r; k++) sum += src[Math.min(h - 1, Math.max(0, k)) * w * 4 + x * 4 + c]
      for (let y = 0; y < h; y++) {
        dst[y * w * 4 + x * 4 + c] = sum / n
        sum += src[Math.min(h - 1, y + r + 1) * w * 4 + x * 4 + c] - src[Math.max(0, y - r) * w * 4 + x * 4 + c]
      }
    }
  }
}

/** Approximate Gaussian blur: three box blur passes in each direction. Returns a new array. */
export function blurRGBA(data: Uint8ClampedArray, w: number, h: number, radius: number) {
  let a: Uint8ClampedArray = new Uint8ClampedArray(data)
  let b: Uint8ClampedArray = new Uint8ClampedArray(data.length)
  for (let pass = 0; pass < 3; pass++) {
    boxH(a, b, w, h, radius)
    boxV(b, a, w, h, radius)
  }
  return a
}

/** Averages each block×block cell into one flat colour. Returns a new array. */
export function pixelateRGBA(data: Uint8ClampedArray, w: number, h: number, block: number) {
  const out = new Uint8ClampedArray(data.length)
  for (let by = 0; by < h; by += block) {
    for (let bx = 0; bx < w; bx += block) {
      const ex = Math.min(w, bx + block)
      const ey = Math.min(h, by + block)
      let r = 0, g = 0, b = 0, a = 0
      for (let y = by; y < ey; y++)
        for (let x = bx; x < ex; x++) {
          const i = (y * w + x) * 4
          r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3]
        }
      const n = (ex - bx) * (ey - by)
      for (let y = by; y < ey; y++)
        for (let x = bx; x < ex; x++) {
          const i = (y * w + x) * 4
          out[i] = r / n; out[i + 1] = g / n; out[i + 2] = b / n; out[i + 3] = a / n
        }
    }
  }
  return out
}
