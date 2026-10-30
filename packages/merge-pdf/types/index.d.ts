// Public types of @chalidade/merge-pdf. They mirror src/tools/merge-pdf/merge.ts;
// types/check.ts fails the build if they drift.

/** True for a `.pdf` name or an `application/pdf` type. */
export declare function isPdfFile(file: File): boolean

/** The PDF needs a password to open. Unlock it first (e.g. with @chalidade/unlock-pdf). */
export declare class LockedPdfError extends Error {}

export interface PdfItem {
  id: string
  file: File
  /** Page count. */
  pages: number
  /** First page preview, a JPEG data URL. */
  thumb: string
}

/** Page count and first-page preview, for building your own file list. Throws on locked or broken files. */
export declare function loadPdfItem(file: File): Promise<PdfItem>
/**
 * Every page of each file, in order, in one new PDF. Owner-restricted PDFs are
 * decrypted on the way in; one that needs a password throws LockedPdfError.
 */
export declare function mergePdfs(items: Pick<PdfItem, 'file'>[], onProgress: (done: number, total: number) => void): Promise<Blob>
