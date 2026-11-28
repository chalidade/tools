// Where watermark marks go on a photo. Port of the site's
// src/tools/watermark-foto/layout.ts (pure geometry).

export const POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br', 'tile']

/** Centres (and rotation, radians) for a mark of size mw × mh on a W × H photo. */
export function placeMarks(W, H, mw, mh, o) {
  if (o.position !== 'tile') {
    const m = (Math.min(W, H) * o.margin) / 100
    const col = o.position[1]
    const row = o.position[0]
    const x = col === 'l' ? m + mw / 2 : col === 'r' ? W - m - mw / 2 : W / 2
    const y = row === 't' ? m + mh / 2 : row === 'b' ? H - m - mh / 2 : H / 2
    return [{ x, y, angle: 0 }]
  }
  const rad = (o.angle * Math.PI) / 180
  const stepX = mw + (mw * o.spacing) / 100
  const stepY = mh + (mh * o.spacing) / 100
  const half = Math.hypot(W, H) / 2 + Math.max(mw, mh)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const out = []
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
