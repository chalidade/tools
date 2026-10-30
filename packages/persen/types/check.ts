// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.DiscountStep, Source.DiscountStep>>()
assert<Same<Public.Discounts, Source.Discounts>>()
assert<Same<typeof Public.percentOf, typeof Source.percentOf>>()
assert<Same<typeof Public.whatPercent, typeof Source.whatPercent>>()
assert<Same<typeof Public.percentChange, typeof Source.percentChange>>()
assert<Same<typeof Public.stackedDiscount, typeof Source.stackedDiscount>>()
assert<Same<typeof Public.parseNumber, typeof Source.parseNumber>>()
assert<Same<typeof Public.finite, typeof Source.finite>>()
