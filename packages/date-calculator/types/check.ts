// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.YMD, Source.YMD>>()
assert<Same<Public.Age, Source.Age>>()
assert<Same<typeof Public.parseISO, typeof Source.parseISO>>()
assert<Same<typeof Public.toISO, typeof Source.toISO>>()
assert<Same<typeof Public.todayISO, typeof Source.todayISO>>()
assert<Same<typeof Public.daysBetween, typeof Source.daysBetween>>()
assert<Same<typeof Public.addDays, typeof Source.addDays>>()
assert<Same<typeof Public.addMonths, typeof Source.addMonths>>()
assert<Same<typeof Public.diffYMD, typeof Source.diffYMD>>()
assert<Same<typeof Public.age, typeof Source.age>>()
assert<Same<typeof Public.SUPPORTED_YEARS, typeof Source.SUPPORTED_YEARS>>()
assert<Same<typeof Public.holidayMap, typeof Source.holidayMap>>()
assert<Same<typeof Public.isWeekend, typeof Source.isWeekend>>()
assert<Same<typeof Public.isWorkday, typeof Source.isWorkday>>()
assert<Same<typeof Public.workdaysBetween, typeof Source.workdaysBetween>>()
assert<Same<typeof Public.addWorkdays, typeof Source.addWorkdays>>()
assert<Same<typeof Public.uncoveredYears, typeof Source.uncoveredYears>>()
