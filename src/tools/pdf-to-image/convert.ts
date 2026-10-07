// Everything here runs in the visitor's browser: pdf.js draws each page onto
// a canvas, which is saved as PNG or JPG — one file, or a ZIP for several.
// Nothing is uploaded. Heavy libraries are dynamic imports.

import type { PDFPageProxy } from 'pdfjs-dist'
import { loadPdf } from '@/lib/pdf-text'
import { tr } from '@/lib/i18n'

export { LockedPdfError } from '@/lib/pdf-text'

export type ImageFormat = 'png' | 'jpg'

export interface PdfPages {
  /** Small JPEG previews, one per page. */
  thumbs: string[]
}

async function renderPage(page: PDFPageProxy, scale: number, background = '#ffffff') {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // 'print' intent: 'display' paces itself with requestAnimationFrame, which
  // browsers pause in background tabs — a long export would stall there.
  await page.render({ canvas, canvasContext: ctx, viewport, intent: 'print' }).promise
  return canvas
}

/**
 * Renders a small preview of every page. The document is closed afterwards
 * and reopened for the export, so nothing holds the PDF open in between.
 */
export async function openPdf(file: File, onProgress: (done: number, total: number) => void): Promise<PdfPages> {
  const { task, pdf } = await loadPdf(file)
  const thumbs: string[] = []
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const base = page.getViewport({ scale: 1 })
      const canvas = await renderPage(page, 260 / Math.max(base.width, base.height))
      thumbs.push(canvas.toDataURL('image/jpeg', 0.8))
      page.cleanup()
      onProgress(n, pdf.numPages)
    }
  } finally {
    void task.destroy()
  }
  return { thumbs }
}

const toBlob = (canvas: HTMLCanvasElement, format: ImageFormat) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), format === 'png' ? 'image/png' : 'image/jpeg', 0.92),
  )

/**
 * Renders the chosen pages at `dpi` (PDF units are 72 per inch). One page
 * returns that image; several return a ZIP with one image per page.
 */
export async function exportImages(
  file: File,
  pages: number[],
  opts: { dpi: number; format: ImageFormat; baseName: string },
  onProgress: (done: number, total: number) => void,
): Promise<{ blob: Blob; fileName: string }> {
  const ext = opts.format
  const files: { name: string; blob: Blob }[] = []

  const { task, pdf } = await loadPdf(file)
  try {
    const pad = String(pdf.numPages).length
    for (const [i, n] of pages.entries()) {
      const page = await pdf.getPage(n)
      const canvas = await renderPage(page, opts.dpi / 72)
      files.push({ name: `${opts.baseName}-${String(n).padStart(pad, '0')}.${ext}`, blob: await toBlob(canvas, opts.format) })
      // Free the bitmap right away; 300 dpi pages are ~35 MB each uncompressed.
      canvas.width = canvas.height = 0
      page.cleanup()
      onProgress(i + 1, pages.length)
    }
  } finally {
    void task.destroy()
  }

  if (files.length === 1) return { blob: files[0].blob, fileName: files[0].name }
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  // Images are already compressed; storing them is as small and much faster.
  for (const f of files) zip.file(f.name, f.blob, { compression: 'STORE' })
  return { blob: await zip.generateAsync({ type: 'blob' }), fileName: tr(`${opts.baseName}-gambar.zip`, `${opts.baseName}-images.zip`) }
}
