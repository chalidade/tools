// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Unit, Source.Unit>>()
assert<Same<Public.Dimension, Source.Dimension>>()
assert<Same<Public.Pack, Source.Pack>>()
assert<Same<Public.Ranked, Source.Ranked>>()
assert<Same<Public.Comparison, Source.Comparison>>()
assert<Same<typeof Public.unitPrice, typeof Source.unitPrice>>()
assert<Same<typeof Public.compare, typeof Source.compare>>()
assert<Same<typeof Public.displayPrice, typeof Source.displayPrice>>()
assert<Same<typeof Public.UNITS, typeof Source.UNITS>>()
assert<Same<typeof Public.parseNumber, typeof Source.parseNumber>>()
