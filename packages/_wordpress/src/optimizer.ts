// The image optimizer's engine, loaded by plugin/admin/optimizer.js only when
// an image is about to be uploaded. It is the site's own compress-image and
// convert-image code: decode in the browser, scale down, re-encode, drop the
// metadata (EXIF, GPS). The original never reaches the server.

import { compressImage, outputName, outputType } from '@/tools/compress-image/compress'
import { convertImage } from '@/tools/convert-image/convert'
import { isHeic } from '@/tools/convert-image/heic'
import { stripMetadata } from '@/tools/strip-exif/exif'

export interface OptimizeSettings {
  /** Longest side in pixels; 0 keeps the size. */
  maxSide: number
  /** 40–95. */
  quality: number
  /** Save JPEG and PNG as WebP. */
  webp: boolean
}

export interface Optimized {
  file: File
  before: number
  after: number
  /** The picture wasn't made smaller; `file` is the original minus its metadata. */
  kept: boolean
}

/** What the optimizer takes: JPEG, PNG, WebP and HEIC. GIF (may be animated), SVG and the rest go up untouched. */
export function canOptimize(file: File) {
  return /^image\/(jpeg|png|webp)$/.test(file.type) || isHeic(file)
}

export async function optimize(file: File, settings: OptimizeSettings): Promise<Optimized> {
  const quality = Math.min(95, Math.max(40, settings.quality)) / 100
  let source = file
  // HEIC (iPhone): many servers can't read it, so it goes up as JPEG (or WebP).
  if (isHeic(file)) {
    const { blob } = await convertImage(file, 'image/jpeg', 0.95)
    source = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified })
  }
  const format = settings.webp ? 'webp' : 'same'
  const result = await compressImage(source, { format, quality, maxSide: Math.max(0, settings.maxSide) })
  // Scaled down but bigger (a flat PNG re-encoded): keep the original's bytes, minus
  // metadata. (A rotated JPEG can't be stripped without turning it, so it stays re-encoded.)
  const bytes = !result.kept && source === file && result.blob.size >= file.size ? stripMetadata(new Uint8Array(await file.arrayBuffer())) : null
  if (bytes) {
    return { file: new File([bytes as BlobPart], file.name, { type: file.type, lastModified: file.lastModified }), before: file.size, after: bytes.length, kept: true }
  }
  const type = result.kept ? source.type : outputType(source, format)
  const name = result.kept ? source.name : outputName(source, type)
  return {
    file: new File([result.blob], name, { type, lastModified: file.lastModified }),
    before: file.size,
    after: result.blob.size,
    kept: result.kept && source === file,
  }
}
