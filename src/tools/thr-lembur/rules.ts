// Rules for THR and overtime. Sources: Permenaker 6/2016 (THR) and
// PP 35/2021 articles 31–33 (overtime). A change is a one-file edit.

export const RULES_AS_OF = '2025-03-01'
export const RULES_SOURCE = 'Permenaker 6/2016, PP 35/2021'

/** Divisor turning monthly wage into hourly wage (PP 35/2021 art. 31 ayat 3). */
export const HOURLY_DIVISOR = 173

/** Minimum service (whole months) to be entitled to THR. */
export const THR_MIN_MONTHS = 1
/** Months of service from which THR is one full month's wage. */
export const THR_FULL_MONTHS = 12

/** A tier: this many hours at this multiple of the hourly wage. `hours` Infinity = the rest. */
export interface Tier {
  hours: number
  mult: number
}

export type DayType = 'weekday' | 'holiday' | 'holidayShort'

/**
 * Overtime multipliers per day type and working week.
 * weekday: 1st hour 1.5×, then 2× (both week patterns).
 * holiday (rest day / public holiday): 5-day week 8h×2, 9th ×3, 10th+ ×4;
 *   6-day week 7h×2, 8th ×3, 9th+ ×4.
 * holidayShort: a 6-day-week holiday on the 5-hour short day: 5h×2, 6th ×3, 7th+ ×4.
 */
export function tiers(day: DayType, weekDays: 5 | 6): Tier[] {
  if (day === 'weekday') {
    return [
      { hours: 1, mult: 1.5 },
      { hours: Infinity, mult: 2 },
    ]
  }
  const first = day === 'holidayShort' && weekDays === 6 ? 5 : weekDays === 5 ? 8 : 7
  return [
    { hours: first, mult: 2 },
    { hours: 1, mult: 3 },
    { hours: Infinity, mult: 4 },
  ]
}

/** Legal limits, shown as a hint only. */
export const MAX_OVERTIME_PER_DAY = 4
export const MAX_OVERTIME_PER_WEEK = 18
