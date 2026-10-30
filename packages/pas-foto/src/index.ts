// The headless API. The source lives with the site (src/tools/pas-foto/),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { decodeImage, renderPhoto, mmToPx, sheetLayout, PAPERS } from '@chalidade/pas-foto'
//   const photo = renderPhoto(await decodeImage(file), mmToPx(30), mmToPx(40), { zoom: 1, ox: 0, oy: 0 }, 'red', 20)
//   const sheet = sheetLayout(PAPERS[0], 30, 40, 8)   // where 8 photos of 3×4 cm go on 4R paper

export { DPI, mmToPx, SIZES, PAPERS, sheetLayout, type PhotoSize, type Paper, type Sheet } from '@/tools/pas-foto/layout'
export { renderPhoto, BG_COLOR, type Bg } from '@/tools/pas-foto/photo'
export { decodeImage, UnreadableImageError, type DecodedImage } from '@/lib/image'
