// Public types of @chalidade/compress-image. They mirror src/tools/compress-image/compress.ts;
// types/check.ts fails the build if they drift.

/** 'same' keeps JPEG/WebP/PNG as they are and turns anything else (GIF, BMP…) into JPEG. */
export type OutFormat = 'same' | 'jpeg' | 'webp'

export interface ImageOptions {
  format: OutFormat
  /** 0–1, for JPEG and WebP. */
  quality: number
  /** Longest side in pixels; 0 keeps the original size. Never scales up. */
  maxSide: number
}

export interface ImageResult {
  blob: Blob
  width: number
  height: number
  /** True when re-encoding did not help, so the original picture is returned, minus its metadata. */
  kept: boolean
}

/**
 * Decodes (EXIF rotation applied), scales down and re-encodes one image.
 * The result never carries EXIF, GPS, XMP or IPTC metadata.
 */
export declare function compressImage(file: File, opts: ImageOptions): Promise<ImageResult>
/** The MIME type the image will be saved as (WebP falls back to JPEG where the browser cannot encode it). */
export declare function outputType(file: File, format: OutFormat): string
/** The file name with the extension of `type`. */
export declare function outputName(file: File, type: string): string
/** False in Safari before 16, which cannot encode WebP from a canvas. */
export declare function canEncodeWebp(): boolean
