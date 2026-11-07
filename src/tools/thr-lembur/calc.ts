import { HOURLY_DIVISOR, THR_FULL_MONTHS, THR_MIN_MONTHS, tiers, type DayType } from './rules'

export interface ThrResult {
  amount: number
  /** Share of a full month's wage: 1 for 12+ months, months/12 otherwise, 0 below the minimum. */
  fraction: number
  prorated: boolean
}

/** THR: full for ≥12 months of service, else months/12 × wage, none under 1 month. */
export function thr(wage: number, months: number): ThrResult {
  const m = Math.max(0, Math.floor(months))
  if (m < THR_MIN_MONTHS || wage <= 0) return { amount: 0, fraction: 0, prorated: false }
  if (m >= THR_FULL_MONTHS) return { amount: wage, fraction: 1, prorated: false }
  return { amount: (m / THR_FULL_MONTHS) * wage, fraction: m / THR_FULL_MONTHS, prorated: true }
}

export const hourlyWage = (monthly: number): number => (monthly > 0 ? monthly / HOURLY_DIVISOR : 0)

export interface Step {
  hours: number
  mult: number
  pay: number
}

/** Overtime for one day of `hours` (may be fractional), broken down per tier. */
export function overtimeDay(monthly: number, day: DayType, weekDays: 5 | 6, hours: number): { steps: Step[]; pay: number } {
  const hourly = hourlyWage(monthly)
  let left = Math.max(0, hours)
  const steps: Step[] = []
  for (const t of tiers(day, weekDays)) {
    if (left <= 0) break
    const h = Math.min(left, t.hours)
    steps.push({ hours: h, mult: t.mult, pay: h * t.mult * hourly })
    left -= h
  }
  return { steps, pay: steps.reduce((s, x) => s + x.pay, 0) }
}
