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

export interface LayoutRun {
  text: string
  size: number
  bold: boolean
  italic: boolean
  font: string
  /** 6-digit hex without '#'. */
  color: string
}

export interface LayoutBlock {
  /** Left edge and top of the first line, in points from the page's top-left. */
  x: number
  top: number
  width: number
  /** Baseline-to-baseline distance used for every line of the block. */
  pitch: number
  /** One entry per PDF line. */
  lines: LayoutRun[][]
  /** Per line: stretched to the block's full width, as in justified text. */
  justify: boolean[]
}

export interface LayoutPage {
  width: number
  height: number
  /** JPEG of the page without its text; absent when that is plain white. */
  background?: { data: Uint8Array; px: number; py: number }
  blocks: LayoutBlock[]
}

export interface LayoutConversion {
  pages: LayoutPage[]
  /** Text blocks in total, for the summary line. */
  blocks: number
}

/**
 * Reads the PDF for a Word file that looks like it: each page drawn without
 * its text (images, borders, colours), plus the text in positioned blocks.
 * Throws LockedPdfError / ScannedPdfError like convertPdf.
 */
export declare function convertPdfLayout(file: File, onProgress: (done: number, total: number) => void): Promise<LayoutConversion>
/** The .docx file: pages of the PDF's size, the page drawing behind, editable text in frames in front. */
export declare function buildLayoutDocx(conversion: LayoutConversion): Promise<Blob>
