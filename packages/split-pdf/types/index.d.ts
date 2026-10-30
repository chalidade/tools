// Public types of @chalidade/split-pdf. They mirror src/tools/split-pdf/split.ts;
// types/check.ts fails the build if they drift.

/** True for a `.pdf` name or an `application/pdf` type. */
export declare function isPdfFile(file: File): boolean

/** The PDF needs a password to open. Unlock it first (e.g. with @chalidade/unlock-pdf). */
export declare class LockedPdfError extends Error {}

/** A run of pages to save as one file; 1-based, in reading order. */
export type PageGroup = number[]

/**
 * "1-3, 5, 8-" → [[1,2,3],[5],[8..count]]. Returns an error message (a string)
 * instead when a part is not a page or range inside the document.
 */
export declare function parseRanges(text: string, count: number): PageGroup[] | string
/** Every `size` pages: 10 pages by 3 → [1-3], [4-6], [7-9], [10]. */
export declare function chunkPages(count: number, size: number): PageGroup[]
/** One PDF per group: the PDF itself for one group, a ZIP for several. */
export declare function splitPdf(
  file: File,
  groups: PageGroup[],
  baseName: string,
  onProgress: (done: number, total: number) => void,
): Promise<{ blob: Blob; fileName: string }>
