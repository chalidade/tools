// Public types of @chalidade/terbilang. They mirror
// src/tools/terbilang/terbilang.ts; types/check.ts fails the build if they drift.

/** A number read by parseNumber(): digits as strings, so nothing is lost to floating point. */
export interface Parsed {
  negative: boolean
  /** Integer digits, without separators or leading zeros. */
  int: string
  /** Decimal digits ('' when none). */
  frac: string
}

export type Case = 'lower' | 'upper' | 'sentence' | 'title'

export interface Options {
  lang: 'id' | 'en'
  /** Read as rupiah: "… rupiah", decimals as two-digit "sen". */
  currency: boolean
  case: Case
}

/** Most integer digits supported (up to the quadrillions). */
export declare const MAX_DIGITS = 18
/**
 * Reads Indonesian style (1.234.567,89) and plain/English style (1234567.89,
 * 1,234,567.89). Returns null when the text is not a number or is too long.
 */
export declare function parseNumber(raw: string): Parsed | null
/** The number in words. */
export declare function toWords(p: Parsed, o: Options): string
/** Integer digits in words, lowercase ("seribu dua ratus", "one thousand two hundred"). */
export declare function integerWords(digits: string, lang: 'id' | 'en'): string
export declare function applyCase(s: string, c: Case): string
