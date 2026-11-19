// The headless API. The source lives with the site (src/tools/pdf-to-word/),
// so the tool on toowl.my.id and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { buildDocx, convertPdf } from '@chalidade/pdf-to-word'
//   const docx = await buildDocx(await convertPdf(file, (done, total) => {}))
//
// Same look as the PDF (text over the page drawing):
//   const docx = await buildLayoutDocx(await convertPdfLayout(file, (done, total) => {}))

export {
  buildDocx,
  convertPdf,
  LockedPdfError,
  paragraphsFromPages,
  ScannedPdfError,
  type Paragraph,
  type PdfConversion,
} from '@/tools/pdf-to-word/convert'
export {
  buildLayoutDocx,
  convertPdfLayout,
  type LayoutBlock,
  type LayoutConversion,
  type LayoutPage,
  type LayoutRun,
} from '@/tools/pdf-to-word/layout'
export { readPdfText, type PageText, type TextLine, type TextPiece } from '@/lib/pdf-text'
