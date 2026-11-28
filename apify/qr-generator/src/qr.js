// QR code drawing, ported from the site's src/tools/qr/render.ts so the
// Actor's codes look exactly like toowl.my.id's: one list of shapes → SVG,
// rasterised to PNG with sharp. The symbol itself comes from node-qrcode.
import QRCode from 'qrcode'
import sharp from 'sharp'

/** Logo box width as a share of the symbol; small enough for level H (30% recovery) to read through. */
const LOGO_SHARE = 0.22
const FINDER = 7

/** With a logo, tiny symbols lose too many modules to read: use at least this version. */
const MIN_VERSION_WITH_LOGO = 5

export function qrMatrix(text, level, withLogo = false) {
  let { modules, version } = QRCode.create(text, { errorCorrectionLevel: level })
  if (withLogo && version < MIN_VERSION_WITH_LOGO) {
    ;({ modules, version } = QRCode.create(text, { errorCorrectionLevel: level, version: MIN_VERSION_WITH_LOGO }))
  }
  return { size: modules.size, version, dark: (r, c) => !!modules.get(r, c) }
}

function inFinder(size, r, c) {
  const near = (v, at) => v >= at && v < at + FINDER
  return (near(r, 0) && near(c, 0)) || (near(r, 0) && near(c, size - FINDER)) || (near(r, size - FINDER) && near(c, 0))
}

function logoBox(m, opts) {
  if (!opts.logo) return null
  let n = Math.round(m.size * LOGO_SHARE)
  if (n % 2 !== m.size % 2) n++
  const at = (m.size - n) / 2
  return { x: at, y: at, size: n }
}

function shapes(m, opts) {
  const out = []
  const logo = logoBox(m, opts)
  const covered = (r, c) =>
    !!logo && r >= logo.y - 0.5 && r < logo.y + logo.size + 0.5 && c >= logo.x - 0.5 && c < logo.x + logo.size + 0.5
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (!m.dark(r, c) || inFinder(m.size, r, c) || covered(r, c)) continue
      if (opts.style === 'dots') out.push({ kind: 'circle', cx: c + 0.5, cy: r + 0.5, r: 0.5 })
      else if (opts.style === 'rounded') out.push({ kind: 'rect', x: c + 0.06, y: r + 0.06, w: 0.88, h: 0.88, r: 0.32 })
      else {
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

function roundedPath(x, y, w, h, r) {
  if (!r) return `M${x} ${y}h${w}v${h}h${-w}z`
  return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
}

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** opts: { fg, bg (null = transparent), margin, style, logo (data URL or null) } */
export function toSvg(m, opts) {
  const total = m.size + opts.margin * 2
  const o = opts.margin
  const d = []
  const circles = []
  for (const s of shapes(m, opts)) {
    if (s.kind === 'rect') d.push(roundedPath(s.x + o, s.y + o, s.w, s.h, s.r))
    else if (s.kind === 'circle') circles.push(`<circle cx="${s.cx + o}" cy="${s.cy + o}" r="${s.r}"/>`)
    else d.push(roundedPath(s.x + o, s.y + o, FINDER, FINDER, s.r) + roundedPath(s.x + o + 1, s.y + o + 1, 5, 5, s.r * 0.6))
  }
  const logo = logoBox(m, opts)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total * 10}" height="${total * 10}" shape-rendering="${opts.style === 'square' ? 'crispEdges' : 'geometricPrecision'}">`,
    opts.bg ? `<rect width="${total}" height="${total}" fill="${attr(opts.bg)}"/>` : '',
    `<g fill="${attr(opts.fg)}"><path fill-rule="evenodd" d="${d.join('')}"/>${circles.join('')}</g>`,
    logo && opts.logo
      ? `<rect x="${logo.x + o - 0.5}" y="${logo.y + o - 0.5}" width="${logo.size + 1}" height="${logo.size + 1}" rx="1.2" fill="${attr(opts.bg ?? '#ffffff')}"/>` +
        `<image href="${attr(opts.logo)}" x="${logo.x + o}" y="${logo.y + o}" width="${logo.size}" height="${logo.size}" preserveAspectRatio="xMidYMid meet"/>`
      : '',
    '</svg>',
  ].join('')
}

/** Rasterises at the target size directly, so curves stay smooth and edges crisp. */
export async function toPng(svg, px) {
  const sized = svg.replace(/ width="\d+" height="\d+"/, ` width="${px}" height="${px}"`)
  return sharp(Buffer.from(sized)).resize(px, px).png({ compressionLevel: 9 }).toBuffer()
}

/** Any image (PNG, JPG, WebP, SVG…) → a PNG data URL small enough to embed. */
export async function logoDataUrl(bytes) {
  const png = await sharp(bytes, { density: 300 }).resize(512, 512, { fit: 'inside', withoutEnlargement: false }).png().toBuffer()
  return `data:image/png;base64,${png.toString('base64')}`
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
export function color(value, fallback, label) {
  const v = (value ?? '').trim() || fallback
  if (!HEX.test(v)) throw new Error(`${label} must be a hex colour like #000000, got "${value}".`)
  return v
}
