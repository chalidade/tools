// Draws a QR code as SVG or onto a canvas from one list of shapes, so both
// downloads look exactly alike. The symbol itself comes from node-qrcode.

export type ErrorLevel = 'L' | 'M' | 'Q' | 'H'
export type ModuleStyle = 'square' | 'rounded' | 'dots'

export interface QrMatrix {
  size: number
  dark: (row: number, col: number) => boolean
}

export interface RenderOptions {
  fg: string
  /** null = transparent. */
  bg: string | null
  /** Quiet zone in modules (4 is the standard). */
  margin: number
  style: ModuleStyle
  /** Logo as a data/object URL, drawn in the middle. */
  logo: string | null
}

/** Logo box width as a share of the symbol; small enough for level H (30% recovery) to read through. */
export const LOGO_SHARE = 0.22

export async function qrMatrix(text: string, level: ErrorLevel): Promise<QrMatrix> {
  const QRCode = await import('qrcode')
  const { modules } = QRCode.create(text, { errorCorrectionLevel: level })
  return { size: modules.size, dark: (r, c) => !!modules.get(r, c) }
}

type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  /** A 7×7 finder outline: outer square minus the 5×5 inside. */
  | { kind: 'ring'; x: number; y: number; r: number }

const FINDER = 7

function inFinder(size: number, r: number, c: number) {
  const near = (v: number, at: number) => v >= at && v < at + FINDER
  return (near(r, 0) && near(c, 0)) || (near(r, 0) && near(c, size - FINDER)) || (near(r, size - FINDER) && near(c, 0))
}

/** The logo's box in module units, or null without a logo. */
function logoBox(m: QrMatrix, opts: RenderOptions) {
  if (!opts.logo) return null
  // Same parity as the symbol size, so the box starts on a whole module.
  let n = Math.round(m.size * LOGO_SHARE)
  if (n % 2 !== m.size % 2) n++
  const at = (m.size - n) / 2
  return { x: at, y: at, size: n }
}

function shapes(m: QrMatrix, opts: RenderOptions): Shape[] {
  const out: Shape[] = []
  const logo = logoBox(m, opts)
  const covered = (r: number, c: number) =>
    !!logo && r >= logo.y - 0.5 && r < logo.y + logo.size + 0.5 && c >= logo.x - 0.5 && c < logo.x + logo.size + 0.5

  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (!m.dark(r, c) || inFinder(m.size, r, c) || covered(r, c)) continue
      // Dots touch their neighbours (r = 0.5): smaller gaps confuse simpler scanners.
      if (opts.style === 'dots') out.push({ kind: 'circle', cx: c + 0.5, cy: r + 0.5, r: 0.5 })
      else if (opts.style === 'rounded') out.push({ kind: 'rect', x: c + 0.06, y: r + 0.06, w: 0.88, h: 0.88, r: 0.32 })
      else {
        // Merge a horizontal run into one rectangle: fewer shapes, no hairline seams.
        let end = c
        while (end + 1 < m.size && m.dark(r, end + 1) && !inFinder(m.size, r, end + 1) && !covered(r, end + 1)) end++
        out.push({ kind: 'rect', x: c, y: r, w: end - c + 1, h: 1, r: 0 })
        c = end
      }
    }
  }
  const soft = opts.style !== 'square'
  for (const [x, y] of [
    [0, 0],
    [m.size - FINDER, 0],
    [0, m.size - FINDER],
  ]) {
    out.push({ kind: 'ring', x, y, r: soft ? 1.6 : 0 })
    out.push({ kind: 'rect', x: x + 2, y: y + 2, w: 3, h: 3, r: soft ? 0.9 : 0 })
  }
  return out
}

function roundedPath(x: number, y: number, w: number, h: number, r: number) {
  if (!r) return `M${x} ${y}h${w}v${h}h${-w}z`
  return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
}

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export function toSvg(m: QrMatrix, opts: RenderOptions) {
  const total = m.size + opts.margin * 2
  const o = opts.margin
  const d: string[] = []
  const circles: string[] = []
  for (const s of shapes(m, opts)) {
    if (s.kind === 'rect') d.push(roundedPath(s.x + o, s.y + o, s.w, s.h, s.r))
    else if (s.kind === 'circle') circles.push(`<circle cx="${s.cx + o}" cy="${s.cy + o}" r="${s.r}"/>`)
    else d.push(roundedPath(s.x + o, s.y + o, FINDER, FINDER, s.r) + roundedPath(s.x + o + 1, s.y + o + 1, 5, 5, s.r * 0.6))
  }
  const logo = logoBox(m, opts)
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="${opts.style === 'square' ? 'crispEdges' : 'geometricPrecision'}">`,
    opts.bg ? `<rect width="${total}" height="${total}" fill="${attr(opts.bg)}"/>` : '',
    `<g fill="${attr(opts.fg)}"><path fill-rule="evenodd" d="${d.join('')}"/>${circles.join('')}</g>`,
    logo && opts.logo
      ? `<rect x="${logo.x + o - 0.5}" y="${logo.y + o - 0.5}" width="${logo.size + 1}" height="${logo.size + 1}" rx="1.2" fill="${attr(opts.bg ?? '#ffffff')}"/>` +
        `<image href="${attr(opts.logo)}" x="${logo.x + o}" y="${logo.y + o}" width="${logo.size}" height="${logo.size}" preserveAspectRatio="xMidYMid meet"/>`
      : '',
    '</svg>',
  ]
  return parts.join('')
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function toCanvas(m: QrMatrix, opts: RenderOptions, px: number) {
  const total = m.size + opts.margin * 2
  const scale = px / total
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = px
  const ctx = canvas.getContext('2d')!
  if (opts.bg) {
    ctx.fillStyle = opts.bg
    ctx.fillRect(0, 0, px, px)
  }
  ctx.save()
  ctx.scale(scale, scale)
  ctx.translate(opts.margin, opts.margin)
  ctx.fillStyle = opts.fg
  const path = new Path2D()
  for (const s of shapes(m, opts)) {
    if (s.kind === 'rect') path.roundRect(s.x, s.y, s.w, s.h, s.r)
    else if (s.kind === 'circle') {
      path.moveTo(s.cx + s.r, s.cy)
      path.arc(s.cx, s.cy, s.r, 0, Math.PI * 2)
    } else {
      path.roundRect(s.x, s.y, FINDER, FINDER, s.r)
      path.roundRect(s.x + 1, s.y + 1, 5, 5, s.r * 0.6)
    }
  }
  ctx.fill(path, 'evenodd')
  const logo = logoBox(m, opts)
  if (logo && opts.logo) {
    ctx.fillStyle = opts.bg ?? '#ffffff'
    ctx.beginPath()
    ctx.roundRect(logo.x - 0.5, logo.y - 0.5, logo.size + 1, logo.size + 1, 1.2)
    ctx.fill()
    const img = await loadImage(opts.logo)
    // Fit inside the box, keeping its aspect ratio.
    const k = Math.min(logo.size / img.width, logo.size / img.height)
    const w = img.width * k
    const h = img.height * k
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, logo.x + (logo.size - w) / 2, logo.y + (logo.size - h) / 2, w, h)
  }
  ctx.restore()
  return canvas
}
