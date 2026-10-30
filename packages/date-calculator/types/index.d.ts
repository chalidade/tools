// Public types of @chalidade/date-calculator. They mirror
// src/tools/date-calculator/dates.ts; types/check.ts fails the build if they drift.
//
// Every date is a Date at UTC midnight (what parseISO returns), so time zones
// and daylight saving never shift a day.

export interface YMD {
  years: number
  months: number
  days: number
}

export interface Age extends YMD {
  totalDays: number
  nextBirthday: Date
  daysToBirthday: number
}

/** "2025-03-01" to a UTC-midnight Date; null for anything else or an impossible date (2025-02-30). */
export declare function parseISO(s: string): Date | null
/** A Date back to "YYYY-MM-DD" (UTC). */
export declare function toISO(d: Date): string
/** Today in the device's time zone, as "YYYY-MM-DD". */
export declare function todayISO(): string
/** Calendar days from a to b (negative when b is earlier). */
export declare const daysBetween: (a: Date, b: Date) => number
export declare const addDays: (d: Date, n: number) => Date
/** Adds calendar months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export declare function addMonths(d: Date, n: number): Date
/** Whole years, months and days from a to b (a <= b). */
export declare function diffYMD(a: Date, b: Date): YMD
/** Exact age on `today`; null when birth is after today. */
export declare function age(birth: Date, today: Date): Age | null
/** Years the bundled Indonesian holiday list covers. */
export declare const SUPPORTED_YEARS: number[]
/**
 * Indonesian national public holidays ("YYYY-MM-DD" → name in Indonesian), from
 * the joint ministerial decree (SKB 3 Menteri). With `withCuti`, also the
 * collective leave days (cuti bersama).
 */
export declare function holidayMap(withCuti: boolean): Map<string, string>
/** Saturday or Sunday. */
export declare const isWeekend: (d: Date) => boolean
export declare function isWorkday(d: Date, holidays: Map<string, string>): boolean
/** Working days from a to b, both ends included, plus the weekday holidays skipped. */
export declare function workdaysBetween(a: Date, b: Date, holidays: Map<string, string>): { workdays: number; holidays: { date: string; name: string }[] }
/** Moves n working days forward (n > 0) or back (n < 0). */
export declare function addWorkdays(d: Date, n: number, holidays: Map<string, string>): Date
/** Years in the range that the bundled holiday list does not cover. */
export declare function uncoveredYears(a: Date, b: Date): number[]
