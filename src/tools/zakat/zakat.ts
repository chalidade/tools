// Zakat rules follow the commonly used Baznas / Kemenag guidance: 2.5% of
// qualifying wealth once it reaches the nisab (85 g of gold) and has been held
// for a year (haul). Prices are entered by the user, never fetched.

import { parseNumber } from '@/tools/persen/percent'

export const RATE = 0.025
export const GOLD_NISAB_G = 85
export const SILVER_NISAB_G = 595
export const FITRAH_RICE_KG = 2.5

/** "1.500.000", "1,500,000", "2,5" or "2.5"; 0 for anything not a positive number. */
export const num = (s: string): number => {
  const n = parseNumber(s)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export interface Outcome {
  nisab: number
  base: number
  reached: boolean
  zakat: number
}

const outcome = (base: number, nisab: number): Outcome => {
  const reached = nisab > 0 && base >= nisab
  return { nisab, base, reached, zakat: reached ? base * RATE : 0 }
}

/** Zakat mal: net wealth (assets minus debts due) against the gold nisab. */
export function zakatMal(assets: number, debts: number, goldPrice: number): Outcome {
  return outcome(Math.max(0, assets - debts), GOLD_NISAB_G * goldPrice)
}

/** Gold or silver held: judged by weight; the zakat is also given in grams. */
export function zakatMetal(grams: number, nisabGrams: number, pricePerGram: number) {
  const reached = grams >= nisabGrams
  const zakatGrams = reached ? grams * RATE : 0
  return { nisabGrams, reached, zakatGrams, zakat: zakatGrams * pricePerGram }
}

/**
 * Zakat penghasilan (income). `monthly` counts income minus pokok installments
 * per month; the yearly nisab is divided by 12 for the monthly check.
 */
export function zakatIncome(income: number, otherIncome: number, installment: number, goldPrice: number): Outcome {
  const net = Math.max(0, income + otherIncome - installment)
  return outcome(net, (GOLD_NISAB_G * goldPrice) / 12)
}

/** Zakat fitrah in rupiah: 2.5 kg of rice per person. */
export function zakatFitrah(people: number, ricePerKg: number) {
  const kg = people * FITRAH_RICE_KG
  return { kg, zakat: kg * ricePerKg }
}
