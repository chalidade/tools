// Public types of @chalidade/page-numbers. They mirror src/tools/page-numbers/numbers.ts;
// types/check.ts fails the build if they drift.

/** True for a `.pdf` name or an `application/pdf` type. */
export declare function isPdfFile(file: File): boolean

/** The PDF needs a password to open. Unlock it first (e.g. with @chalidade/unlock-pdf). */
export declare class LockedPdfError extends Error {}

/** "1", "1 / 10", "Page 1" ("Halaman 1" in Indonesian), "- 1 -". */
export type NumberFormat = 'plain' | 'of-total' | 'word' | 'dash'
export type VPos = 'top' | 'bottom'
export type HPos = 'left' | 'center' | 'right'

export interface NumberOptions {
  format: NumberFormat
  v: VPos
  h: HPos
  /** First page that gets a number, 1-based. */
  fromPage: number
  /** The number printed on that first page. */
  startAt: number
  /** Font size in points. */
  size: number
}

/** Text for number `n` when the last number is `total`. */
export declare function pageLabel(format: NumberFormat, n: number, total: number): string
/** Number printed on 1-based page `page`, or null when it comes before `fromPage`. */
export declare function numberFor(page: number, opts: NumberOptions): number | null
/** Baseline origin (points, from the bottom-left) of a label `width` points wide on a `w`×`h` page. */
export declare function labelOrigin(w: number, h: number, width: number, size: number, v: VPos, hp: HPos): { x: number; y: number }
/** The PDF with page numbers stamped on (Helvetica, dark grey). */
export declare function numberPdf(file: File, opts: NumberOptions, onProgress: (done: number, total: number) => void): Promise<Blob>
