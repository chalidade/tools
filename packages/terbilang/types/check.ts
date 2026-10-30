// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Parsed, Source.Parsed>>()
assert<Same<Public.Options, Source.Options>>()
assert<Same<Public.Case, Source.Case>>()
assert<Same<typeof Public.MAX_DIGITS, typeof Source.MAX_DIGITS>>()
assert<Same<typeof Public.parseNumber, typeof Source.parseNumber>>()
assert<Same<typeof Public.toWords, typeof Source.toWords>>()
assert<Same<typeof Public.integerWords, typeof Source.integerWords>>()
assert<Same<typeof Public.applyCase, typeof Source.applyCase>>()
