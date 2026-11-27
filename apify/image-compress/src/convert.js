// Converts, resizes and compresses one image with sharp (libvips). HEIC/HEIF
// photos (iPhone) are decoded with libheif compiled to wasm, because sharp's
// prebuilt libvips only reads AVIF out of the HEIF family.

import { createRequire } from 'node:module'
import sharp from 'sharp'

const require = createRequire(import.meta.url)

export const FORMATS = {
  jpg: { mime: 'image/jpeg', ext: 'jpg' },
  png: { mime: 'image/png', ext: 'png' },
  webp: { mime: 'image/webp', ext: 'webp' },
  avif: { mime: 'image/avif', ext: 'avif' },
  tiff: { mime: 'image/tiff', ext: 'tiff' },
  gif: { mime: 'image/gif', ext: 'gif' },
}

let heif
function libheif() {
  heif ??= require('libheif-js/wasm-bundle')
  return heif
}

const isHeic = (bytes) => {
  // ISO-BMFF "ftyp" box with a HEIC-family brand
  if (bytes.length < 12 || bytes.toString('latin1', 4, 8) !== 'ftyp') return false
  const brands = bytes.toString('latin1', 8, Math.min(bytes.length, 64))
  return /hei[cfsmx]|hevc|hevx|mif1|msf1/.test(brands) && !/avif|avis/.test(brands.slice(0, 4))
}

async function decodeHeic(bytes) {
  const { HeifDecoder } = libheif()
  const [image] = new HeifDecoder().decode(bytes)
  if (!image) throw new Error('Could not decode this HEIC/HEIF file.')
  const width = image.get_width()
  const height = image.get_height()
  const data = new Uint8ClampedArray(width * height * 4)
  await new Promise((resolve, reject) =>
    image.display({ data, width, height }, (out) => (out ? resolve() : reject(new Error('Could not decode this HEIC/HEIF file.')))),
  )
  return sharp(Buffer.from(data.buffer), { raw: { width, height, channels: 4 } })
}

/**
 * @param {Buffer} bytes
 * @param {{ format: keyof FORMATS, quality?: number, width?: number, height?: number, fit?: string,
 *           withoutEnlargement?: boolean, background?: string, keepMetadata?: boolean, lossless?: boolean }} o
 */
export async function convertImage(bytes, o) {
  const target = FORMATS[o.format] ?? FORMATS.webp
  const quality = o.quality ?? 80
  const fromHeic = isHeic(bytes)

  let img = fromHeic
    ? await decodeHeic(bytes)
    : sharp(bytes, { failOn: 'none', animated: o.format === 'gif' || o.format === 'webp', limitInputPixels: 268_402_689 })
  const meta = fromHeic ? null : await img.metadata()
  if (!fromHeic) img = img.rotate() // apply EXIF orientation before metadata is dropped

  if (o.width || o.height) {
    img = img.resize({
      width: o.width || undefined,
      height: o.height || undefined,
      fit: o.fit ?? 'inside',
      withoutEnlargement: o.withoutEnlargement ?? true,
      background: o.background ?? '#ffffff',
    })
  }
  if (o.format === 'jpg') img = img.flatten({ background: o.background ?? '#ffffff' })
  if (o.keepMetadata) img = img.keepMetadata()

  switch (o.format) {
    case 'jpg': img = img.jpeg({ quality, mozjpeg: true }); break
    case 'png': img = img.png({ compressionLevel: 9, palette: !o.lossless && quality < 100, quality, effort: 7 }); break
    case 'webp': img = img.webp({ quality, lossless: !!o.lossless, effort: 5 }); break
    case 'avif': img = img.avif({ quality: Math.max(1, quality - 15), lossless: !!o.lossless, effort: 4 }); break
    case 'tiff': img = img.tiff({ quality, compression: o.lossless ? 'lzw' : 'jpeg' }); break
    case 'gif': img = img.gif({ effort: 7 }); break
    default: throw new Error(`Unknown output format "${o.format}".`)
  }

  const { data, info } = await img.toBuffer({ resolveWithObject: true })
  return {
    output: data,
    mime: target.mime,
    ext: target.ext,
    inputFormat: fromHeic ? 'heif' : meta?.format,
    width: info.width,
    height: info.pageHeight && info.pages > 1 ? info.pageHeight : info.height,
    frames: info.pages ?? 1,
  }
}
