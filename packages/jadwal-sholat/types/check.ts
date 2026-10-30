// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Place, Source.Place>>()
assert<Same<Public.PrayerKey, Source.PrayerKey>>()
assert<Same<Public.PrayerTimes, Source.PrayerTimes>>()
assert<Same<typeof Public.prayerTimes, typeof Source.prayerTimes>>()
assert<Same<typeof Public.clock, typeof Source.clock>>()
assert<Same<typeof Public.daysInMonth, typeof Source.daysInMonth>>()
assert<Same<typeof Public.qibla, typeof Source.qibla>>()
assert<Same<typeof Public.KAABA, typeof Source.KAABA>>()
assert<Same<typeof Public.PRAYER_ORDER, typeof Source.PRAYER_ORDER>>()
assert<Same<typeof Public.PRAYER_NAMES, typeof Source.PRAYER_NAMES>>()
assert<Same<typeof Public.FAJR_ANGLE, typeof Source.FAJR_ANGLE>>()
assert<Same<typeof Public.ISHA_ANGLE, typeof Source.ISHA_ANGLE>>()
assert<Same<typeof Public.DHUHA_ANGLE, typeof Source.DHUHA_ANGLE>>()
assert<Same<typeof Public.IHTIYAT, typeof Source.IHTIYAT>>()
