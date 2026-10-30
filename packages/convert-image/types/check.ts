// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Target, Source.Target>>()
assert<Same<Public.Converted, Source.Converted>>()
assert<Same<typeof Public.convertImage, typeof Source.convertImage>>()
assert<Same<typeof Public.targetName, typeof Source.targetName>>()
assert<Same<typeof Public.isHeic, typeof Source.isHeic>>()
assert<Same<typeof Public.decodeHeic, typeof Source.decodeHeic>>()
