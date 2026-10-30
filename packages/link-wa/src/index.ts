// The headless API. The source lives with the site (src/tools/qr/payload.ts, shared with the QR generator),
// so the tool on chalidade.github.io/tools and this package are the same code.

export { buildWhatsApp, internationalPhone, type MessageFields } from '@/tools/qr/payload'
