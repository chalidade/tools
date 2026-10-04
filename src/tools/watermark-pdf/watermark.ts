// Stamps a text or image watermark on every page, in the visitor's browser
// (pdf-lib). The same layout math drives the on-screen preview, so what the
// preview shows is what lands in the PDF. Nothing is uploaded.

import type { PDFFont } from 'pdf-lib'
import { openPdfDoc, pdfBlob, uprightPage } from '@/lib/pdf-doc'

export type WatermarkSize = 'sm' | 'md' | 'lg'
export type WatermarkLayout = 'center' | 'tile'
export type WatermarkColor = 'gray' | 'red' | 'blue' | 'black'

export const COLORS: Record<WatermarkColor, [number, number, number]> = {
  gray: [0.5, 0.5, 0.5],
  red: [0.86, 0.15, 0.15],
  blue: [0.15, 0.39, 0.92],
  black: [0, 0, 0],
}

export interface WatermarkImage {
  /** PNG bytes (any picked format is redrawn as PNG). */
  png: Uint8Array
  /** For the preview. */
  url: string
  width: number
  height: number
}

export interface WatermarkOptions {
  kind: 'text' | 'image'
  text: string
  image: WatermarkImage | null
  color: WatermarkColor
  opacity: number
  /** Degrees, counter-clockwise. */
  angle: number
  layout: WatermarkLayout
  size: WatermarkSize
}

/** One stamp: centre point in points, upright page space (origin bottom-left, y up). */
export interface Stamp {
  cx: number
  cy: number
}

export interface Layout {
  stamps: Stamp[]
  /** Text: font size and width. Image: drawn width and height. */
  size: number
  width: number
  height: number
}

/** Helvetica Bold's cap height is ~0.72 em; half of it centres the text on its stamp point. */
export const HALF_CAP = 0.36

let fontPromise: Promise<PDFFont> | null = null
/** Helvetica Bold metrics, from a throwaway document; the PDF itself embeds its own copy. */
function metricsFont() {
  fontPromise ??= import('pdf-lib').then(async ({ PDFDocument, StandardFonts }) =>
    (await PDFDocument.create()).embedFont(StandardFonts.HelveticaBold),
  )
  return fontPromise
}

/**
 * Text width at 1 pt, or null when the text has a character the built-in PDF
 * font cannot draw (it covers Latin letters, not e.g. emoji or CJK).
 */
export async function measureText(text: string): Promise<number | null> {
  const font = await metricsFont()
  try {
    font.encodeText(text)
    return font.widthOfTextAtSize(text, 1)
  } catch {
    return null
  }
}

const TEXT_SIZE: Record<WatermarkLayout, Record<WatermarkSize, number>> = {
  center: { sm: 0.08, md: 0.12, lg: 0.17 },
  tile: { sm: 0.035, md: 0.05, lg: 0.07 },
}
const IMAGE_WIDTH: Record<WatermarkLayout, Record<WatermarkSize, number>> = {
  center: { sm: 0.25, md: 0.4, lg: 0.6 },
  tile: { sm: 0.12, md: 0.18, lg: 0.25 },
}

/**
 * Where the stamps go on a page of `w`×`h` points. `textWidth` is the text's
 * width at 1 pt (text watermarks) — ignored for images.
 */
export function layoutWatermark(w: number, h: number, opts: WatermarkOptions, textWidth: number): Layout {
  const rad = (opts.angle * Math.PI) / 180
  const short = Math.min(w, h)
  let size: number
  let width: number
  let height: number

  if (opts.kind === 'image' && opts.image) {
    width = w * IMAGE_WIDTH[opts.layout][opts.size]
    height = (width * opts.image.height) / opts.image.width
    // A tall logo shouldn't run off the page.
    const maxH = h * (opts.layout === 'center' ? 0.8 : 0.3)
    if (height > maxH) {
      width *= maxH / height
      height = maxH
    }
    size = width
  } else {
    // Shrink long text so it still fits along its direction across the page.
    const room = opts.layout === 'center' ? 0.85 * (opts.angle === 0 ? w : Math.hypot(w, h) * 0.75) : 0.6 * w
    size = Math.min(short * TEXT_SIZE[opts.layout][opts.size], room / Math.max(textWidth, 0.01))
    width = textWidth * size
    height = size
  }

  if (opts.layout === 'center') return { stamps: [{ cx: w / 2, cy: h / 2 }], size, width, height }

  // Tile: a grid in the watermark's own rotated frame, every other row shifted
  // half a step, kept to stamps that touch the page.
  const stepU = width + Math.max(height, size) * 2
  const stepV = Math.max(height, size) * 3.2
  const dir = { x: Math.cos(rad), y: Math.sin(rad) }
  const perp = { x: -Math.sin(rad), y: Math.cos(rad) }
  const reach = Math.hypot(w, h) / 2 + Math.max(width, height)
  const nu = Math.ceil(reach / stepU) + 1
  const nv = Math.ceil(reach / stepV) + 1
  const pad = Math.max(width, height) / 2
  const stamps: Stamp[] = []
  for (let j = -nv; j <= nv; j++) {
    const shift = (Math.abs(j) % 2) * (stepU / 2)
    for (let i = -nu; i <= nu; i++) {
      const u = i * stepU + shift
      const v = j * stepV
      const cx = w / 2 + u * dir.x + v * perp.x
      const cy = h / 2 + u * dir.y + v * perp.y
      if (cx > -pad && cx < w + pad && cy > -pad && cy < h + pad) stamps.push({ cx, cy })
    }
  }
  return { stamps, size, width, height }
}

/** Redraws any browser-readable image as PNG so pdf-lib can embed it. */
export async function readWatermarkImage(file: File): Promise<WatermarkImage> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/png'),
  )
  return {
    png: new Uint8Array(await blob.arrayBuffer()),
    url: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
  }
}

export async function watermarkPdf(file: File, opts: WatermarkOptions, onProgress: (done: number, total: number) => void) {
  const { StandardFonts, degrees, rgb } = await import('pdf-lib')
  const doc = await openPdfDoc(new Uint8Array(await file.arrayBuffer()))
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const image = opts.kind === 'image' && opts.image ? await doc.embedPng(opts.image.png) : null
  const textWidth = font.widthOfTextAtSize(opts.text, 1)
  const rad = (opts.angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const pages = doc.getPages()

  for (const [n, page] of pages.entries()) {
    const view = await uprightPage(page)
    const l = layoutWatermark(view.width, view.height, opts, textWidth)
    view.upright(() => {
      for (const { cx, cy } of l.stamps) {
        // pdf-lib rotates around the bottom-left corner (text: its baseline start),
        // so step back from the centre by half the size along the rotated axes.
        if (image) {
          page.drawImage(image, {
            x: cx - (l.width / 2) * cos + (l.height / 2) * sin,
            y: cy - (l.width / 2) * sin - (l.height / 2) * cos,
            width: l.width,
            height: l.height,
            rotate: degrees(opts.angle),
            opacity: opts.opacity,
          })
        } else {
          const half = l.size * HALF_CAP
          page.drawText(opts.text, {
            x: cx - (l.width / 2) * cos + half * sin,
            y: cy - (l.width / 2) * sin - half * cos,
            size: l.size,
            font,
            color: rgb(...COLORS[opts.color]),
            opacity: opts.opacity,
            rotate: degrees(opts.angle),
          })
        }
      }
    })
    onProgress(n + 1, pages.length)
  }
  return pdfBlob(doc)
}
