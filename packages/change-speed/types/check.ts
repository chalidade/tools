// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.SpeedOptions, Source.SpeedOptions>>()
assert<Same<Public.SpeedProcessor, Source.SpeedProcessor>>()
assert<Same<typeof Public.outputFor, typeof Source.outputFor>>()
assert<Same<typeof Public.changeSpeed, typeof Source.changeSpeed>>()
// The classes: same constructor arguments, same public methods.
assert<Same<ConstructorParameters<typeof Public.TimeStretch>, ConstructorParameters<typeof Source.TimeStretch>>>()
assert<Same<ConstructorParameters<typeof Public.Resample>, ConstructorParameters<typeof Source.Resample>>>()
assert<Same<Public.TimeStretch['push'], Source.TimeStretch['push']>>()
assert<Same<Public.TimeStretch['flush'], Source.TimeStretch['flush']>>()
assert<Same<Public.Resample['push'], Source.Resample['push']>>()
assert<Same<Public.Resample['flush'], Source.Resample['flush']>>()
assert<Same<Public.MediaInfo, Source.MediaInfo>>()
assert<Same<typeof Public.probeMedia, typeof Source.probeMedia>>()
assert<Same<typeof Public.hasWebCodecs, typeof Source.hasWebCodecs>>()
assert<Same<typeof Public.isCanceled, typeof Source.isCanceled>>()
assert<Same<typeof Public.NoEncoderError, typeof Source.NoEncoderError>>()
assert<Same<typeof Public.UnsupportedMediaError, typeof Source.UnsupportedMediaError>>()
