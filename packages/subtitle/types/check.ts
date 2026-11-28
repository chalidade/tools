// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Cue, Source.Cue>>()
assert<Same<Public.SubFormat, Source.SubFormat>>()
assert<Same<typeof Public.parseSubtitle, typeof Source.parseSubtitle>>()
assert<Same<typeof Public.formatTime, typeof Source.formatTime>>()
assert<Same<typeof Public.writeSubtitle, typeof Source.writeSubtitle>>()
assert<Same<typeof Public.shiftCues, typeof Source.shiftCues>>()
assert<Same<typeof Public.stretchCues, typeof Source.stretchCues>>()
assert<Same<typeof Public.mergeCues, typeof Source.mergeCues>>()
