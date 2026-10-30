// The headless API. The source lives with the site (src/tools/pdf-to-excel/),
// so the tool on chalidade.github.io/tools and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { assemble, buildXlsx, readPdf } from '@chalidade/pdf-to-excel'
//   const pages = await readPdf(file, () => {})
//   const xlsx = await buildXlsx(assemble(pages, { mode: 'merge', convertNumbers: true }))

export {
  assemble,
  buildXlsx,
  LockedPdfError,
  readPdf,
  ScannedPdfError,
  tableBlocks,
  type AssembleOptions,
  type OutCell,
  type OutRow,
  type OutSheet,
  type PageText,
  type PdfTables,
  type SheetMode,
  type TableBlock,
} from '@/tools/pdf-to-excel/convert'
export type { TextLine, TextPiece } from '@/lib/pdf-text'
