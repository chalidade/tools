// The headless API. The source lives with the site (src/tools/protect-pdf/),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { protectPdf } from '@chalidade/protect-pdf'
//   const locked = await protectPdf(bytes, 'secret', { print: true, copy: false, modify: false })

export { AlreadyEncryptedError, encryptionInfo, protectPdf, type Permission } from '@/tools/protect-pdf/protect'
