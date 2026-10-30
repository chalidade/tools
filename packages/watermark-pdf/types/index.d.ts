// Public types of @chalidade/watermark-pdf. They mirror src/tools/watermark-pdf/watermark.ts;
// types/check.ts fails the build if they drift.

/** True for a `.pdf` name or an `application/pdf` type. */
export declare function isPdfFile(file: File): boolean

/** The PDF needs a password to open. Unlock it first (e.g. with @chalidade/unlock-pdf). */
export declare class LockedPdfError extends Error {}

export type WatermarkSize = 'sm' | 'md' | 'lg'
export type WatermarkLayout = 'center' | 'tile'
export type WatermarkColor = 'gray' | 'red' | 'blue' | 'black'

export interface WatermarkImage {
  /** PNG bytes. */
  png: Uint8Array
  /** Object URL, for a preview. */
  url: string
  width: number
  height: number
}

export interface WatermarkOptions {
  kind: 'text' | 'image'
  /** Drawn in Helvetica Bold, which covers Latin text (check with measureText). */
  text: string
  /** Required when kind is "image". */
  image: WatermarkImage | null
  color: WatermarkColor
  /** 0–1. */
  opacity: number
  /** Degrees, counter-clockwise. */
  angle: number
  layout: WatermarkLayout
  size: WatermarkSize
}

/** One stamp: centre point in points, upright page space (origin bottom-left, y up). */
export interface Stamp {
  cx: number
  cy: number
}

export interface Layout {
  stamps: Stamp[]
  /** Text: font size and width. Image: drawn width and height. */
  size: number
  width: number
  height: number
}

/** Text width at 1 pt, or null when the built-in PDF font can't draw a character (emoji, CJK…). */
export declare function measureText(text: string): Promise<number | null>
/** Where the stamps go on a page of `w`×`h` points; the same math draws the PDF, so use it for previews. */
export declare function layoutWatermark(w: number, h: number, opts: WatermarkOptions, textWidth: number): Layout
/** Redraws any browser-readable image as PNG for an image watermark. */
export declare function readWatermarkImage(file: File): Promise<WatermarkImage>
/** The PDF with the watermark on every page. */
export declare function watermarkPdf(file: File, opts: WatermarkOptions, onProgress: (done: number, total: number) => void): Promise<Blob>
