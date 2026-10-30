// The headless API. The source lives with the site (src/tools/image-to-pdf/convert.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.

export {
  loadImage,
  rotateThumb,
  rotatedSize,
  layout,
  buildPdf,
  UnsupportedImageError,
  type ImageItem,
  type Rotation,
  type PageSize,
  type Orientation,
  type PdfOptions,
} from '@/tools/image-to-pdf/convert'
