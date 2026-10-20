// Rebuilds a PDF from a list of pages the visitor reordered, rotated,
// duplicated or removed (pdf-lib). Nothing is uploaded.

import { openPdfDoc, newPdfDoc, pdfBlob } from '@/lib/pdf-doc'

export interface PageItem {
  /** Unique key for React and drag. */
  id: number
  /** Page index in the source file, 0-based. */
  src: number
  /** Extra clockwise rotation, a multiple of 90. */
  turn: number
}

/** Moves the item at `from` so it ends up at index `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item)
  return next
}

export const rotateBy = (turn: number, delta: 90 | -90) => (((turn + delta) % 360) + 360) % 360

export async function organizePdf(file: File, items: PageItem[]) {
  const { degrees } = await import('pdf-lib')
  const source = await openPdfDoc(new Uint8Array(await file.arrayBuffer()))
  const out = await newPdfDoc()
  const copies = await out.copyPages(
    source,
    items.map((i) => i.src),
  )
  copies.forEach((page, n) => {
    const turn = items[n].turn
    if (turn) page.setRotation(degrees((((page.getRotation().angle + turn) % 360) + 360) % 360))
    out.addPage(page)
  })
  return pdfBlob(out)
}
