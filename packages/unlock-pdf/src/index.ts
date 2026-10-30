// The headless API. The source lives with the site (src/tools/unlock-pdf/),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { encryptionInfo, unlockPdf } from '@chalidade/unlock-pdf'
//   const { needsPassword } = await encryptionInfo(bytes)
//   const open = await unlockPdf(bytes, needsPassword ? 'secret' : undefined)

export { encryptionInfo, unlockPdf, WrongPasswordError } from '@/tools/unlock-pdf/unlock'
