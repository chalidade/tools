// Everything here runs in the visitor's browser: pdf.js renders each page and
// reads its text, and pptxgenjs writes the .pptx — one slide per page, the
// slide the same size as the page. Nothing is uploaded. Heavy libraries are
// dynamic imports so they load only when used.
//
// Editable slides are built in two layers: the page drawn *without* its text
// (shapes, colours, photos) as the slide background, and every run of text as
// a real text box on top, at its original position, size, style and colour.

import type { PDFPageProxy } from 'pdfjs-dist'
import { importPdfjs, loadPdf, readPageText, segmentLine } from '@/lib/pdf-text'

export { LockedPdfError } from '@/lib/pdf-text'

export interface TextBox {
  text: string
  /** Top-left and size in points. */
  x: number
  y: number
  w: number
  h: number
  size: number
  bold: boolean
  italic: boolean
  font: string
  /** "RRGGBB" */
  color: string
}

export interface SlidePage {
  /** Page size in points. */
  width: number
  height: number
  /** The page exactly as the PDF draws it (JPEG data URL). */
  image: string
  /** The page with its text left out — the editable slide's background. */
  background: string
  boxes: TextBox[]
}

export type SlideMode = 'editable' | 'image'

/** Render resolution: 2× = 144 dpi, sharp on screen and in print. */
const SCALE = 2

async function render(page: PDFPageProxy, withText: boolean) {
  const viewport = page.getViewport({ scale: SCALE })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  let operationsFilter: ((index: number) => boolean) | undefined
  if (!withText) {
    // Skip the operators that paint text; everything else (shapes, fills,
    // images) still renders. Indices refer to the operator list of the same intent.
    const { OPS } = await importPdfjs()
    const textOps = new Set([OPS.showText, OPS.showSpacedText, OPS.nextLineShowText, OPS.nextLineSetSpacingShowText])
    const { fnArray } = await page.getOperatorList({ intent: 'print' })
    operationsFilter = (index) => !textOps.has(fnArray[index])
  }
  // 'print' intent: the default 'display' rendering paces itself with
  // requestAnimationFrame, which browsers pause in a background tab — the
  // conversion would hang if the visitor switched tabs while it ran.
  await page.render({ canvas, canvasContext: ctx, viewport, intent: 'print', operationsFilter }).promise
  return { canvas, ctx }
}

/**
 * pdf.js does not report text colour, so read it off the pixels: where the
 * page-with-text differs from the page-without-text is the glyphs. Average the
 * most-changed pixels (glyph cores, not anti-aliased edges).
 */
function textColor(withText: CanvasRenderingContext2D, without: CanvasRenderingContext2D, box: TextBox) {
  const x = Math.max(0, Math.floor(box.x * SCALE))
  const y = Math.max(0, Math.floor(box.y * SCALE))
  const w = Math.max(1, Math.min(Math.ceil(box.w * SCALE), withText.canvas.width - x))
  const h = Math.max(1, Math.min(Math.ceil(box.h * SCALE), withText.canvas.height - y))
  const a = withText.getImageData(x, y, w, h).data
  const b = without.getImageData(x, y, w, h).data

  let max = 0
  const diffs = new Float32Array(w * h)
  for (let i = 0, p = 0; i < a.length; i += 4, p++) {
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
    diffs[p] = d
    if (d > max) max = d
  }
  if (max < 40) {
    // No visible glyph difference: pick black or white against the background.
    let lum = 0
    for (let i = 0; i < b.length; i += 4) lum += 0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2]
    return lum / (b.length / 4) < 128 ? 'FFFFFF' : '000000'
  }
  let r = 0
  let g = 0
  let bl = 0
  let n = 0
  for (let p = 0; p < diffs.length; p++) {
    if (diffs[p] < max * 0.7) continue
    r += a[p * 4]
    g += a[p * 4 + 1]
    bl += a[p * 4 + 2]
    n++
  }
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0')
  return `${hex(r)}${hex(g)}${hex(bl)}`.toUpperCase()
}

export async function readPdfPages(file: File, onProgress: (done: number, total: number) => void): Promise<SlidePage[]> {
  const { task, pdf } = await loadPdf(file)
  const pages: SlidePage[] = []
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const text = await readPageText(page)
      const full = await render(page, true)
      const bare = await render(page, false)

      const boxes: TextBox[] = text.lines.flatMap((line) =>
        segmentLine(line).map((s) => {
          const box: TextBox = {
            text: s.text,
            // The baseline sits about 0.8 em below the top of the line box.
            x: s.x,
            y: s.y - s.size * 0.8,
            // A little slack: the substitute font may run slightly wider.
            w: (s.right - s.x) * 1.08 + s.size * 0.5,
            h: s.size * 1.25,
            size: s.size,
            bold: s.bold,
            italic: s.italic,
            font: s.font,
            color: '000000',
          }
          box.color = textColor(full.ctx, bare.ctx, box)
          return box
        }),
      )

      pages.push({
        width: text.width,
        height: text.height,
        image: full.canvas.toDataURL('image/jpeg', 0.9),
        background: bare.canvas.toDataURL('image/jpeg', 0.9),
        boxes,
      })
      page.cleanup()
      onProgress(n, pdf.numPages)
    }
  } finally {
    void task.destroy()
  }
  return pages
}

export async function buildPptx(pages: SlidePage[], mode: SlideMode): Promise<Blob> {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  const inch = (pt: number) => pt / 72

  // One layout for the deck, from the first page (PowerPoint has one slide size).
  const first = pages[0]
  pptx.defineLayout({ name: 'PDF', width: inch(first.width), height: inch(first.height) })
  pptx.layout = 'PDF'

  for (const page of pages) {
    const slide = pptx.addSlide()
    // Pages of another size are fitted into the deck's slide size.
    const scale = Math.min(first.width / page.width, first.height / page.height)
    const offX = (first.width - page.width * scale) / 2
    const offY = (first.height - page.height * scale) / 2

    slide.addImage({
      data: mode === 'editable' ? page.background : page.image,
      x: inch(offX),
      y: inch(offY),
      w: inch(page.width * scale),
      h: inch(page.height * scale),
    })
    if (mode === 'image') continue

    for (const box of page.boxes) {
      slide.addText(box.text, {
        x: inch(offX + box.x * scale),
        y: inch(offY + box.y * scale),
        w: inch(box.w * scale),
        h: inch(box.h * scale),
        fontSize: Math.max(1, Math.round(box.size * scale * 10) / 10),
        fontFace: box.font || 'Arial',
        bold: box.bold,
        italic: box.italic,
        color: box.color,
        margin: 0,
        valign: 'top',
        wrap: false,
        fit: 'none',
      })
    }
  }

  return (await pptx.write({ outputType: 'blob' })) as Blob
}
