// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Outcome, Source.Outcome>>()
assert<Same<typeof Public.zakatMal, typeof Source.zakatMal>>()
assert<Same<typeof Public.zakatMetal, typeof Source.zakatMetal>>()
assert<Same<typeof Public.zakatIncome, typeof Source.zakatIncome>>()
assert<Same<typeof Public.zakatFitrah, typeof Source.zakatFitrah>>()
assert<Same<typeof Public.num, typeof Source.num>>()
assert<Same<typeof Public.RATE, typeof Source.RATE>>()
assert<Same<typeof Public.GOLD_NISAB_G, typeof Source.GOLD_NISAB_G>>()
assert<Same<typeof Public.SILVER_NISAB_G, typeof Source.SILVER_NISAB_G>>()
assert<Same<typeof Public.FITRAH_RICE_KG, typeof Source.FITRAH_RICE_KG>>()
