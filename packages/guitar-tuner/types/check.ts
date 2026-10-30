// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Pitch, Source.Pitch>>()
assert<Same<Public.Tuning, Source.Tuning>>()
assert<Same<typeof Public.detectPitch, typeof Source.detectPitch>>()
assert<Same<typeof Public.TUNINGS, typeof Source.TUNINGS>>()
assert<Same<typeof Public.midiToFreq, typeof Source.midiToFreq>>()
assert<Same<typeof Public.freqToMidi, typeof Source.freqToMidi>>()
assert<Same<typeof Public.noteName, typeof Source.noteName>>()
