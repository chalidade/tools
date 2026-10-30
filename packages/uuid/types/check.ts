// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.UuidOptions, Source.UuidOptions>>()
assert<Same<typeof Public.uuidV4, typeof Source.uuidV4>>()
assert<Same<typeof Public.uuidV7, typeof Source.uuidV7>>()
assert<Same<typeof Public.generate, typeof Source.generate>>()
