// Public types of @chalidade/pdf-to-word. They mirror src/tools/pdf-to-word/convert.ts;
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

/** A run of text in one style. */
export interface Run {
  /** May contain tabs, for "label ⇥ date" lines. */
  text: string
  size: number
  bold: boolean
  italic: boolean
  /** Family name as Word knows it; "" when unknown. */
  font: string
}

export interface Paragraph {
  runs: Run[]
  align: 'left' | 'center'
  /** Left indent relative to the page's text margin, in points. */
  indent: number
  pageBreakBefore: boolean
  /** Page (0-based) and the index of the paragraph's first line on it. */
  page: number
  line: number
}

export interface PdfConversion {
  paragraphs: Paragraph[]
  pages: number
  /** Page size and text margins of the first page, in points. */
  page: { width: number; height: number; marginLeft: number; marginRight: number; marginTop: number; marginBottom: number }
}

/**
 * Reads the text layer of every page with pdf.js. Throws LockedPdfError for a
 * password-protected PDF and ScannedPdfError when there is (almost) no text.
 */
export declare function readPdfText(file: File, onProgress: (done: number, total: number) => void): Promise<PageText[]>
/** Reads the PDF and rebuilds its paragraphs. */
export declare function convertPdf(file: File, onProgress: (done: number, total: number) => void): Promise<PdfConversion>
/** Paragraphs from already-read pages; `skip` leaves lines out. */
export declare function paragraphsFromPages(textPages: PageText[], skip?: (page: number, line: number) => boolean): PdfConversion
/** The .docx file. */
export declare function buildDocx(conversion: PdfConversion): Promise<Blob>
