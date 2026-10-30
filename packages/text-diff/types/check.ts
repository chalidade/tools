// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Op, Source.Op>>()
assert<Same<Public.Piece, Source.Piece>>()
assert<Same<Public.Line, Source.Line>>()
assert<Same<Public.Options, Source.Options>>()
assert<Same<typeof Public.diffLines, typeof Source.diffLines>>()
assert<Same<typeof Public.diffWords, typeof Source.diffWords>>()
assert<Same<typeof Public.diffTokens, typeof Source.diffTokens>>()
assert<Same<typeof Public.withInline, typeof Source.withInline>>()
assert<Same<typeof Public.splitLines, typeof Source.splitLines>>()
assert<Same<typeof Public.stats, typeof Source.stats>>()
