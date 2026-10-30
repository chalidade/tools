// Public types of @chalidade/color-picker. They mirror
// src/tools/color-picker/color.ts; types/check.ts fails the build if they drift.

/** sRGB, each channel 0–255 (may be fractional). */
export interface RGB {
  r: number
  g: number
  b: number
}

/** "#rrggbb", lowercase. */
export declare function toHex({ r, g, b }: RGB): string
/** h 0–360, s and l 0–100. */
export declare function toHsl({ r, g, b }: RGB): { h: number; s: number; l: number }
export declare function fromHsl(h: number, s: number, l: number): RGB
/** h 0–360, s and v 0–100. */
export declare function toHsv({ r, g, b }: RGB): { h: number; s: number; v: number }
/** Each 0–100 (naive conversion, no ICC profile). */
export declare function toCmyk({ r, g, b }: RGB): { c: number; m: number; y: number; k: number }
/** OKLCH: l 0–1, c ≈ 0–0.4, h 0–360. */
export declare function toOklch({ r, g, b }: RGB): { l: number; c: number; h: number }

/** The Tailwind-style steps `colorScale` returns, in order. */
export declare const SCALE_STEPS: readonly [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
/** 11 shades (50…950) with the color's hue and chroma, evenly spaced in perceived lightness, kept inside sRGB. */
export declare function colorScale(rgb: RGB): RGB[]

/** WCAG relative luminance, 0–1. */
export declare function luminance({ r, g, b }: RGB): number
/** WCAG 2.x contrast ratio, 1–21. AA body text needs 4.5. */
export declare function contrast(a: RGB, b: RGB): number

/** The color as HEX, RGB, HSL, OKLCH, HSV, CMYK and Flutter strings. */
export declare function formats(rgb: RGB): { label: string; value: string }[]
/** Reads HEX (#rgb, #rrggbb, with or without #), rgb(), hsl(), oklch(), or "r, g, b". Null when unrecognised. */
export declare function parseColor(input: string): RGB | null
/** The `count` main colors of RGBA pixels (median-cut style), most common first. Transparent pixels are skipped. */
export declare function extractPalette(data: Uint8ClampedArray, count?: number): RGB[]
