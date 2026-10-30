// The headless API. The source lives with the site (src/tools/pdf-to-word/),
// so the tool on chalidade.github.io/tools and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { buildDocx, convertPdf } from '@chalidade/pdf-to-word'
//   const docx = await buildDocx(await convertPdf(file, (done, total) => {}))

export {
  buildDocx,
  convertPdf,
  LockedPdfError,
  paragraphsFromPages,
  ScannedPdfError,
  type Paragraph,
  type PdfConversion,
} from '@/tools/pdf-to-word/convert'
export { readPdfText, type PageText, type TextLine, type TextPiece } from '@/lib/pdf-text'
