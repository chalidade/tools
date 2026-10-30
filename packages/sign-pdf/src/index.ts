// The headless API. The source lives with the site (src/tools/sign-pdf/),
// so the tool on chalidade.github.io/tools and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { readSignatureImage, signPdf } from '@chalidade/sign-pdf'
//   const signature = await readSignatureImage(photo, true)
//   const blob = await signPdf(file, signature, [{ id: 'a', page: 1, x: 0.6, y: 0.8, w: 0.25 }])

export { isPdfFile, LockedPdfError } from '@/lib/pdf-doc'
export { readSignatureImage, signPdf, trimToSignature, type Placement, type Signature } from '@/tools/sign-pdf/sign'
