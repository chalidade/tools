// Calendar-method cycle maths (UTC midnight days, shared with Hitung HPL).
import { parseDay } from '@/tools/hpl/hpl'

export { fmtDay, parseDay } from '@/tools/hpl/hpl'
export const DAY = 86_400_000
/** Luteal phase: ovulation is about 14 days before the next period. */
export const LUTEAL = 14

export interface CycleStats {
  /** Cycle lengths in days between consecutive period starts. */
  lengths: number[]
  avg: number
  min: number
  max: number
}

/** Sorted, de-duplicated valid period start days. */
export function cleanDates(list: string[]): number[] {
  const set = new Set<number>()
  for (const s of list) {
    const d = parseDay(s)
    if (!isNaN(d)) set.add(d)
  }
  return [...set].sort((a, b) => a - b)
}

/** Lengths between consecutive starts; gaps outside 15–60 days are ignored as missed entries. */
export function cycleStats(days: number[]): CycleStats | null {
  const lengths: number[] = []
  for (let i = 1; i < days.length; i++) {
    const n = Math.round((days[i] - days[i - 1]) / DAY)
    if (n >= 15 && n <= 60) lengths.push(n)
  }
  if (!lengths.length) return null
  const sum = lengths.reduce((a, b) => a + b, 0)
  return { lengths, avg: Math.round(sum / lengths.length), min: Math.min(...lengths), max: Math.max(...lengths) }
}

export interface Cycle {
  start: number
  ovulation: number
  fertileFrom: number
  fertileTo: number
  periodEnd: number
}

/** Predict cycles from `last` period start. Fertile window = 5 days before ovulation through the day after (Wilcox 2000). */
export function predict(last: number, cycle: number, periodLen: number, count: number): Cycle[] {
  const out: Cycle[] = []
  for (let i = 0; i < count; i++) {
    const start = last + i * cycle * DAY
    const ovulation = start + (cycle - LUTEAL) * DAY
    out.push({
      start,
      ovulation,
      fertileFrom: ovulation - 5 * DAY,
      fertileTo: ovulation + DAY,
      periodEnd: start + (periodLen - 1) * DAY,
    })
  }
  return out
}

export type DayKind = 'period' | 'fertile' | 'ovulation' | 'none'

export function kindOf(day: number, cycles: Cycle[]): DayKind {
  for (const c of cycles) {
    if (day === c.ovulation) return 'ovulation'
  }
  for (const c of cycles) {
    if (day >= c.start && day <= c.periodEnd) return 'period'
    if (day >= c.fertileFrom && day <= c.fertileTo) return 'fertile'
  }
  return 'none'
}

/** Days of a month grid: leading blanks (Monday first) then 1..n as UTC ms. */
export function monthGrid(year: number, month: number): (number | null)[] {
  const first = Date.UTC(year, month, 1)
  const n = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const lead = (new Date(first).getUTCDay() + 6) % 7
  const cells: (number | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= n; d++) cells.push(Date.UTC(year, month, d))
  return cells
}
