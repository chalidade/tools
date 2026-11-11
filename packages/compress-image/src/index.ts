// The headless API. The source lives with the site (src/tools/compress-image/compress.ts),
// so the tool on toowl.my.id and this package are the same code.
//
//   import { compressImage } from '@chalidade/compress-image'
//   const { blob, width, height } = await compressImage(file, { format: 'webp', quality: 0.75, maxSide: 1920 })

export {
  compressImage,
  outputType,
  outputName,
  canEncodeWebp,
  type OutFormat,
  type ImageOptions,
  type ImageResult,
} from '@/tools/compress-image/compress'
