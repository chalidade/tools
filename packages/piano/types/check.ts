// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

// A class with private fields never equals a declaration without them, so compare the public surface.
type SameClass<P extends abstract new (...a: never) => unknown, S extends abstract new (...a: never) => unknown> = Same<
  ConstructorParameters<P>,
  ConstructorParameters<S>
> extends true
  ? Same<InstanceType<P>, Pick<InstanceType<S>, keyof InstanceType<S>>>
  : false

assert<Same<Public.Voice, Source.Voice>>()
assert<Same<Public.Note, Source.Note>>()
assert<Same<Public.Song, Source.Song>>()
assert<Same<Public.Step, Source.Step>>()
assert<Same<typeof Public.VOICES, typeof Source.VOICES>>()
assert<Same<typeof Public.SONGS, typeof Source.SONGS>>()
assert<Same<typeof Public.SCALES, typeof Source.SCALES>>()
assert<Same<typeof Public.scaleSong, typeof Source.scaleSong>>()
assert<Same<typeof Public.parseMidi, typeof Source.parseMidi>>()
assert<Same<typeof Public.stepsOf, typeof Source.stepsOf>>()
assert<Same<typeof Public.rangeOf, typeof Source.rangeOf>>()
assert<SameClass<typeof Public.PianoSynth, typeof Source.PianoSynth>>()
