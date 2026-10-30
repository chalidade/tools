// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.AngleMode, Source.AngleMode>>()
assert<Same<typeof Public.evaluate, typeof Source.evaluate>>()
assert<Same<typeof Public.CalcError, typeof Source.CalcError>>()
assert<Same<typeof Public.clean, typeof Source.clean>>()
assert<Same<typeof Public.formatNumber, typeof Source.formatNumber>>()
assert<Same<typeof Public.plainNumber, typeof Source.plainNumber>>()
assert<Same<typeof Public.decimalPoint, typeof Source.decimalPoint>>()
