// pdf.js in Node: the same page reader as the site (readPageText), opened from
// bytes instead of a File and without a worker URL.
import { LockedPdfError, readPageText, type PageText } from '@/lib/pdf-text'

export async function readPdfPages(bytes: Uint8Array, maxPages: number) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false, verbosity: 0 })
  let pdf
  try {
    pdf = await task.promise
  } catch (e) {
    await task.destroy()
    if (e instanceof pdfjs.PasswordException) throw new LockedPdfError()
    throw e
  }
  const pages: PageText[] = []
  try {
    const count = Math.min(pdf.numPages, maxPages)
    for (let n = 1; n <= count; n++) {
      const page = await pdf.getPage(n)
      pages.push(await readPageText(page))
      page.cleanup()
    }
    const info = await pdf.getMetadata().catch(() => null)
    const title = (info?.info as { Title?: string } | undefined)?.Title?.trim() || null
    return { pages, totalPages: pdf.numPages, title }
  } finally {
    await task.destroy()
  }
}
