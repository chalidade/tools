// Public types of @chalidade/remove-background. They mirror src/tools/remove-background/mask.ts;
// types/check.ts fails the build if they drift.
//
// A mask is one byte per pixel (Uint8Array of W*H): 255 = keep, 0 = removed,
// in between = partly transparent. A region is 0/1 per pixel. `rgba` is
// ImageData.data. Tolerances are 0–100.

export type Action = 'erase' | 'restore'

/** Magic wand: pixels connected to (x, y) whose colour is within `tolerance` of it. */
export declare function floodRegion(rgba: Uint8ClampedArray, W: number, H: number, x: number, y: number, tolerance: number): Uint8Array<ArrayBuffer>
/** Every pixel within `tolerance` of a colour, connected or not. */
export declare function colorRegion(rgba: Uint8ClampedArray, rgb: [number, number, number], tolerance: number): Uint8Array<ArrayBuffer>
/** Removes (or brings back) the pixels of a region. */
export declare function applyRegion(mask: Uint8Array, region: Uint8Array, action: Action): void
/** Applies a drawn selection with 0–255 anti-aliased `coverage`, to its inside or its outside. */
export declare function applyCoverage(mask: Uint8Array, coverage: Uint8Array, action: Action, inside: boolean): void
/** One round brush dab at (x, y), radius r, full strength inside hardness·r (hardness 0–1). */
export declare function stampBrush(mask: Uint8Array, W: number, H: number, x: number, y: number, r: number, hardness: number, action: Action): void
/** A brush stroke between two points. */
export declare function strokeBrush(
  mask: Uint8Array,
  W: number,
  H: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  r: number,
  hardness: number,
  action: Action,
): void
/** Swaps kept and removed. */
export declare function invert(mask: Uint8Array): void
/** Edge clean-up: shrink the edge by `shrink` px (drops halos), then feather it by `feather` px. Returns a new mask. */
export declare function refine(mask: Uint8Array, W: number, H: number, shrink: number, feather: number): Uint8Array
/** RGBA pixels with the mask applied as alpha ('result'), or with removed parts tinted red ('overlay'). */
export declare function compose(rgba: Uint8ClampedArray, alpha: Uint8Array, view: 'result' | 'overlay'): Uint8ClampedArray<ArrayBuffer>
