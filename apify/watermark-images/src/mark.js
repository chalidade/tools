// Draws a text or logo watermark over a photo with sharp: the mark is made
// once as a trimmed PNG, then placed (and rotated, for the tiled pattern)
// through one SVG overlay the size of the photo.
import sharp from 'sharp'
import { placeMarks } from './layout.js'

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** A text mark: bold, filled, with a soft contrasting outline (like the site). */
export async function textMark(text, color) {
  const fill = color === 'black' ? '#000' : color === 'white' ? '#fff' : color
  const dark = color === 'black' || /^#(0|1|2|3)/i.test(fill)
  const stroke = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
  const size = 200
  const w = Math.ceil(size * 0.75 * [...text].length + 4 * size)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size * 2}">
<text x="${w / 2}" y="${size * 1.3}" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Noto Sans, Noto Sans CJK SC, sans-serif" font-weight="700" font-size="${size}"
 fill="${esc(fill)}" stroke="${stroke}" stroke-width="14" stroke-linejoin="round" paint-order="stroke">${esc(text)}</text></svg>`
  const { data, info } = await sharp(Buffer.from(svg)).trim({ threshold: 0 }).png().toBuffer({ resolveWithObject: true })
  return { png: data, width: info.width, height: info.height }
}

export async function logoMark(bytes) {
  const { data, info } = await sharp(bytes, { failOn: 'none' }).rotate().ensureAlpha().png().toBuffer({ resolveWithObject: true })
  return { png: data, width: info.width, height: info.height }
}

/**
 * @param {Buffer} bytes  the photo
 * @param {{ png: Buffer, width: number, height: number }} mark
 * @param {object} o  position, margin, spacing, angle, size (% of width), opacity (0–100),
 *                    maxSide, format ('auto' | 'jpg' | 'png' | 'webp'), quality, keepMetadata
 */
export async function watermark(bytes, mark, o) {
  let img = sharp(bytes, { failOn: 'none', limitInputPixels: 268_402_689 }).rotate()
  const meta = await img.metadata()
  if (!meta.width || !meta.height) throw new Error('Not an image this Actor can read.')
  // Upright size after EXIF rotation.
  let W = meta.orientation >= 5 ? meta.height : meta.width
  let H = meta.orientation >= 5 ? meta.width : meta.height
  if (o.maxSide && Math.max(W, H) > o.maxSide) {
    const k = o.maxSide / Math.max(W, H)
    W = Math.max(1, Math.round(W * k))
    H = Math.max(1, Math.round(H * k))
    img = img.resize(W, H)
  }
  const base = await img.toBuffer() // flatten EXIF rotation + resize before compositing

  const mw = Math.max(8, (W * o.size) / 100)
  const mh = (mw * mark.height) / mark.width
  const marks = placeMarks(W, H, mw, mh, o)
  const href = `data:image/png;base64,${mark.png.toString('base64')}`
  const uses = marks
    .map((m) => `<use href="#m" transform="translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) rotate(${((m.angle * 180) / Math.PI).toFixed(2)})"/>`)
    .join('')
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
<defs><image id="m" x="${(-mw / 2).toFixed(1)}" y="${(-mh / 2).toFixed(1)}" width="${mw.toFixed(1)}" height="${mh.toFixed(1)}" preserveAspectRatio="none" href="${href}" xlink:href="${href}"/></defs>
<g opacity="${Math.min(1, Math.max(0, o.opacity / 100))}">${uses}</g></svg>`

  const fmt = o.format === 'auto' ? (meta.format === 'png' ? 'png' : meta.format === 'webp' ? 'webp' : 'jpg') : o.format
  let out = sharp(base).composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
  if (o.keepMetadata) out = out.withMetadata()
  if (fmt === 'png') out = out.png({ compressionLevel: 9 })
  else if (fmt === 'webp') out = out.webp({ quality: o.quality })
  else out = out.flatten({ background: '#ffffff' }).jpeg({ quality: o.quality, mozjpeg: true })
  return { data: await out.toBuffer(), width: W, height: H, format: fmt, marks: marks.length }
}
