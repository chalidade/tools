// The headless API. The source lives with the site (src/tools/crop-resize-image/crop.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { decodeImage, orient, fitRect, exportImage } from '@chalidade/crop-resize-image'
//   const img = await decodeImage(file)
//   const canvas = orient(img, { rotation: 90, flipX: false, flipY: false })
//   const crop = fitRect(canvas.width, canvas.height, 1)        // centred square
//   const blob = await exportImage(canvas, crop, { w: 512, h: 512 }, 'webp', 0.9)

export {
  orient,
  fitRect,
  dragRect,
  exportImage,
  type Rotation,
  type Orientation,
  type Rect,
  type Handle,
  type OutFormat,
} from '@/tools/crop-resize-image/crop'
export { decodeImage, UnreadableImageError, type DecodedImage } from '@/lib/image'
