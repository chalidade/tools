// Public types of @chalidade/excel-to-pdf. They mirror
// src/tools/excel-to-pdf/convert.ts; types/check.ts fails the build if they drift.

export interface CellStyle {
  bold: boolean
  italic: boolean
  underline: boolean
  /** Font size in points. */
  size: number
  /** Hex colors, e.g. "#1f2937"; undefined = default. */
  color?: string
  fill?: string
  align: 'left' | 'center' | 'right'
  valign: 'top' | 'middle' | 'bottom'
  wrap: boolean
  border: { top: boolean; right: boolean; bottom: boolean; left: boolean }
}

export interface SheetCell {
  /** The text Excel shows (number formats applied). */
  text: string
  style: CellStyle
  colSpan?: number
  rowSpan?: number
  /** Covered by a merged cell that starts elsewhere; not drawn. */
  covered?: boolean
}

export interface Sheet {
  name: string
  rows: SheetCell[][]
  /** Column widths in points. */
  colWidths: number[]
  /** Row heights in points (undefined = automatic). */
  rowHeights: (number | undefined)[]
}

export interface Spreadsheet {
  sheets: Sheet[]
}

/** Not a readable workbook, every sheet is empty, or a sheet spans more than 2 million cells. */
export declare class UnsupportedSheetError extends Error {}

/** Reads an .xlsx (ExcelJS) or .csv: visible sheets, values as displayed, styles and merges. Hidden rows and columns are skipped. */
export declare function readSpreadsheet(file: File): Promise<Spreadsheet>

export type PageSize = 'a4' | 'letter'
export type Orientation = 'auto' | 'portrait' | 'landscape'

export interface PdfOptions {
  page: PageSize
  orientation: Orientation
  /** Shrink each sheet to the page width (true) or keep its real size and spill onto extra pages. */
  fitWidth: boolean
  gridlines: boolean
}

/** Page size for a sheet, and how much it shrinks to fit (1 = not at all). */
export declare function pageFor(sheet: Sheet, opts: PdfOptions): { pageW: number; pageH: number; landscape: boolean; scale: number }
/** A PDF with real, selectable text (jsPDF + autotable), each sheet starting on a new page. */
export declare function buildPdf(
  sheets: Sheet[],
  opts: PdfOptions,
  onProgress: (done: number, total: number) => void,
): Promise<Blob>
