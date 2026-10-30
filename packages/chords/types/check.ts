// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.ChordType, Source.ChordType>>()
assert<Same<Public.Instrument, Source.Instrument>>()
assert<Same<Public.Voicing, Source.Voicing>>()
assert<Same<typeof Public.CHORD_TYPES, typeof Source.CHORD_TYPES>>()
assert<Same<typeof Public.INSTRUMENTS, typeof Source.INSTRUMENTS>>()
assert<Same<typeof Public.voicings, typeof Source.voicings>>()
assert<Same<typeof Public.barreOf, typeof Source.barreOf>>()
assert<Same<typeof Public.isChord, typeof Source.isChord>>()
assert<Same<typeof Public.transposeChord, typeof Source.transposeChord>>()
assert<Same<typeof Public.transposeSheet, typeof Source.transposeSheet>>()
assert<Same<typeof Public.firstChordRoot, typeof Source.firstChordRoot>>()
assert<Same<typeof Public.pluck, typeof Source.pluck>>()
