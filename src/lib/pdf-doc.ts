// Editing existing PDFs in the visitor's browser with pdf-lib (merge, split,
// watermark, signature), plus small page previews from pdf.js. Both libraries
// are dynamic imports so they load only when a tool needs them.

import type { PDFDocument, PDFPage } from 'pdf-lib'
import { LockedPdfError, loadPdf } from '@/lib/pdf-text'
import { isPasswordError, runQpdf } from '@/lib/qpdf'
import { tr } from '@/lib/i18n'

export { LockedPdfError } from '@/lib/pdf-text'

export const isPdfFile = (file: File) => /\.pdf$/i.test(file.name) || file.type === 'application/pdf'

/**
 * Opens a PDF for editing. pdf-lib cannot read encrypted files, so one that
 * opens without a password (only print/copy restrictions) is decrypted with
 * qpdf first; one that needs a password throws LockedPdfError.
 */
export async function openPdfDoc(bytes: Uint8Array): Promise<PDFDocument> {
  const { PDFDocument, EncryptedPDFError } = await import('pdf-lib')
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false })
  } catch (e) {
    if (!(e instanceof EncryptedPDFError)) throw e
  }
  const { code, log, output } = await runQpdf(bytes, (i, o) => [i, '--decrypt', o])
  if (isPasswordError(log) || code === 2 || !output) throw new LockedPdfError()
  return PDFDocument.load(output, { updateMetadata: false })
}

export async function newPdfDoc() {
  const { PDFDocument } = await import('pdf-lib')
  return PDFDocument.create()
}

export async function pdfBlob(doc: PDFDocument) {
  return new Blob([(await doc.save()) as BlobPart], { type: 'application/pdf' })
}

/**
 * The page as a reader shows it: size after /Rotate, and the matrix that maps
 * those upright coordinates (origin bottom-left, y up, in points) into the
 * page's own content space. Draw inside `upright()` and things land where
 * they appear in the preview, whatever the page's rotation or crop box.
 */
export async function uprightPage(page: PDFPage) {
  const { pushGraphicsState, popGraphicsState, concatTransformationMatrix } = await import('pdf-lib')
  const { x, y, width: w, height: h } = page.getCropBox()
  const angle = (((page.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270
  // [a b c d e f]: content x = a·p + c·q + e, content y = b·p + d·q + f
  const matrix: Record<number, [number, number, number, number, number, number]> = {
    0: [1, 0, 0, 1, x, y],
    90: [0, 1, -1, 0, x + w, y],
    180: [-1, 0, 0, -1, x + w, y + h],
    270: [0, -1, 1, 0, x, y + h],
  }
  const sideways = angle === 90 || angle === 270
  return {
    width: sideways ? h : w,
    height: sideways ? w : h,
    upright(draw: () => void) {
      page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...(matrix[angle] ?? matrix[0])))
      draw()
      page.pushOperators(popGraphicsState())
    },
  }
}

export interface PageThumb {
  /** JPEG data URL. */
  src: string
  /** Page size in points as shown (after rotation). */
  width: number
  height: number
}

/**
 * Renders a preview of each page, `maxPx` on the longer side. `pages` limits
 * it to some page numbers (1-based); the result follows that order.
 */
export async function pageThumbs(
  file: File,
  maxPx: number,
  onProgress?: (done: number, total: number) => void,
  pages?: number[],
): Promise<{ count: number; thumbs: PageThumb[] }> {
  const { task, pdf } = await loadPdf(file)
  const thumbs: PageThumb[] = []
  try {
    const wanted = pages ?? Array.from({ length: pdf.numPages }, (_, i) => i + 1)
    for (const [i, n] of wanted.entries()) {
      const page = await pdf.getPage(n)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: maxPx / Math.max(base.width, base.height) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // 'print': the display intent waits on requestAnimationFrame and stalls in background tabs.
      await page.render({ canvas, canvasContext: ctx, viewport, intent: 'print' }).promise
      thumbs.push({ src: canvas.toDataURL('image/jpeg', 0.8), width: base.width, height: base.height })
      canvas.width = canvas.height = 0
      page.cleanup()
      onProgress?.(i + 1, wanted.length)
    }
    return { count: pdf.numPages, thumbs }
  } finally {
    void task.destroy()
  }
}

/** Message for a PDF that could not be opened. */
export function openErrorMessage(e: unknown) {
  return e instanceof LockedPdfError
    ? tr(
        'PDF ini dikunci password. Buka kuncinya dulu dengan tool “Buka Proteksi PDF”.',
        'This PDF is password-protected. Unlock it first with the “Unlock PDF” tool.',
      )
    : tr('PDF tidak bisa dibaca. Pastikan filenya tidak rusak.', "This PDF can't be read. Make sure the file isn't damaged.")
}
