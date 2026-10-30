// Public types of @chalidade/image-to-pdf. They mirror
// src/tools/image-to-pdf/convert.ts; types/check.ts fails the build if they drift.

export type Rotation = 0 | 90 | 180 | 270

export interface ImageItem {
  id: string
  file: File
  /** Decoded size in pixels, before rotation. */
  width: number
  height: number
  rotation: Rotation
  /** Small rotated preview, as a JPEG data URL. */
  thumb: string
}

/** 'fit' = each page takes its image's proportions. */
export type PageSize = 'a4' | 'letter' | 'fit'
export type Orientation = 'auto' | 'portrait' | 'landscape'

export interface PdfOptions {
  page: PageSize
  orientation: Orientation
  /** Space around the image, in points (72 per inch). */
  margin: number
}

/** The browser can't decode this file (e.g. HEIC outside Safari). */
export declare class UnsupportedImageError extends Error {
  fileName: string
  constructor(fileName: string)
}

/** Decodes a picture (EXIF rotation applied) and makes its preview. Browser only. */
export declare function loadImage(file: File): Promise<ImageItem>
/** A new preview for `item` turned to `next`. Set `rotation` on the item yourself. */
export declare function rotateThumb(item: ImageItem, next: Rotation): Promise<string>
/** [width, height] after the rotation. */
export declare function rotatedSize(item: Pick<ImageItem, 'width' | 'height' | 'rotation'>): number[]
/** Page size and image box in points, the same numbers the PDF uses. */
export declare function layout(
  item: Pick<ImageItem, 'width' | 'height' | 'rotation'>,
  opts: PdfOptions,
): { pageW: number; pageH: number; x: number; y: number; w: number; h: number }
/** One page per item, in order. PNGs stay lossless, other images become JPEG; long side capped at 3508 px. */
export declare function buildPdf(
  items: ImageItem[],
  opts: PdfOptions,
  onProgress: (done: number, total: number) => void,
): Promise<Blob>
