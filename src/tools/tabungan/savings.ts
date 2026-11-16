// Savings maths on a monthly grid. The yearly nominal rate is compounded
// `freq` times a year (1, 2, 4 or 12) and converted to an equivalent monthly
// growth factor; deposits go in at the end of each month. Interest tax (20%
// final tax on deposit interest) reduces the nominal rate.

export { parseNumber as num } from '@/tools/persen/percent'

export const MAX_YEARS = 100
export const TAX_RATE = 0.2

export interface Params {
  initial: number
  monthly: number
  ratePct: number
  years: number
  freq: number
  tax: boolean
}

export interface YearRow {
  year: number
  deposited: number
  interest: number
  balance: number
}

export interface Result {
  rows: YearRow[]
  deposited: number
  interest: number
  balance: number
}

/** Growth factor of one month. */
export function monthlyFactor(ratePct: number, freq: number, tax: boolean) {
  const nominal = (ratePct / 100) * (tax ? 1 - TAX_RATE : 1)
  return Math.pow(1 + nominal / freq, freq / 12)
}

export function project(p: Params): Result | null {
  const ok = (n: number) => Number.isFinite(n) && n >= 0
  if (!ok(p.initial) || !ok(p.monthly) || !ok(p.ratePct) || !(p.years > 0) || p.years > MAX_YEARS || !(p.freq >= 1)) return null
  if (p.initial === 0 && p.monthly === 0) return null
  const months = Math.round(p.years * 12)
  if (months < 1) return null
  const g = monthlyFactor(p.ratePct, p.freq, p.tax)
  let bal = p.initial
  let dep = p.initial
  const rows: YearRow[] = []
  for (let m = 1; m <= months; m++) {
    bal = bal * g + p.monthly
    dep += p.monthly
    if (m % 12 === 0 || m === months) rows.push({ year: Math.ceil(m / 12), deposited: dep, interest: bal - dep, balance: bal })
  }
  return { rows, deposited: dep, interest: bal - dep, balance: bal }
}

/** Monthly deposit needed so `initial` grows to `target` in `years`; null if impossible input, 0 if already enough. */
export function monthlyForTarget(target: number, initial: number, ratePct: number, years: number, freq: number, tax: boolean): number | null {
  if (!(target > 0) || !(initial >= 0) || !(ratePct >= 0) || !(years > 0) || years > MAX_YEARS || !Number.isFinite(target + initial + ratePct)) return null
  const n = Math.round(years * 12)
  if (n < 1) return null
  const g = monthlyFactor(ratePct, freq, tax)
  const gn = Math.pow(g, n)
  const annuity = g === 1 ? n : (gn - 1) / (g - 1)
  return Math.max(0, (target - initial * gn) / annuity)
}
