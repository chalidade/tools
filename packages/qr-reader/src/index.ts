// The headless API. The source lives with the site (src/tools/qr/),
// so the tool on chalidade.github.io/tools and this package are the same code.

export { scanFile, scanPixels, formatName, isQrLike, UnreadableImageError, type Scan } from '@/tools/qr/scan'
export { parseQr, type ParsedQr, type QrKind } from '@/tools/qr/payload'
