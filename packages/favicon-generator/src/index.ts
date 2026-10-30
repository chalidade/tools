// The headless API. The source lives with the site (src/tools/favicon-generator/favicon.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.

export {
  drawIcon,
  buildIco,
  buildFaviconZip,
  HTML_SNIPPET,
  type FaviconOptions,
  type Shape,
  type Fit,
} from '@/tools/favicon-generator/favicon'
export { decodeImage, UnreadableImageError, type DecodedImage } from '@/lib/image'
