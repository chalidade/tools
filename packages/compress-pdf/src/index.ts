// The headless API. The source lives with the site (src/tools/compress-pdf/),
// so the tool on chalidade.github.io/tools and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { compressPdf } from '@chalidade/compress-pdf'
//   const { output, before, after } = await compressPdf(bytes, 'medium', (stage) => {})

export { encryptionInfo } from '@/lib/qpdf'
export { compressPdf, type CompressResult, type Level } from '@/tools/compress-pdf/compress'
