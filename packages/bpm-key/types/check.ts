// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Analysis, Source.Analysis>>()
assert<Same<typeof Public.analyze, typeof Source.analyze>>()
assert<Same<typeof Public.decodeToMono, typeof Source.decodeToMono>>()
assert<Same<typeof Public.camelot, typeof Source.camelot>>()
assert<Same<typeof Public.RATE, typeof Source.RATE>>()
