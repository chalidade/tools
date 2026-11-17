// PDF redaction: marked areas are blacked out on a re-render of the page, and
// that page is replaced by the image, so the original text is really gone.
// Rects are fractions (0..1) of the page as shown, so they survive any zoom.

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const clamp = (v: number) => Math.min(1, Math.max(0, v))

/** Rect between two drag points (any direction), clamped to the page. */
export function rectFromPoints(ax: number, ay: number, bx: number, by: number): Rect {
  const x1 = clamp(Math.min(ax, bx))
  const y1 = clamp(Math.min(ay, by))
  const x2 = clamp(Math.max(ax, bx))
  const y2 = clamp(Math.max(ay, by))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

/** Ignore accidental taps. */
export const isUsable = (r: Rect) => r.w > 0.008 && r.h > 0.004

export async function redactPdf(
  file: File,
  marks: Map<number, Rect[]>,
  dpi: number,
  onProgress: (done: number, total: number) => void,
  signal?: { cancelled: boolean },
): Promise<Blob> {
  const { loadPdf } = await import('@/lib/pdf-text')
  const { openPdfDoc, pdfBlob } = await import('@/lib/pdf-doc')
  const pages = [...marks.entries()].filter(([, r]) => r.length).sort((a, b) => a[0] - b[0])
  const doc = await openPdfDoc(new Uint8Array(await file.arrayBuffer()))
  const { task, pdf } = await loadPdf(file)
  try {
    for (const [i, [n, rects]] of pages.entries()) {
      if (signal?.cancelled) throw new Error('cancelled')
      const page = await pdf.getPage(n)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: dpi / 72 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // 'print': the display intent waits on requestAnimationFrame and stalls in background tabs.
      await page.render({ canvas, canvasContext: ctx, viewport, intent: 'print' }).promise
      ctx.fillStyle = '#000000'
      for (const r of rects) ctx.fillRect(Math.floor(r.x * canvas.width), Math.floor(r.y * canvas.height), Math.ceil(r.w * canvas.width) + 1, Math.ceil(r.h * canvas.height) + 1)
      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.85))
      const image = await doc.embedJpg(new Uint8Array(await blob.arrayBuffer()))
      doc.removePage(n - 1)
      const p = doc.insertPage(n - 1, [base.width, base.height])
      p.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height })
      canvas.width = canvas.height = 0
      page.cleanup()
      onProgress(i + 1, pages.length)
    }
    return await pdfBlob(doc)
  } finally {
    void task.destroy()
  }
}
