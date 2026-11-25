// Puts several PDF pages on one sheet (2, 4 or 8 up) or arranges them as a
// fold-in-half booklet. Pages are embedded as form XObjects with pdf-lib, so
// text stays sharp and selectable. Layout math is pure and shared with the
// on-screen preview. Nothing is uploaded.

import { isPdfFile, newPdfDoc, openPdfDoc, pdfBlob } from '@/lib/pdf-doc'

export { isPdfFile }

export type Layout = '2' | '4' | '8' | 'booklet'
export type Paper = 'a4' | 'f4' | 'letter'

/** Sheet sizes in points, portrait. */
export const PAPER: Record<Paper, { w: number; h: number }> = {
  a4: { w: 595.28, h: 841.89 },
  f4: { w: 609.45, h: 935.43 },
  letter: { w: 612, h: 792 },
}

export interface NupOptions {
  layout: Layout
  paper: Paper
  /** Thin outline around every page. */
  border: boolean
}

export const MARGIN = 18
export const GAP = 8

/** Columns × rows and orientation of the sheet for a layout. */
export function gridFor(layout: Layout) {
  switch (layout) {
    case '2':
      return { cols: 2, rows: 1, landscape: true }
    case '4':
      return { cols: 2, rows: 2, landscape: false }
    case '8':
      return { cols: 4, rows: 2, landscape: true }
    default:
      return { cols: 2, rows: 1, landscape: true }
  }
}

export interface Cell {
  x: number
  y: number
  w: number
  h: number
}

/** Sheet size for the options, in points (landscape sheets are wider than tall). */
export function sheetSize(o: Pick<NupOptions, 'layout' | 'paper'>) {
  const { w, h } = PAPER[o.paper]
  return gridFor(o.layout).landscape ? { w: h, h: w } : { w, h }
}

/** Cells in reading order (left to right, top to bottom); y is from the bottom edge. */
export function cellRects(o: Pick<NupOptions, 'layout' | 'paper'>): Cell[] {
  const { cols, rows } = gridFor(o.layout)
  const { w: W, h: H } = sheetSize(o)
  const cw = (W - 2 * MARGIN - (cols - 1) * GAP) / cols
  const ch = (H - 2 * MARGIN - (rows - 1) * GAP) / rows
  const cells: Cell[] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) cells.push({ x: MARGIN + c * (cw + GAP), y: H - MARGIN - (r + 1) * ch - r * GAP, w: cw, h: ch })
  return cells
}

/**
 * Which source page (0-based, null = blank) goes in each slot of each sheet
 * side. For n-up, one side per sheet in order. For a booklet the page count is
 * padded to a multiple of 4 and sides alternate front/back so that printing
 * double-sided (flip on the short edge) and folding in half gives the book.
 */
export function sides(count: number, layout: Layout): (number | null)[][] {
  const slots = gridFor(layout).cols * gridFor(layout).rows
  const page = (i: number) => (i < count ? i : null)
  if (layout === 'booklet') {
    const n = Math.ceil(count / 4) * 4
    const out: (number | null)[][] = []
    for (let i = 0; i < n / 2; i += 2) {
      out.push([page(n - 1 - i), page(i)])
      out.push([page(i + 1), page(n - 2 - i)])
    }
    return out
  }
  const out: (number | null)[][] = []
  for (let i = 0; i < count; i += slots) out.push(Array.from({ length: slots }, (_, k) => page(i + k)))
  return out
}

/** Scale and offset that fit a `pw`×`ph` page inside a cell, centred. */
export function fit(pw: number, ph: number, cell: Cell) {
  const scale = Math.min(cell.w / pw, cell.h / ph)
  return { scale, x: cell.x + (cell.w - pw * scale) / 2, y: cell.y + (cell.h - ph * scale) / 2, w: pw * scale, h: ph * scale }
}

export async function nupPdf(file: File, o: NupOptions, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const src = await openPdfDoc(new Uint8Array(await file.arrayBuffer()))
  const out = await newPdfDoc()
  const { rgb, degrees } = await import('pdf-lib')
  const srcPages = src.getPages()
  const plan = sides(srcPages.length, o.layout)
  const cells = cellRects(o)
  const { w: W, h: H } = sheetSize(o)

  for (const [s, side] of plan.entries()) {
    const sheet = out.addPage([W, H])
    for (const [k, idx] of side.entries()) {
      if (idx === null) continue
      const page = srcPages[idx]
      const box = page.getCropBox()
      const embedded = await out.embedPage(page, { left: box.x, bottom: box.y, right: box.x + box.width, top: box.y + box.height })
      const angle = (((page.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270
      const sideways = angle === 90 || angle === 270
      const uw = sideways ? box.height : box.width
      const uh = sideways ? box.width : box.height
      const f = fit(uw, uh, cells[k])
      // Draw the form rotated clockwise by `angle`; the origin is chosen so the rotated box's lower-left corner lands on (f.x, f.y).
      const sw = box.width * f.scale
      const sh = box.height * f.scale
      const origin = {
        0: { x: f.x, y: f.y },
        90: { x: f.x, y: f.y + sw },
        180: { x: f.x + sw, y: f.y + sh },
        270: { x: f.x + sh, y: f.y },
      }[angle]
      sheet.drawPage(embedded, { x: origin.x, y: origin.y, width: sw, height: sh, rotate: degrees(-angle) })
      if (o.border) sheet.drawRectangle({ x: f.x, y: f.y, width: f.w, height: f.h, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 })
    }
    onProgress?.(s + 1, plan.length)
    if (s % 8 === 7) await new Promise((r) => setTimeout(r))
  }
  return pdfBlob(out)
}
