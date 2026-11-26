// Where watermark marks go on a photo. Pure geometry: no DOM.

export type Position = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br' | 'tile'

export const POSITIONS: Position[] = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br']

export interface Placement {
  /** Centre of the mark. */
  x: number
  y: number
  /** Rotation in radians. */
  angle: number
}

export interface LayoutOpts {
  position: Position
  /** Space around a single mark, % of the shorter side. */
  margin: number
  /** Gap between tiles, % of the mark's own size. */
  spacing: number
  /** Rotation of the repeated pattern, degrees. */
  angle: number
}

/** Centres for a mark of size mw × mh on a W × H photo. */
export function placeMarks(W: number, H: number, mw: number, mh: number, o: LayoutOpts): Placement[] {
  if (o.position !== 'tile') {
    const m = (Math.min(W, H) * o.margin) / 100
    const col = o.position[1] === undefined ? 'c' : o.position[1]
    const row = o.position[0]
    const x = col === 'l' ? m + mw / 2 : col === 'r' ? W - m - mw / 2 : W / 2
    const y = row === 't' ? m + mh / 2 : row === 'b' ? H - m - mh / 2 : H / 2
    return [{ x, y, angle: 0 }]
  }
  const rad = (o.angle * Math.PI) / 180
  const gapX = (mw * o.spacing) / 100
  const gapY = (mh * o.spacing) / 100
  const stepX = mw + gapX
  const stepY = mh + gapY
  const half = Math.hypot(W, H) / 2 + Math.max(mw, mh)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const out: Placement[] = []
  const rows = Math.ceil(half / stepY)
  const cols = Math.ceil(half / stepX)
  const reach = Math.hypot(mw, mh) / 2
  for (let r = -rows; r <= rows; r++) {
    for (let c = -cols; c <= cols; c++) {
      // Every other row shifts half a step so the pattern is not a plain grid.
      const lx = c * stepX + (Math.abs(r) % 2 ? stepX / 2 : 0)
      const ly = r * stepY
      const x = W / 2 + lx * cos - ly * sin
      const y = H / 2 + lx * sin + ly * cos
      if (x > -reach && x < W + reach && y > -reach && y < H + reach) out.push({ x, y, angle: rad })
    }
  }
  return out
}

/** Size to fit `max` on the longer side, never enlarging; 0 keeps the original. */
export function fitSize(w: number, h: number, max: number) {
  if (!max || Math.max(w, h) <= max) return { w, h }
  const k = max / Math.max(w, h)
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}
