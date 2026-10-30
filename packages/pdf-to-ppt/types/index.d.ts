// Public types of @chalidade/pdf-to-ppt. They mirror src/tools/pdf-to-ppt/convert.ts;
// types/check.ts fails the build if they drift.

/** The PDF needs a password to open. Unlock it first (e.g. with @chalidade/unlock-pdf). */
export declare class LockedPdfError extends Error {}

export interface TextBox {
  text: string
  /** Top-left and size in points. */
  x: number
  y: number
  w: number
  h: number
  size: number
  bold: boolean
  italic: boolean
  font: string
  /** "RRGGBB" */
  color: string
}

export interface SlidePage {
  /** Page size in points. */
  width: number
  height: number
  /** The page as the PDF draws it (JPEG data URL, 144 dpi). */
  image: string
  /** The page with its text left out: the editable slide's background. */
  background: string
  boxes: TextBox[]
}

/** "editable": background image plus real text boxes. "image": one picture per slide. */
export type SlideMode = 'editable' | 'image'

/** Renders every page and reads its text. Throws LockedPdfError for a password-protected PDF. */
export declare function readPdfPages(file: File, onProgress: (done: number, total: number) => void): Promise<SlidePage[]>
/** The .pptx file, one slide per page. */
export declare function buildPptx(pages: SlidePage[], mode: SlideMode): Promise<Blob>
