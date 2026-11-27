// Marks one photo and encodes it. Runs in a Web Worker (OffscreenCanvas);
// re-encoding through a canvas also drops every bit of metadata (EXIF, GPS).

import { fitSize } from './layout'
import { renderMarked, type Logo, type MarkOpts } from './render'

export interface ProcessOpts {
  mark: MarkOpts
  /** Longer side in px; 0 keeps the original size. */
  maxSide: number
  format: 'auto' | 'jpg' | 'png'
  quality: number
}

export function outputType(file: { type: string }, format: ProcessOpts['format']) {
  if (format === 'jpg') return 'image/jpeg'
  if (format === 'png') return 'image/png'
  return file.type === 'image/png' ? 'image/png' : 'image/jpeg'
}

export async function loadLogo(blob: Blob): Promise<Logo & { close: () => void }> {
  const bmp = await createImageBitmap(blob)
  return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
}

export async function processPhoto(file: Blob, o: ProcessOpts, logo: Logo | null): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const { w, h } = fitSize(bmp.width, bmp.height, o.maxSide)
    const type = outputType(file, o.format)
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')!
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
    }
    renderMarked(ctx, bmp, w, h, o.mark, logo)
    return await canvas.convertToBlob({ type, quality: o.quality })
  } finally {
    bmp.close()
  }
}
