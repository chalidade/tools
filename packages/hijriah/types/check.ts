// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Hijri, Source.Hijri>>()
assert<Same<Public.Holiday, Source.Holiday>>()
assert<Same<typeof Public.toHijri, typeof Source.toHijri>>()
assert<Same<typeof Public.toGregorian, typeof Source.toGregorian>>()
assert<Same<typeof Public.hijriMonthLength, typeof Source.hijriMonthLength>>()
assert<Same<typeof Public.holidaysIn, typeof Source.holidaysIn>>()
assert<Same<typeof Public.utcDate, typeof Source.utcDate>>()
assert<Same<typeof Public.HOLIDAYS, typeof Source.HOLIDAYS>>()
assert<Same<typeof Public.HIJRI_MONTHS, typeof Source.HIJRI_MONTHS>>()
assert<Same<typeof Public.MIN_YEAR, typeof Source.MIN_YEAR>>()
assert<Same<typeof Public.MAX_YEAR, typeof Source.MAX_YEAR>>()
