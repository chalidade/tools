// The headless API. The source lives with the site (src/tools/date-calculator/).
//
//   import { parseISO, workdaysBetween, holidayMap } from '@chalidade/date-calculator'

export {
  parseISO,
  toISO,
  todayISO,
  daysBetween,
  addDays,
  addMonths,
  diffYMD,
  age,
  SUPPORTED_YEARS,
  holidayMap,
  isWeekend,
  isWorkday,
  workdaysBetween,
  addWorkdays,
  uncoveredYears,
  type YMD,
  type Age,
} from '@/tools/date-calculator/dates'
