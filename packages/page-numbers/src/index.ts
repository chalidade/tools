// The headless API. The source lives with the site (src/tools/page-numbers/),
// so the tool on chalidade.github.io/tools and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { numberPdf } from '@chalidade/page-numbers'
//   const blob = await numberPdf(file, { format: 'of-total', v: 'bottom', h: 'center', fromPage: 1, startAt: 1, size: 11 }, () => {})

export { isPdfFile, LockedPdfError } from '@/lib/pdf-doc'
export {
  labelOrigin,
  numberFor,
  numberPdf,
  pageLabel,
  type HPos,
  type NumberFormat,
  type NumberOptions,
  type VPos,
} from '@/tools/page-numbers/numbers'
