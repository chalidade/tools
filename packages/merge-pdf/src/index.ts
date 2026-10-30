// The headless API. The source lives with the site (src/tools/merge-pdf/),
// so the tool on chalidade.github.io/tools and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { mergePdfs } from '@chalidade/merge-pdf'
//   const blob = await mergePdfs([{ file: a }, { file: b }], (done, total) => {})

export { isPdfFile, LockedPdfError } from '@/lib/pdf-doc'
export { loadPdfItem, mergePdfs, type PdfItem } from '@/tools/merge-pdf/merge'
