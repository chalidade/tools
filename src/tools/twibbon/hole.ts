import type { Hole } from './templates'

/**
 * Finds the transparent window of a frame PNG, so the photo can start out
 * filling it. Works on a small copy: transparent pixels are grouped into
 * connected regions and the largest one that does not touch the edge wins
 * (a round frame is often transparent in its corners too). Returns null when
 * the frame has no transparent area at all.
 */
export function findHole(source: CanvasImageSource, width: number, height: number): Hole | null {
  const k = Math.min(1, 256 / Math.max(width, height))
  const w = Math.max(1, Math.round(width * k))
  const h = Math.max(1, Math.round(height * k))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(source, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data
  const clear = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) clear[i] = data[i * 4 + 3] < 128 ? 1 : 0

  const seen = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  let best: { n: number; edge: boolean; x0: number; y0: number; x1: number; y1: number } | null = null
  for (let start = 0; start < w * h; start++) {
    if (!clear[start] || seen[start]) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    seen[start] = 1
    let n = 0
    let edge = false
    let x0 = w
    let y0 = h
    let x1 = 0
    let y1 = 0
    while (head < tail) {
      const p = queue[head++]
      const x = p % w
      const y = (p - x) / w
      n++
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      const next = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]
      for (const q of next)
        if (q >= 0 && clear[q] && !seen[q]) {
          seen[q] = 1
          queue[tail++] = q
        }
    }
    // An inner window beats one touching the edge; among equals, the bigger one.
    const better = !best || (best.edge && !edge && n > (w * h) / 100) || (best.edge === edge && n > best.n)
    if (better) best = { n, edge, x0, y0, x1, y1 }
  }
  if (!best) return null
  return { x: best.x0 / k, y: best.y0 / k, w: (best.x1 - best.x0 + 1) / k, h: (best.y1 - best.y0 + 1) / k }
}
