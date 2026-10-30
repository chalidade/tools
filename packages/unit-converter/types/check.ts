// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Unit, Source.Unit>>()
assert<Same<Public.Category, Source.Category>>()
assert<Same<Public.CategoryId, Source.CategoryId>>()
assert<Same<typeof Public.CATEGORIES, typeof Source.CATEGORIES>>()
assert<Same<typeof Public.convert, typeof Source.convert>>()
assert<Same<typeof Public.parseNumber, typeof Source.parseNumber>>()
assert<Same<typeof Public.formatResult, typeof Source.formatResult>>()
