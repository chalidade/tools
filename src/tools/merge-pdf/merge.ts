// Merges PDFs in the visitor's browser with pdf-lib: every page of each file
// is copied, in order, into one new document. Nothing is uploaded.

import { newPdfDoc, openPdfDoc, pageThumbs, pdfBlob } from '@/lib/pdf-doc'

export interface PdfItem {
  id: string
  file: File
  pages: number
  /** First page preview. */
  thumb: string
}

/** Reads a PDF's page count and first-page preview; throws on locked/broken files. */
export async function loadPdfItem(file: File): Promise<PdfItem> {
  const { count, thumbs } = await pageThumbs(file, 320, undefined, [1])
  return { id: crypto.randomUUID(), file, pages: count, thumb: thumbs[0].src }
}

export async function mergePdfs(items: PdfItem[], onProgress: (done: number, total: number) => void) {
  const out = await newPdfDoc()
  for (const [i, item] of items.entries()) {
    const src = await openPdfDoc(new Uint8Array(await item.file.arrayBuffer()))
    const pages = await out.copyPages(src, src.getPageIndices())
    for (const page of pages) out.addPage(page)
    onProgress(i + 1, items.length)
  }
  return pdfBlob(out)
}
