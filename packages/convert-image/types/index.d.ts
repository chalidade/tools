// Public types of @chalidade/convert-image. They mirror src/tools/convert-image/;
// types/check.ts fails the build if they drift.

export type Target = 'image/jpeg' | 'image/png' | 'image/webp'

export interface Converted {
  blob: Blob
  width: number
  height: number
}

/**
 * Any image the browser can decode, plus HEIC/HEIF (via libheif wasm,
 * loaded on first use), → JPEG, PNG or WebP. JPEG has no transparency, so
 * it is flattened onto white. `quality` 0–1 is ignored for PNG.
 */
export declare function convertImage(file: File, target: Target, quality: number): Promise<Converted>
/** The file name with the target's extension: "IMG_0001.heic" → "IMG_0001.jpg". */
export declare function targetName(file: File, target: Target): string
/** By MIME type or .heic/.heif extension. */
export declare function isHeic(file: File): boolean
/** Decodes the first image of a HEIC file into canvas-ready pixels. */
export declare function decodeHeic(file: File): Promise<ImageData>
