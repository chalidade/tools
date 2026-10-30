// The headless API. The source lives with the site (src/tools/qr/),
// so the tool on chalidade.github.io/tools and this package are the same code.

export {
  qrMatrix,
  toSvg,
  toCanvas,
  LOGO_SHARE,
  type ErrorLevel,
  type ModuleStyle,
  type QrMatrix,
  type RenderOptions,
} from '@/tools/qr/render'
export {
  buildWifi,
  buildContact,
  buildWhatsApp,
  buildEmail,
  buildPhone,
  normalizeUrl,
  internationalPhone,
  type QrKind,
  type WifiFields,
  type ContactFields,
  type MessageFields,
} from '@/tools/qr/payload'
