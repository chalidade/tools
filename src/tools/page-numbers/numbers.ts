// Stamps page numbers on a PDF (pdf-lib). The label and position math is
// shared with the on-screen preview. Nothing is uploaded.

import { openPdfDoc, pdfBlob, uprightPage } from '@/lib/pdf-doc'
import { tr } from '@/lib/i18n'

export type NumberFormat = 'plain' | 'of-total' | 'word' | 'dash'
export type VPos = 'top' | 'bottom'
export type HPos = 'left' | 'center' | 'right'

export interface NumberOptions {
  format: NumberFormat
  v: VPos
  h: HPos
  /** First page that gets a number, 1-based. */
  fromPage: number
  /** The number printed on that first page. */
  startAt: number
  size: number
}

/** Text for number `n` when the last number is `total`. */
export function pageLabel(format: NumberFormat, n: number, total: number): string {
  switch (format) {
    case 'of-total':
      return `${n} / ${total}`
    case 'word':
      return `${tr('Halaman', 'Page')} ${n}`
    case 'dash':
      return `- ${n} -`
    default:
      return String(n)
  }
}

/** Distance from the page edge, in points. */
export const MARGIN = 28

/** Baseline origin of a label of `width` points on a `w`×`h` upright page. */
export function labelOrigin(w: number, h: number, width: number, size: number, v: VPos, hp: HPos) {
  const x = hp === 'left' ? MARGIN : hp === 'right' ? w - MARGIN - width : (w - width) / 2
  const y = v === 'bottom' ? MARGIN : h - MARGIN - size * 0.72
  return { x, y }
}

/** Number printed on 1-based page `page`, or null when it is before `fromPage`. */
export function numberFor(page: number, opts: NumberOptions): number | null {
  return page < opts.fromPage ? null : opts.startAt + (page - opts.fromPage)
}

export async function numberPdf(file: File, opts: NumberOptions, onProgress: (done: number, total: number) => void) {
  const { StandardFonts, rgb } = await import('pdf-lib')
  const doc = await openPdfDoc(new Uint8Array(await file.arrayBuffer()))
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const last = numberFor(pages.length, opts) ?? 0
  for (const [i, page] of pages.entries()) {
    const n = numberFor(i + 1, opts)
    if (n !== null) {
      const view = await uprightPage(page)
      const text = pageLabel(opts.format, n, last)
      const width = font.widthOfTextAtSize(text, opts.size)
      const { x, y } = labelOrigin(view.width, view.height, width, opts.size, opts.v, opts.h)
      view.upright(() => page.drawText(text, { x, y, size: opts.size, font, color: rgb(0.1, 0.1, 0.1) }))
    }
    onProgress(i + 1, pages.length)
  }
  return pdfBlob(doc)
}
