// Public types of @chalidade/zakat. They mirror src/tools/zakat/zakat.ts;
// types/check.ts fails the build if they drift.
//
// Amounts are in whatever currency your prices are in (the tool uses rupiah).
// Prices are always passed in by you: nothing is fetched.

/** 2.5% */
export declare const RATE = 0.025
/** Nisab in grams of gold (85 g). */
export declare const GOLD_NISAB_G = 85
/** Nisab in grams of silver (595 g). */
export declare const SILVER_NISAB_G = 595
/** Zakat fitrah per person, kg of staple food (rice). */
export declare const FITRAH_RICE_KG = 2.5

export interface Outcome {
  nisab: number
  /** The amount judged against the nisab. */
  base: number
  reached: boolean
  /** 0 when the nisab is not reached. */
  zakat: number
}

/** Reads "1.500.000" (dots group thousands) and "1,5"; 0 for anything not a positive number. */
export declare const num: (s: string) => number
/** Zakat mal: net wealth (assets minus debts due) against 85 g of gold, held for a year. */
export declare function zakatMal(assets: number, debts: number, goldPrice: number): Outcome
/** Gold or silver held, judged by weight; the zakat is also given in grams. */
export declare function zakatMetal(grams: number, nisabGrams: number, pricePerGram: number): { nisabGrams: number; reached: boolean; zakatGrams: number; zakat: number }
/** Zakat on monthly income (minus instalments due), against a twelfth of the yearly gold nisab. */
export declare function zakatIncome(income: number, otherIncome: number, installment: number, goldPrice: number): Outcome
/** Zakat fitrah: 2.5 kg of rice per person, at your rice price. */
export declare function zakatFitrah(people: number, ricePerKg: number): { kg: number; zakat: number }
