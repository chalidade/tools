// The headless API. The source lives with the site (src/tools/organize-pdf/),
// so the tool on chalidade.github.io/tools and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { organizePdf } from '@chalidade/organize-pdf'
//   const blob = await organizePdf(file, [{ id: 1, src: 2, turn: 0 }, { id: 2, src: 0, turn: 90 }])

export { isPdfFile, LockedPdfError } from '@/lib/pdf-doc'
export { moveItem, organizePdf, rotateBy, type PageItem } from '@/tools/organize-pdf/organize'
