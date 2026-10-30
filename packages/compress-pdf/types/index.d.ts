// Public types of @chalidade/compress-pdf. They mirror src/tools/compress-pdf/compress.ts;
// types/check.ts fails the build if they drift.

/**
 * Whether the PDF is encrypted, read with qpdf. `needsPassword` is false for a
 * PDF that opens freely but carries print/copy/edit restrictions.
 */
export declare function encryptionInfo(input: Uint8Array): Promise<{ encrypted: boolean; needsPassword: boolean }>

/** light: photos up to 2400 px at JPEG 82 %, medium: 1600 px at 70 %, strong: 1100 px at 55 %. */
export type Level = 'light' | 'medium' | 'strong'

export interface CompressResult {
  /** The compressed PDF, or the input itself when nothing got smaller. */
  output: Uint8Array
  /** Sizes in bytes. */
  before: number
  after: number
  images: { found: number; shrunk: number }
}

/**
 * Re-encodes the PDF's JPEG photos smaller and repacks it with qpdf; text and
 * vector graphics are untouched. `onProgress` gets a readable stage message.
 */
export declare function compressPdf(input: Uint8Array, level: Level, onProgress: (stage: string) => void): Promise<CompressResult>
