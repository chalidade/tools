// Public types of @chalidade/pdf-to-excel. They mirror src/tools/pdf-to-excel/convert.ts;
// types/check.ts fails the build if they drift.

/** The PDF needs a password to open. Unlock it first (e.g. with @chalidade/unlock-pdf). */
export declare class LockedPdfError extends Error {}

/** The PDF has (almost) no text layer: it is a scan or a picture. */
export declare class ScannedPdfError extends Error {}

export interface TextPiece {
  text: string
  /** Left/right edge and baseline in points; y is measured from the page top. */
  x: number
  right: number
  y: number
  size: number
  bold: boolean
  italic: boolean
  /** Family name as office apps know it, e.g. "Times New Roman"; "" when unknown. */
  font: string
}

export interface TextLine {
  /** Left to right. */
  pieces: TextPiece[]
  x: number
  right: number
  y: number
  size: number
}

/** One page's text layer, as pdf.js reads it. */
export interface PageText {
  /** Top to bottom. */
  lines: TextLine[]
  width: number
  height: number
}

export interface OutCell {
  text: string
  /** Set when the text is a number (currency, percent and thousands handled). */
  value?: number
  numFmt?: string
  bold: boolean
}

export interface OutRow {
  cells: (OutCell | null)[]
  /** Part of a detected table (gets borders), rather than a loose text line. */
  table: boolean
}

export interface OutSheet {
  name: string
  rows: OutRow[]
  columns: number
}

export interface PdfTables {
  sheets: OutSheet[]
  pages: number
  /** Tables found. */
  tables: number
}

/** One sheet for the whole PDF, or one sheet per page. */
export type SheetMode = 'merge' | 'per-page'

export interface AssembleOptions {
  mode: SheetMode
  /** Turn "Rp15.500.000", "1,234.50", "12,5%" into real numbers. */
  convertNumbers: boolean
}

export interface TableBlock {
  /** Line range on the page (indices into PageText.lines), inclusive. */
  start: number
  end: number
  rows: { texts: string[]; bold: boolean[] }[]
}

/**
 * Reads the text layer of every page with pdf.js, once; `assemble` can then
 * be re-run for any options. Throws LockedPdfError / ScannedPdfError.
 */
export declare function readPdf(file: File, onProgress: (done: number, total: number) => void): Promise<PageText[]>
/** Rows and columns rebuilt from where the text sits. */
export declare function assemble(pages: PageText[], opts: AssembleOptions): PdfTables
/** A page's tables: runs of lines that share column gutters. */
export declare function tableBlocks(page: PageText): TableBlock[]
/** The .xlsx file. */
export declare function buildXlsx(result: PdfTables): Promise<Blob>
