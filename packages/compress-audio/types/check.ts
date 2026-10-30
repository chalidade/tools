// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.AudioFormat, Source.AudioFormat>>()
assert<Same<typeof Public.availableFormats, typeof Source.availableFormats>>()
assert<Same<typeof Public.compressAudio, typeof Source.compressAudio>>()
assert<Same<Public.MediaInfo, Source.MediaInfo>>()
assert<Same<typeof Public.probeMedia, typeof Source.probeMedia>>()
assert<Same<typeof Public.hasWebCodecs, typeof Source.hasWebCodecs>>()
assert<Same<typeof Public.isCanceled, typeof Source.isCanceled>>()
assert<Same<typeof Public.NoEncoderError, typeof Source.NoEncoderError>>()
assert<Same<typeof Public.UnsupportedMediaError, typeof Source.UnsupportedMediaError>>()
