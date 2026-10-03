// Re-encodes images in the visitor's browser: decode, optionally scale down,
// encode as JPEG/WebP/PNG at the chosen quality. Re-encoding also drops all
// metadata (EXIF camera data, GPS location). Nothing is uploaded.

export type OutFormat = 'same' | 'jpeg' | 'webp'

export interface ImageOptions {
  format: OutFormat
  /** 0–1, for JPEG and WebP. */
  quality: number
  /** Longest side in pixels; 0 keeps the original size. */
  maxSide: number
}

export interface ImageResult {
  blob: Blob
  width: number
  height: number
  /** True when re-encoding did not help, so the original file is returned as is. */
  kept: boolean
}

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' }

let webpSupport: boolean | undefined
/** Safari before 16 cannot encode WebP from a canvas (it silently returns PNG). */
export function canEncodeWebp() {
  if (webpSupport === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  }
  return webpSupport
}

/** The type the image will be saved as. */
export function outputType(file: File, format: OutFormat) {
  if (format === 'jpeg') return 'image/jpeg'
  if (format === 'webp') return canEncodeWebp() ? 'image/webp' : 'image/jpeg'
  // "Same": keep JPEG/WebP/PNG; anything else (GIF, BMP, HEIC…) becomes JPEG.
  return file.type in EXTENSIONS ? file.type : 'image/jpeg'
}

export function outputName(file: File, type: string) {
  return file.name.replace(/\.[^.]+$/, '') + '.' + EXTENSIONS[type]
}

export async function compressImage(file: File, opts: ImageOptions): Promise<ImageResult> {
  // 'from-image' applies EXIF rotation, so phone photos stay upright once the EXIF is gone.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = opts.maxSide ? Math.min(1, opts.maxSide / Math.max(bitmap.width, bitmap.height)) : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const type = outputType(file, opts.format)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    if (type === 'image/jpeg') {
      // JPEG has no transparency: put transparent areas on white, not black.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), type, opts.quality),
    )
    canvas.width = canvas.height = 0

    // Same format and size but not smaller: the original was already well compressed.
    const sameShape = scale === 1 && type === file.type
    if (sameShape && blob.size >= file.size) return { blob: file, width, height, kept: true }
    return { blob, width, height, kept: false }
  } finally {
    bitmap.close()
  }
}
