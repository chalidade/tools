// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Action, Source.Action>>()
assert<Same<typeof Public.floodRegion, typeof Source.floodRegion>>()
assert<Same<typeof Public.colorRegion, typeof Source.colorRegion>>()
assert<Same<typeof Public.applyRegion, typeof Source.applyRegion>>()
assert<Same<typeof Public.applyCoverage, typeof Source.applyCoverage>>()
assert<Same<typeof Public.stampBrush, typeof Source.stampBrush>>()
assert<Same<typeof Public.strokeBrush, typeof Source.strokeBrush>>()
assert<Same<typeof Public.invert, typeof Source.invert>>()
assert<Same<typeof Public.refine, typeof Source.refine>>()
assert<Same<typeof Public.compose, typeof Source.compose>>()
