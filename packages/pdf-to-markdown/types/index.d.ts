// Public types of @chalidade/pdf-to-markdown. They mirror src/tools/pdf-to-markdown/convert.ts;
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

/**
 * Reads the text layer of every page with pdf.js. Throws LockedPdfError for a
 * password-protected PDF and ScannedPdfError when there is (almost) no text.
 */
export declare function readPdfText(file: File, onProgress: (done: number, total: number) => void): Promise<PageText[]>
/** Markdown from the pages: headings by size, **bold** / *italic*, lists and tables. `pageBreaks` puts `---` between pages. */
export declare function toMarkdown(pages: PageText[], opts: { pageBreaks: boolean }): string
