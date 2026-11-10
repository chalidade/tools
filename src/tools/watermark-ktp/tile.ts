// Layout and wording for the repeated diagonal watermark. Pure functions.

/** "Hanya untuk <tujuan> · 10 November 2026" — the date is optional. */
export function watermarkText(purpose: string, date: string | null, prefix: string) {
  const p = purpose.trim()
  const head = p ? `${prefix} ${p}` : prefix
  return date ? `${head} · ${date}` : head
}

/**
 * Centres of text tiles that cover a w×h image once the whole tile grid is
 * rotated by `angle` (radians) around the image centre. The grid is laid out
 * in the rotated frame, covering the image's bounding circle; odd rows are
 * shifted half a step so the pattern does not look like columns.
 */
export function tileCenters(w: number, h: number, tileW: number, tileH: number, gapX: number, gapY: number) {
  const stepX = Math.max(1, tileW + gapX)
  const stepY = Math.max(1, tileH + gapY)
  const r = Math.hypot(w, h) / 2 + stepX
  const rows = Math.ceil(r / stepY)
  const cols = Math.ceil(r / stepX)
  const out: { x: number; y: number }[] = []
  for (let j = -rows; j <= rows; j++) {
    const shift = (((j % 2) + 2) % 2) * (stepX / 2)
    for (let i = -cols; i <= cols; i++) out.push({ x: i * stepX + shift, y: j * stepY })
  }
  return out
}
