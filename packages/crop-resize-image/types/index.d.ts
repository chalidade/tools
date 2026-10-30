// Public types of @chalidade/crop-resize-image. They mirror src/tools/crop-resize-image/crop.ts
// and src/lib/image.ts; types/check.ts fails the build if they drift.

export type Rotation = 0 | 90 | 180 | 270

export interface Orientation {
  rotation: Rotation
  flipX: boolean
  flipY: boolean
}

/** A rectangle in pixels of the oriented (rotated/flipped) image. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** What is being dragged: the whole box, an edge or a corner. */
export type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export type OutFormat = 'png' | 'jpeg' | 'webp'

/** Draws the image rotated and flipped, at full size. */
export declare function orient(image: DecodedImage, o: Orientation): HTMLCanvasElement
/** The largest rectangle of `ratio` (width / height) centred in a W×H image; the whole image when ratio is null. */
export declare function fitRect(W: number, H: number, ratio: number | null): Rect
/** The crop box after dragging `handle` by (dx, dy) pixels from `start`, kept inside W×H and at `ratio`. */
export declare function dragRect(start: Rect, handle: Handle, dx: number, dy: number, ratio: number | null, W: number, H: number): Rect
/** Cuts `crop` out of the oriented canvas, scales it to `size` and encodes it. `quality` 0–1 is ignored for PNG. */
export declare function exportImage(
  oriented: HTMLCanvasElement,
  crop: Rect,
  size: { w: number; h: number },
  format: OutFormat,
  quality: number,
): Promise<Blob>

/** A picture decoded for drawing on a canvas. */
export interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  /** Frees the decoded pixels. */
  close: () => void
}
/** Decodes an image file (EXIF rotation applied, SVG supported). Rejects with UnreadableImageError. */
export declare function decodeImage(file: File): Promise<DecodedImage>
/** The browser could not decode the file. */
export declare class UnreadableImageError extends Error {}
