// Collage geometry: where each photo goes on the canvas. Pure functions, no DOM.

export type LayoutId = 'grid' | 'strip-v' | 'strip-h' | 'big'
export type Rect = { x: number; y: number; w: number; h: number }

/** Photo counts per row for a grid: as square as possible, the last row may be shorter. */
export function gridRows(n: number): number[] {
  const cols = Math.ceil(Math.sqrt(n))
  const rows: number[] = []
  for (let left = n; left > 0; left -= cols) rows.push(Math.min(cols, left))
  return rows
}

/** Splits `total` px into `count` equal parts separated by `gap`. */
function split(start: number, total: number, count: number, gap: number) {
  const size = (total - gap * (count - 1)) / count
  return Array.from({ length: count }, (_, i) => ({ pos: start + i * (size + gap), size }))
}

function rowsToRects(rows: number[], x: number, y: number, w: number, h: number, gap: number): Rect[] {
  const out: Rect[] = []
  split(y, h, rows.length, gap).forEach((row, r) => {
    split(x, w, rows[r], gap).forEach((col) => out.push({ x: col.pos, y: row.pos, w: col.size, h: row.size }))
  })
  return out
}

/** One rect per photo, inside a W×H canvas, `gap` px apart and from the edge. */
export function computeRects(layout: LayoutId, n: number, W: number, H: number, gap: number): Rect[] {
  if (n <= 0) return []
  const x = gap
  const y = gap
  const w = W - gap * 2
  const h = H - gap * 2
  if (n === 1) return [{ x, y, w, h }]
  if (layout === 'strip-v') return rowsToRects(Array(n).fill(1), x, y, w, h, gap)
  if (layout === 'strip-h') return rowsToRects([n], x, y, w, h, gap)
  if (layout === 'big') {
    const side = Math.round((W >= H ? w : h) * 0.62)
    if (W >= H) {
      const rest = rowsToRects(Array(n - 1).fill(1), x + side + gap, y, w - side - gap, h, gap)
      return [{ x, y, w: side, h }, ...rest]
    }
    const rest = rowsToRects([n - 1], x, y + side + gap, w, h - side - gap, gap)
    return [{ x, y, w, h: side }, ...rest]
  }
  return rowsToRects(gridRows(n), x, y, w, h, gap)
}

export const RATIOS = {
  '1:1': [1080, 1080],
  '4:5': [1080, 1350],
  '9:16': [1080, 1920],
} as const
export type RatioId = keyof typeof RATIOS

/** Source rect that fills a w×h cell without distortion (centre crop). */
export function coverCrop(srcW: number, srcH: number, w: number, h: number) {
  const scale = Math.max(w / srcW, h / srcH)
  const cw = w / scale
  const ch = h / scale
  return { sx: (srcW - cw) / 2, sy: (srcH - ch) / 2, sw: cw, sh: ch }
}
