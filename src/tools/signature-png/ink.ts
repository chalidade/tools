// Turns a signature photo or drawing into transparent ink, on RGBA pixel data.
// Pure functions (no DOM) so they can be checked from node.

export interface InkOptions {
  /** 0–255 luminance: darker than this is ink. */
  threshold: number
  /** Width of the soft edge between paper and ink, in luminance steps. */
  soft: number
  /** Drop ink specks smaller than this many pixels. */
  minSpeck: number
  /** Ink colour as [r, g, b]; null keeps the original colour. */
  color: [number, number, number] | null
  /** Use the pixels' own alpha (a drawing) instead of brightness (a photo). */
  fromAlpha: boolean
}

export const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

/** Drops connected groups of visible pixels smaller than `minSize` (8-neighbour). */
export function removeSpecks(data: Uint8ClampedArray, width: number, height: number, minSize: number) {
  if (minSize <= 1) return 0
  const seen = new Uint8Array(width * height)
  const stack: number[] = []
  let removed = 0
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] === 0) continue
    const group: number[] = []
    stack.push(start)
    seen[start] = 1
    while (stack.length) {
      const p = stack.pop()!
      group.push(p)
      const x = p % width
      const y = (p - x) / width
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const q = ny * width + nx
          if (seen[q] || data[q * 4 + 3] === 0) continue
          seen[q] = 1
          stack.push(q)
        }
      }
    }
    if (group.length < minSize) {
      for (const p of group) data[p * 4 + 3] = 0
      removed += group.length
    }
  }
  return removed
}

/** Rewrites `data` in place so that only the ink is left, as `color` or its own colour. */
export function extractInk(data: Uint8ClampedArray, width: number, height: number, o: InkOptions) {
  const lo = o.threshold - o.soft / 2
  const span = Math.max(1, o.soft)
  for (let i = 0; i < data.length; i += 4) {
    let a: number
    if (o.fromAlpha) a = data[i + 3] / 255
    else {
      const keep = Math.min(1, Math.max(0, (lo + span - luminance(data[i], data[i + 1], data[i + 2])) / span))
      a = keep * (data[i + 3] / 255)
    }
    if (o.color) {
      data[i] = o.color[0]
      data[i + 1] = o.color[1]
      data[i + 2] = o.color[2]
    }
    data[i + 3] = Math.round(a * 255)
  }
  removeSpecks(data, width, height, o.minSpeck)
}

/** Bounding box of visible pixels, or null when the image is empty. */
export function inkBounds(data: Uint8ClampedArray, width: number, height: number) {
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  return right < 0 ? null : { left, top, right, bottom }
}
