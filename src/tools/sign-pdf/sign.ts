// Puts a signature image onto PDF pages in the visitor's browser (pdf-lib).
// The signature is drawn on a canvas or taken from a photo/scan; it never
// leaves the device.

import { openPdfDoc, pdfBlob, uprightPage } from '@/lib/pdf-doc'

export interface Signature {
  png: Uint8Array
  url: string
  width: number
  height: number
}

/**
 * One placed signature. Fractions of the page as shown (after rotation),
 * measured from its top-left corner; height follows the image's aspect.
 */
export interface Placement {
  id: string
  page: number
  x: number
  y: number
  w: number
}

const toPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/png'))

/**
 * Crops a canvas to its non-transparent pixels plus a small margin and saves
 * it as PNG. Returns null when nothing is drawn.
 */
export async function trimToSignature(source: HTMLCanvasElement): Promise<Signature | null> {
  const ctx = source.getContext('2d')!
  const { width, height } = source
  const data = ctx.getImageData(0, 0, width, height).data
  let top = height
  let left = width
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  if (right < 0) return null

  const pad = Math.round(Math.max(width, height) * 0.01)
  left = Math.max(0, left - pad)
  top = Math.max(0, top - pad)
  right = Math.min(width - 1, right + pad)
  bottom = Math.min(height - 1, bottom + pad)

  const out = document.createElement('canvas')
  out.width = right - left + 1
  out.height = bottom - top + 1
  out.getContext('2d')!.drawImage(source, left, top, out.width, out.height, 0, 0, out.width, out.height)
  const blob = await toPng(out)
  return { png: new Uint8Array(await blob.arrayBuffer()), url: URL.createObjectURL(blob), width: out.width, height: out.height }
}

/**
 * Reads a photo or scan of a signature. With `removeWhite`, paper turns
 * transparent: light pixels fade out, ink stays, with a soft edge between.
 */
export async function readSignatureImage(file: File, removeWhite: boolean): Promise<Signature | null> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  if (removeWhite) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      // ≥ 220 is paper, ≤ 160 is ink; in between fades.
      const keep = Math.min(1, Math.max(0, (220 - lum) / 60))
      d[i + 3] = Math.round(d[i + 3] * keep)
    }
    ctx.putImageData(img, 0, 0)
  }
  return trimToSignature(canvas)
}

export async function signPdf(file: File, signature: Signature, placements: Placement[]) {
  const doc = await openPdfDoc(new Uint8Array(await file.arrayBuffer()))
  const image = await doc.embedPng(signature.png)
  const pages = doc.getPages()
  for (const p of placements) {
    const page = pages[p.page - 1]
    if (!page) continue
    const view = await uprightPage(page)
    const width = p.w * view.width
    const height = (width * signature.height) / signature.width
    view.upright(() => {
      page.drawImage(image, {
        x: p.x * view.width,
        // Placements are measured from the top; PDF space starts at the bottom.
        y: view.height - p.y * view.height - height,
        width,
        height,
      })
    })
  }
  return pdfBlob(doc)
}
