// Public types of @chalidade/image-to-base64. They mirror
// src/tools/image-to-base64/base64.ts; types/check.ts fails the build if they drift.

/** A file's bytes as a data URL, unchanged (no re-encoding). Browser only. */
export declare function fileToDataUrl(file: File): Promise<string>
/** Fills in the MIME type of a data URL the browser left untyped, guessed from the file's first bytes. */
export declare function withMime(dataUrl: string, bytes: Uint8Array): string

export type SnippetKind = 'data-url' | 'base64' | 'html' | 'css' | 'markdown'

/** The data URL as a ready-to-paste snippet; `name` becomes the alt text. */
export declare function snippet(kind: SnippetKind, dataUrl: string, name: string): string
/** PNG, JPEG, GIF, WebP, AVIF, BMP, ICO or SVG from the first bytes, or null. */
export declare function sniffMime(b: Uint8Array): string | null

/** The input is not Base64 (or a data URL that isn't base64-encoded). */
export declare class NotBase64Error extends Error {}
/** Valid Base64, but the bytes are not a known image format. */
export declare class NotImageError extends Error {}

/**
 * A data URL or bare Base64 (standard or URL-safe, line breaks and padding
 * optional, even wrapped in quotes or url(…)) → the image. The type comes from
 * the bytes, not from what the data URL claims.
 */
export declare function decodeBase64Image(input: string): { blob: Blob; mime: string; ext: string; size: number }
