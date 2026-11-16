// Grayscale / black-and-white conversion of rendered page pixels, plus the
// PDF rebuild. The pixel functions are pure so they can be checked from node.

export type GrayMode = 'gray' | 'bw'

export interface GrayOptions {
  mode: GrayMode
  /** bw: luminance below this is black. */
  threshold: number
  /** gray: push near-white (paper tint, light backgrounds) to pure white. */
  whiteBg: boolean
}

/** Light backgrounds above this luminance become white; fades down over 40 steps. */
const BG_FROM = 190

export function convertPixels(data: Uint8ClampedArray, o: GrayOptions) {
  for (let i = 0; i < data.length; i += 4) {
    let l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (o.mode === 'bw') l = l < o.threshold ? 0 : 255
    else if (o.whiteBg) {
      const k = Math.min(1, Math.max(0, (l - BG_FROM) / 40))
      l = l + (255 - l) * k
    }
    const v = Math.round(l)
    data[i] = data[i + 1] = data[i + 2] = v
    data[i + 3] = 255
  }
}

export const DPI_VALUES = [100, 150, 200] as const

/** Renders each page, converts it, and rebuilds a PDF of page images. */
export async function grayscalePdf(
  file: File,
  o: GrayOptions,
  dpi: number,
  onProgress: (done: number, total: number) => void,
  signal?: { cancelled: boolean },
): Promise<Blob> {
  const { loadPdf } = await import('@/lib/pdf-text')
  const { newPdfDoc, pdfBlob } = await import('@/lib/pdf-doc')
  const { task, pdf } = await loadPdf(file)
  try {
    const out = await newPdfDoc()
    for (let n = 1; n <= pdf.numPages; n++) {
      if (signal?.cancelled) throw new Error('cancelled')
      const page = await pdf.getPage(n)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: dpi / 72 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // 'print': the display intent waits on requestAnimationFrame and stalls in background tabs.
      await page.render({ canvas, canvasContext: ctx, viewport, intent: 'print' }).promise
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      convertPixels(img.data, o)
      ctx.putImageData(img, 0, 0)
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), o.mode === 'bw' ? 'image/png' : 'image/jpeg', 0.8),
      )
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const image = o.mode === 'bw' ? await out.embedPng(bytes) : await out.embedJpg(bytes)
      const p = out.addPage([base.width, base.height])
      p.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height })
      canvas.width = canvas.height = 0
      page.cleanup()
      onProgress(n, pdf.numPages)
    }
    return await pdfBlob(out)
  } finally {
    void task.destroy()
  }
}
