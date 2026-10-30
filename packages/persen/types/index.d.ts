// Public types of @chalidade/persen. They mirror src/tools/persen/percent.ts;
// types/check.ts fails the build if they drift. No rounding: format the results yourself.

export interface DiscountStep {
  percent: number
  /** Price before this step and after it. */
  from: number
  to: number
  saved: number
}

export interface Discounts {
  steps: DiscountStep[]
  final: number
  saved: number
  /** Combined discount in percent: 50% then 20% is 60%, not 70%. */
  combined: number
}

/** The number itself, or null for NaN / Infinity. */
export declare const finite: (n: number) => number | null
/** X% of Y. */
export declare const percentOf: (x: number, y: number) => number | null
/** Y is what percent of Z; null when Z is 0. */
export declare const whatPercent: (y: number, z: number) => number | null
/** Change from a to b in percent (positive = increase); null when a is 0. */
export declare const percentChange: (a: number, b: number) => number | null
/** Successive discounts, each applied to the price left by the previous one. */
export declare function stackedDiscount(price: number, percents: number[]): Discounts
/**
 * Reads "1.500,5", "1,500.5", "12,5" and "-3". The last separator is the decimal
 * point unless exactly three digits follow it (then it groups thousands, so
 * "1.500" is 1500). NaN for anything else.
 */
export declare function parseNumber(input: string): number
