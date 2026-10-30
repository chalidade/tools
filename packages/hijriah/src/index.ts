// The headless API. The source lives with the site (src/tools/hijriah/).
//
//   import { toHijri, utcDate } from '@chalidade/hijriah'
//   toHijri(utcDate(2025, 3, 30)) // { year: 1446, month: 9, day: 30 }

export {
  toHijri,
  toGregorian,
  hijriMonthLength,
  holidaysIn,
  utcDate,
  HOLIDAYS,
  HIJRI_MONTHS,
  MIN_YEAR,
  MAX_YEAR,
  type Hijri,
  type Holiday,
} from '@/tools/hijriah/hijri'
