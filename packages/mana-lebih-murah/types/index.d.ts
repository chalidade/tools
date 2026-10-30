// Public types of @chalidade/mana-lebih-murah. They mirror
// src/tools/mana-lebih-murah/unit-price.ts and parseNumber from
// src/tools/persen/percent.ts; types/check.ts fails the build if they drift.

export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'pcs'
export type Dimension = 'mass' | 'volume' | 'count'

/** Each unit's dimension and its size in the base unit (g, ml or pcs). */
export declare const UNITS: { value: Unit; dim: Dimension; factor: number }[]

export interface Pack {
  price: number
  /** Pieces in a pack (e.g. 6 cans). */
  count: number
  /** Size of one piece, in `unit`. */
  size: number
  unit: Unit
}

export interface Ranked {
  /** Price per 1 base unit (g, ml or pcs). */
  perBase: number
  dim: Dimension
}

export interface Comparison {
  /** Index of the cheapest pack among comparable ones, or -1. */
  best: number
  /** Percent more expensive than the cheapest, per index (0 for the best, null if unpriced). */
  extra: (number | null)[]
  /** True when packs of different dimensions (e.g. g vs ml) were mixed; only the first dimension is ranked. */
  mixed: boolean
}

/** Price per base unit; null unless price, count and size are all positive. */
export declare function unitPrice(p: Pack): Ranked | null
export declare function compare(packs: Pack[]): Comparison
/** The price in the unit people compare by: per 100 g, per kg, per 100 ml, per l, or per pcs. */
export declare function displayPrice(r: Ranked): { per: string; value: number }
/** Reads "1.500", "1,5", "1.500,5" and "1,500.5"; NaN for anything else. */
export declare function parseNumber(input: string): number
