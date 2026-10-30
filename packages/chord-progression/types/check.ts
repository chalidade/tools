// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Step, Source.Step>>()
assert<Same<Public.Pattern, Source.Pattern>>()
assert<Same<Public.ProgressionChord, Source.ProgressionChord>>()
assert<Same<typeof Public.PATTERNS, typeof Source.PATTERNS>>()
assert<Same<typeof Public.buildProgression, typeof Source.buildProgression>>()
assert<Same<typeof Public.pianoVoicing, typeof Source.pianoVoicing>>()
assert<Same<typeof Public.guitarNotes, typeof Source.guitarNotes>>()
assert<Same<typeof Public.progressionText, typeof Source.progressionText>>()
assert<Same<typeof Public.usesFlats, typeof Source.usesFlats>>()
assert<Same<typeof Public.spell, typeof Source.spell>>()
