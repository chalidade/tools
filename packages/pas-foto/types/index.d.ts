// Public types of @chalidade/pas-foto. They mirror src/tools/pas-foto/
// and src/lib/image.ts; types/check.ts fails the build if they drift.

/** Print resolution of the photos and sheets. */
export declare const DPI = 300
/** Millimetres → pixels at 300 DPI. */
export declare const mmToPx: (mm: number) => number

export interface PhotoSize {
  id: string
  /** Width × height in cm, as people say it ("3×4"). */
  w: number
  h: number
}
/** 2×3, 3×4 and 4×6 cm. */
export declare const SIZES: PhotoSize[]

export interface Paper {
  id: string
  label: string
  /** Portrait width × height in mm. */
  w: number
  h: number
}
/** 4R (102×152 mm) and A4. */
export declare const PAPERS: Paper[]

export interface Sheet {
  /** Paper as laid out (landscape when that fits more photos). */
  paperW: number
  paperH: number
  cols: number
  rows: number
  /** Top-left corner of every photo, in mm. */
  cells: { x: number; y: number }[]
}

/** Packs up to `count` photos of photoW×photoH mm on the paper, in the orientation that fits more, centred. */
export declare function sheetLayout(paper: Paper, photoW: number, photoH: number, count: number, margin?: number, gap?: number): Sheet

/** The new backdrop colour, or 'keep' for the original. */
export type Bg = 'red' | 'blue' | 'white' | 'keep'
export declare const BG_COLOR: Record<Exclude<Bg, 'keep'>, string>

/**
 * Draws the photo into a W×H px frame (cover fit, then `zoom` and an offset
 * in px), and swaps the backdrop: a flood fill from the top edge with
 * `tolerance` 0–100 picks it, the soft edge is blended onto the colour.
 */
export declare function renderPhoto(
  img: DecodedImage,
  W: number,
  H: number,
  view: { zoom: number; ox: number; oy: number },
  bg: Bg,
  tolerance: number,
): HTMLCanvasElement

/** A picture decoded for drawing on a canvas. */
export interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  /** Frees the decoded pixels. */
  close: () => void
}
/** Decodes an image file (EXIF rotation applied, SVG supported). Rejects with UnreadableImageError. */
export declare function decodeImage(file: File): Promise<DecodedImage>
/** The browser could not decode the file. */
export declare class UnreadableImageError extends Error {}
