// Public types of @chalidade/favicon-generator. They mirror
// src/tools/favicon-generator/favicon.ts and src/lib/image.ts;
// types/check.ts fails the build if they drift.

/** A decoded picture, ready to draw on a canvas. */
export interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  /** Frees the decoded pixels. */
  close: () => void
}

/** Thrown by `decodeImage` when the browser can't read the file. */
export declare class UnreadableImageError extends Error {}

/** Decodes an image file (PNG, JPG, WebP, SVG…) with its EXIF rotation applied. Browser only. */
export declare function decodeImage(file: File): Promise<DecodedImage>

export type Shape = 'square' | 'rounded' | 'circle'
export type Fit = 'contain' | 'cover'

export interface FaviconOptions {
  /** Image to draw, or null to draw `text`. */
  image: DecodedImage | null
  /** A letter or emoji, used when `image` is null. */
  text: string
  textColor: string
  /** null = transparent. */
  background: string | null
  shape: Shape
  fit: Fit
  /** Empty space around the artwork, as a fraction of the icon size (0–0.5). */
  padding: number
}

/** Draws the icon at `size` × `size` px. `forceBackground` fills transparency (iOS shows it black otherwise). */
export declare function drawIcon(size: number, opts: FaviconOptions, forceBackground?: string): HTMLCanvasElement
/** Packs PNG files into one .ico (PNG-in-ICO, read by every current browser). */
export declare function buildIco(pngs: { size: number; data: Uint8Array }[]): Uint8Array<ArrayBuffer>
/**
 * favicon.zip: favicon.ico (16/32/48), PNG 16 and 32, apple-touch-icon 180,
 * android-chrome 192 and 512, site.webmanifest and an HTML snippet.
 */
export declare function buildFaviconZip(opts: FaviconOptions, appName: string, themeColor: string): Promise<Blob>
/** The <link> tags for the files in the zip. */
export declare const HTML_SNIPPET: string
