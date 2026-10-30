// Public types of @chalidade/unit-converter. They mirror
// src/tools/unit-converter/units.ts; types/check.ts fails the build if they drift.

export type CategoryId = 'length' | 'weight' | 'area' | 'volume' | 'temperature' | 'speed' | 'data'

export interface Unit {
  /** Id used by convert(), e.g. 'km', 'ha', 'ons', 'tumbak'. */
  id: string
  /** [Indonesian, English] name. */
  name: [string, string]
  symbol: string
  /** How many base units one of this unit is (unused for temperature). */
  factor: number
}

export interface Category {
  id: CategoryId
  /** [Indonesian, English] label. */
  label: [string, string]
  units: Unit[]
}

/** Every category and its units. */
export declare const CATEGORIES: Category[]
/** Converts `value` between two unit ids of the same category. */
export declare function convert(cat: Category, value: number, from: string, to: string): number
/** Reads "1.5", "1,5" and "-3" (a decimal comma is fine); null when it is not a number. */
export declare function parseNumber(s: string): number | null
/** Up to 10 significant digits for a locale ('en-US', 'id-ID'); exponent notation for huge or tiny values. */
export declare function formatResult(n: number, loc: string): string
