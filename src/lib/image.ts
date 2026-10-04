// Small helpers for the image tools: decoding a picked file into something a
// canvas can draw, and encoding a canvas back to a file. All in the browser.

export class UnreadableImageError extends Error {}

export interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  /** Frees the decoded pixels. */
  close: () => void
}

const isSvg = (file: File) => file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)

/**
 * Decodes an image file with its EXIF rotation applied, so phone photos come
 * out upright. SVG goes through an <img> (createImageBitmap rejects SVG in
 * some browsers) and is drawn at its own size, or 512 px when it has none.
 */
export async function decodeImage(file: File): Promise<DecodedImage> {
  if (isSvg(file)) {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      const width = img.naturalWidth || 512
      const height = img.naturalHeight || 512
      return { source: img, width, height, close: () => URL.revokeObjectURL(url) }
    } catch {
      URL.revokeObjectURL(url)
      throw new UnreadableImageError()
    }
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
  } catch {
    throw new UnreadableImageError()
  }
}

export function canvasBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), type, quality),
  )
}

export function newCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
