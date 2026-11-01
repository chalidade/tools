// Re-encodes images in the visitor's browser: decode, optionally scale down,
// encode as JPEG/WebP/PNG at the chosen quality. Re-encoding also drops all
// metadata (EXIF camera data, GPS location). Nothing is uploaded.

import { stripMetadata } from '../strip-exif/exif'

export type OutFormat = 'same' | 'jpeg' | 'webp'

export interface ImageOptions {
  format: OutFormat
  /** 0–1, for JPEG and WebP. */
  quality: number
  /** Longest side in pixels; 0 keeps the original size. */
  maxSide: number
  /** Largest file size in KB; 0 = off. Quality (and if needed size) is searched to fit. */
  targetKB?: number
}

export interface ImageResult {
  blob: Blob
  width: number
  height: number
  /** True when re-encoding did not help, so the original picture is returned, minus its metadata. */
  kept: boolean
  /** Target mode only: even the smallest attempt stayed above the limit. */
  overTarget?: boolean
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
export function outputType(file: File, format: OutFormat, targetKB = 0) {
  if (format === 'jpeg') return 'image/jpeg'
  if (format === 'webp') return canEncodeWebp() ? 'image/webp' : 'image/jpeg'
  // PNG ignores quality, so a size limit needs a lossy format.
  if (targetKB > 0 && file.type === 'image/png') return canEncodeWebp() ? 'image/webp' : 'image/jpeg'
  // "Same": keep JPEG/WebP/PNG; anything else (GIF, BMP, HEIC…) becomes JPEG.
  return file.type in EXTENSIONS ? file.type : 'image/jpeg'
}

export function outputName(file: File, type: string) {
  return file.name.replace(/\.[^.]+$/, '') + '.' + EXTENSIONS[type]
}

const MIN_QUALITY = 0.2
const MAX_QUALITY = 0.95
const SCALE_STEPS = [1, 0.85, 0.7, 0.55, 0.42, 0.32, 0.24, 0.17]

/**
 * Finds the best quality that keeps the file under `target` bytes. When even
 * the lowest quality is too big, the picture is scaled down step by step.
 */
async function fitToTarget(
  draw: (w: number, h: number) => HTMLCanvasElement,
  encode: (c: HTMLCanvasElement, quality: number) => Promise<Blob>,
  width: number,
  height: number,
  target: number,
) {
  let last = { blob: new Blob(), width, height, overTarget: true }
  for (const step of SCALE_STEPS) {
    const w = Math.max(1, Math.round(width * step))
    const h = Math.max(1, Math.round(height * step))
    const canvas = draw(w, h)
    try {
      const best = await encode(canvas, MAX_QUALITY)
      if (best.size <= target) return { blob: best, width: w, height: h, overTarget: false }
      const worst = await encode(canvas, MIN_QUALITY)
      last = { blob: worst, width: w, height: h, overTarget: true }
      if (worst.size > target) continue
      let lo = MIN_QUALITY
      let hi = MAX_QUALITY
      let fit = worst
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2
        const blob = await encode(canvas, mid)
        if (blob.size <= target) {
          fit = blob
          lo = mid
        } else hi = mid
      }
      return { blob: fit, width: w, height: h, overTarget: false }
    } finally {
      canvas.width = canvas.height = 0
    }
  }
  return last
}

export async function compressImage(file: File, opts: ImageOptions): Promise<ImageResult> {
  // 'from-image' applies EXIF rotation, so phone photos stay upright once the EXIF is gone.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = opts.maxSide ? Math.min(1, opts.maxSide / Math.max(bitmap.width, bitmap.height)) : 1
    let width = Math.max(1, Math.round(bitmap.width * scale))
    let height = Math.max(1, Math.round(bitmap.height * scale))
    const target = (opts.targetKB ?? 0) * 1024
    const type = outputType(file, opts.format, opts.targetKB ?? 0)

    const draw = (w: number, h: number) => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      if (type === 'image/jpeg') {
        // JPEG has no transparency: put transparent areas on white, not black.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
      }
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, w, h)
      return canvas
    }
    const encode = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
      new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), type, quality))

    let blob: Blob
    let overTarget = false
    if (target > 0) {
      const found = await fitToTarget(draw, encode, width, height, target)
      blob = found.blob
      width = found.width
      height = found.height
      overTarget = found.overTarget
    } else {
      const canvas = draw(width, height)
      blob = await encode(canvas, opts.quality)
      canvas.width = canvas.height = 0
    }

    // Same format and size but not smaller: the original was already well compressed.
    // It is kept without its metadata, so the GPS promise holds for kept files too.
    const original = scale === 1 && type === file.type && (target === 0 || file.size <= target) ? stripMetadata(new Uint8Array(await file.arrayBuffer())) : null
    if (original && blob.size >= original.length) return { blob: new Blob([original as BlobPart], { type }), width, height, kept: true }
    return { blob, width, height, kept: false, overTarget }
  } finally {
    bitmap.close()
  }
}
