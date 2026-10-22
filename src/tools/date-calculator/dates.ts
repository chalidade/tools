import data from './holidays.json'

/** Dates are handled as UTC midnight so daylight saving and time zones never shift a day. */
export type D = Date

const DAY = 86_400_000

export function parseISO(s: string): D | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null
}

export function toISO(d: D): string {
  return d.toISOString().slice(0, 10)
}

export function todayISO(): string {
  const n = new Date()
  const p = (x: number) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`
}

export const daysBetween = (a: D, b: D) => Math.round((b.getTime() - a.getTime()) / DAY)
export const addDays = (d: D, n: number): D => new Date(d.getTime() + n * DAY)
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

/** Adds calendar months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(d: D, n: number): D {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + n
  const y = Math.floor(total / 12)
  const m = total - y * 12
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), daysIn(y, m))))
}

export interface YMD {
  years: number
  months: number
  days: number
}

/** Whole years, months and days from a to b (a <= b). */
export function diffYMD(a: D, b: D): YMD {
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth()
  if (addMonths(a, months) > b) months--
  return { years: Math.floor(months / 12), months: months % 12, days: daysBetween(addMonths(a, months), b) }
}

export interface Age extends YMD {
  totalDays: number
  nextBirthday: D
  daysToBirthday: number
}

export function age(birth: D, today: D): Age | null {
  if (birth > today) return null
  let next = addMonths(birth, Math.max(0, (today.getUTCFullYear() - birth.getUTCFullYear()) * 12))
  if (next < today) next = addMonths(birth, (today.getUTCFullYear() - birth.getUTCFullYear() + 1) * 12)
  return { ...diffYMD(birth, today), totalDays: daysBetween(birth, today), nextBirthday: next, daysToBirthday: daysBetween(today, next) }
}

export const SUPPORTED_YEARS = Object.keys(data.years).map(Number)

export function holidayMap(withCuti: boolean): Map<string, string> {
  const m = new Map<string, string>()
  for (const y of Object.values(data.years)) for (const [k, v] of Object.entries(y)) m.set(k, v)
  if (withCuti) for (const y of Object.values(data.cutiBersama)) for (const [k, v] of Object.entries(y)) m.set(k, v)
  return m
}

export const isWeekend = (d: D) => d.getUTCDay() === 0 || d.getUTCDay() === 6

export function isWorkday(d: D, holidays: Map<string, string>): boolean {
  return !isWeekend(d) && !holidays.has(toISO(d))
}

/** Working days from a to b, both ends included. */
export function workdaysBetween(a: D, b: D, holidays: Map<string, string>) {
  let workdays = 0
  const skipped: { date: string; name: string }[] = []
  for (let d = a; d <= b; d = addDays(d, 1)) {
    if (isWorkday(d, holidays)) workdays++
    else if (!isWeekend(d)) skipped.push({ date: toISO(d), name: holidays.get(toISO(d))! })
  }
  return { workdays, holidays: skipped }
}

/** Moves n working days forward (n > 0) or back (n < 0) from d. */
export function addWorkdays(d: D, n: number, holidays: Map<string, string>): D {
  const step = n < 0 ? -1 : 1
  let left = Math.abs(n)
  let cur = d
  while (left > 0) {
    cur = addDays(cur, step)
    if (isWorkday(cur, holidays)) left--
  }
  return cur
}

/** Years of the range that the bundled holiday list does not cover. */
export function uncoveredYears(a: D, b: D): number[] {
  const out: number[] = []
  for (let y = a.getUTCFullYear(); y <= b.getUTCFullYear(); y++) if (!SUPPORTED_YEARS.includes(y)) out.push(y)
  return out
}
