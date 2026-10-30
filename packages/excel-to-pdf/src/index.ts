// The headless API. The source lives with the site (src/tools/excel-to-pdf/convert.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.

export {
  readSpreadsheet,
  buildPdf,
  pageFor,
  UnsupportedSheetError,
  type Spreadsheet,
  type Sheet,
  type SheetCell,
  type CellStyle,
  type PageSize,
  type Orientation,
  type PdfOptions,
} from '@/tools/excel-to-pdf/convert'
