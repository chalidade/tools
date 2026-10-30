// The headless API. The source lives with the site (src/tools/image-to-base64/base64.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.

export {
  fileToDataUrl,
  withMime,
  snippet,
  sniffMime,
  decodeBase64Image,
  NotBase64Error,
  NotImageError,
  type SnippetKind,
} from '@/tools/image-to-base64/base64'
