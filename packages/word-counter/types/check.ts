// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.TextStats, Source.TextStats>>()
assert<Same<Public.Limit, Source.Limit>>()
assert<Same<typeof Public.READ_WPM, typeof Source.READ_WPM>>()
assert<Same<typeof Public.SPEAK_WPM, typeof Source.SPEAK_WPM>>()
assert<Same<typeof Public.LIMITS, typeof Source.LIMITS>>()
assert<Same<typeof Public.analyze, typeof Source.analyze>>()
assert<Same<typeof Public.countWords, typeof Source.countWords>>()
assert<Same<typeof Public.countSentences, typeof Source.countSentences>>()
assert<Same<typeof Public.graphemeLength, typeof Source.graphemeLength>>()
assert<Same<typeof Public.minutesToParts, typeof Source.minutesToParts>>()
