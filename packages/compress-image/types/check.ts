// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.OutFormat, Source.OutFormat>>()
assert<Same<Public.ImageOptions, Source.ImageOptions>>()
assert<Same<Public.ImageResult, Source.ImageResult>>()
assert<Same<typeof Public.compressImage, typeof Source.compressImage>>()
assert<Same<typeof Public.outputType, typeof Source.outputType>>()
assert<Same<typeof Public.outputName, typeof Source.outputName>>()
assert<Same<typeof Public.canEncodeWebp, typeof Source.canEncodeWebp>>()
