// Public types of @chalidade/organize-pdf. They mirror src/tools/organize-pdf/organize.ts;
// types/check.ts fails the build if they drift.

/** True for a `.pdf` name or an `application/pdf` type. */
export declare function isPdfFile(file: File): boolean

/** The PDF needs a password to open. Unlock it first (e.g. with @chalidade/unlock-pdf). */
export declare class LockedPdfError extends Error {}

export interface PageItem {
  /** Unique key (for React and drag). */
  id: number
  /** Page index in the source file, 0-based. */
  src: number
  /** Extra clockwise rotation, a multiple of 90. */
  turn: number
}

/** A copy of `list` with the item at `from` moved to index `to`. */
export declare function moveItem<T>(list: T[], from: number, to: number): T[]
/** `turn` rotated a quarter turn, kept in 0–270. */
export declare function rotateBy(turn: number, delta: 90 | -90): number
/** A new PDF with the pages in `items` order: reordered, rotated, duplicated or left out. */
export declare function organizePdf(file: File, items: PageItem[]): Promise<Blob>
