// Public types of @chalidade/pdf-to-image. They mirror src/tools/pdf-to-image/convert.ts;
// types/check.ts fails the build if they drift.

/** The PDF needs a password to open. Unlock it first (e.g. with @chalidade/unlock-pdf). */
export declare class LockedPdfError extends Error {}

export type ImageFormat = 'png' | 'jpg'

export interface PdfPages {
  /** Small JPEG previews (data URLs), one per page. */
  thumbs: string[]
}

/** A small preview of every page. Throws LockedPdfError for a password-protected PDF. */
export declare function openPdf(file: File, onProgress: (done: number, total: number) => void): Promise<PdfPages>
/**
 * Renders the chosen 1-based pages at `dpi`. One page returns that image;
 * several return a ZIP with one image per page.
 */
export declare function exportImages(
  file: File,
  pages: number[],
  opts: { dpi: number; format: ImageFormat; baseName: string },
  onProgress: (done: number, total: number) => void,
): Promise<{ blob: Blob; fileName: string }>
