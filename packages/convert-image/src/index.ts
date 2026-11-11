// The headless API. The source lives with the site (src/tools/convert-image/),
// so the tool on toowl.my.id and this package are the same code.
//
//   import { convertImage, targetName } from '@chalidade/convert-image'
//   const { blob } = await convertImage(file, 'image/jpeg', 0.9)   // HEIC, WebP, AVIF, PNG… → JPG
//   targetName(file, 'image/jpeg')                                  // "IMG_0001.jpg"

export { convertImage, targetName, type Target, type Converted } from '@/tools/convert-image/convert'
export { isHeic, decodeHeic } from '@/tools/convert-image/heic'
