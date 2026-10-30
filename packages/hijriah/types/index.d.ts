// Public types of @chalidade/hijriah. They mirror src/tools/hijriah/hijri.ts;
// types/check.ts fails the build if they drift.

/** A Hijri date: month 1 (Muharram) to 12 (Dhu al-Hijjah). */
export interface Hijri {
  year: number
  month: number
  day: number
}

export interface Holiday {
  month: number
  day: number
  /** [Indonesian, English] */
  name: [string, string]
}

/** Range toGregorian() accepts (the Umm al-Qura tables cover about 1900–2077). */
export declare const MIN_YEAR = 1318
export declare const MAX_YEAR = 1500
/** Month names as [Indonesian, English]. */
export declare const HIJRI_MONTHS: [string, string][]
/** The Islamic days the tool lists (1 Muharram, Ramadan, Eid al-Fitr, Eid al-Adha, …). */
export declare const HOLIDAYS: Holiday[]

/** A Gregorian date (month 1–12) at UTC midnight, the form toHijri() expects. */
export declare const utcDate: (y: number, m: number, d: number) => Date
/** Gregorian to Hijri with the browser's Umm al-Qura calendar (Intl), read in UTC. */
export declare function toHijri(date: Date): Hijri
/** Hijri to Gregorian (UTC midnight), or null if that day does not exist or is out of range. */
export declare function toGregorian(h: Hijri): Date | null
/** Days in a Hijri month: 29 or 30. */
export declare function hijriMonthLength(year: number, month: number): number
/** The holidays that fall inside a Gregorian year, in date order. */
export declare function holidaysIn(gregYear: number): { date: Date; name: [string, string]; hijri: Hijri }[]
