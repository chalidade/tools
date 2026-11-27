// Compression on top of the converter's engine (convert.js): keep the format
// by default, optionally aim at a file size, and never hand back a bigger file.

import sharp from 'sharp'
import { convertImage } from './convert.js'

const SAME = { jpeg: 'jpg', jpg: 'jpg', png: 'png', webp: 'webp', avif: 'avif', heif: 'jpg', tiff: 'jpg', gif: 'gif', svg: 'png' }

async function sourceFormat(bytes) {
  try {
    return (await sharp(bytes, { failOn: 'none' }).metadata()).format ?? 'heif'
  } catch {
    return 'heif' // sharp's prebuilt libvips cannot read HEIC; convert.js decodes it
  }
}

/**
 * @param {Buffer} bytes
 * @param {{ format?: string, quality?: number, maxWidth?: number, maxHeight?: number, targetKb?: number,
 *           keepMetadata?: boolean, lossless?: boolean }} o
 */
export async function compressImage(bytes, o) {
  const inputFormat = await sourceFormat(bytes)
  const format = !o.format || o.format === 'same' ? (SAME[inputFormat] ?? 'jpg') : o.format
  const base = {
    format,
    width: o.maxWidth,
    height: o.maxHeight,
    fit: 'inside',
    withoutEnlargement: true,
    keepMetadata: o.keepMetadata,
    lossless: o.lossless,
  }

  let r
  let quality = o.quality ?? 75
  const target = (o.targetKb ?? 0) * 1024
  if (target && ['jpg', 'webp', 'avif', 'png'].includes(format) && !o.lossless) {
    // Binary search on quality for the best image under the target size.
    let lo = 5
    let hi = Math.min(95, o.quality ?? 85)
    let best = null
    for (let i = 0; i < 7 && lo <= hi; i++) {
      const q = Math.round((lo + hi) / 2)
      const c = await convertImage(bytes, { ...base, quality: q })
      if (c.output.length <= target) {
        best = { ...c, quality: q }
        lo = q + 1
      } else hi = q - 1
    }
    r = best ?? { ...(await convertImage(bytes, { ...base, quality: 5 })), quality: 5 }
    quality = r.quality
  } else {
    r = await convertImage(bytes, { ...base, quality })
  }

  // Same format, same size and already smaller than our result: keep the original.
  const keptOriginal = !o.maxWidth && !o.maxHeight && SAME[inputFormat] === format && inputFormat !== 'heif' && r.output.length >= bytes.length
  return {
    ...r,
    output: keptOriginal ? bytes : r.output,
    inputFormat,
    outputFormat: format,
    quality,
    keptOriginal,
    targetMet: target ? r.output.length <= target : undefined,
  }
}
