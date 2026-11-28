// Images → PDF pages with sharp (decode, EXIF rotation, resize) and pdf-lib.
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'

// Paper sizes in PDF points (1/72 in).
export const PAPER = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008], a5: [419.53, 595.28] }
const MM = 72 / 25.4

/**
 * Prepares one image for a PDF page: EXIF rotation applied, longest side capped
 * at `maxPx`, re-encoded as JPEG (or PNG when it has transparency and
 * `keepTransparency`), so pdf-lib can embed it.
 */
export async function prepareImage(bytes, { maxPx, quality, keepTransparency, grayscale }) {
  let img = sharp(bytes, { failOn: 'none', animated: false, limitInputPixels: 268_402_689 }).rotate()
  const meta = await img.metadata()
  if (!meta.width || !meta.height) throw new Error('Not an image this Actor can read (JPG, PNG, WebP, AVIF, TIFF, GIF, SVG).')
  if (Math.max(meta.width, meta.height) > maxPx) img = img.resize({ width: maxPx, height: maxPx, fit: 'inside' })
  if (grayscale) img = img.grayscale()
  const alpha = keepTransparency && meta.hasAlpha
  const { data, info } = alpha
    ? await img.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
    : await img.flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true }).toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height, png: alpha }
}

/** One page per prepared image. */
export async function buildPdf(images, o) {
  const doc = await PDFDocument.create()
  doc.setProducer('toowl image-to-pdf')
  doc.setCreator('toowl.my.id')
  if (o.title) doc.setTitle(o.title)
  const margin = o.marginMm * MM
  for (const im of images) {
    const embedded = im.png ? await doc.embedPng(im.data) : await doc.embedJpg(im.data)
    const landscape = im.width > im.height
    let pw, ph
    if (o.pageSize === 'fit') {
      // Page = image at 96 dpi plus the margin.
      pw = (im.width * 72) / 96 + 2 * margin
      ph = (im.height * 72) / 96 + 2 * margin
    } else {
      ;[pw, ph] = PAPER[o.pageSize]
      const wantLandscape = o.orientation === 'landscape' || (o.orientation === 'auto' && landscape)
      if (wantLandscape) [pw, ph] = [ph, pw]
    }
    const page = doc.addPage([pw, ph])
    const boxW = pw - 2 * margin
    const boxH = ph - 2 * margin
    const s = o.pageSize === 'fit' ? boxW / im.width : o.fill ? Math.max(boxW / im.width, boxH / im.height) : Math.min(boxW / im.width, boxH / im.height)
    const w = im.width * s
    const h = im.height * s
    page.drawImage(embedded, { x: margin + (boxW - w) / 2, y: margin + (boxH - h) / 2, width: w, height: h })
  }
  return Buffer.from(await doc.save())
}
