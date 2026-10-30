// Public types of @chalidade/sign-pdf. They mirror src/tools/sign-pdf/sign.ts;
// types/check.ts fails the build if they drift.

/** True for a `.pdf` name or an `application/pdf` type. */
export declare function isPdfFile(file: File): boolean

/** The PDF needs a password to open. Unlock it first (e.g. with @chalidade/unlock-pdf). */
export declare class LockedPdfError extends Error {}

/** A signature image, trimmed to the ink. */
export interface Signature {
  png: Uint8Array
  /** Object URL, for a preview. */
  url: string
  width: number
  height: number
}

/**
 * One placed signature. Fractions (0–1) of the page as shown (after
 * rotation), measured from its top-left corner; height follows the image.
 */
export interface Placement {
  id: string
  /** 1-based. */
  page: number
  x: number
  y: number
  w: number
}

/** Crops a drawing canvas to its ink. Null when nothing is drawn. */
export declare function trimToSignature(source: HTMLCanvasElement): Promise<Signature | null>
/** Reads a photo or scan; `removeWhite` turns the paper transparent. Null when no ink is found. */
export declare function readSignatureImage(file: File, removeWhite: boolean): Promise<Signature | null>
/** The PDF with the signature drawn at each placement (an image, not a cryptographic signature). */
export declare function signPdf(file: File, signature: Signature, placements: Placement[]): Promise<Blob>
