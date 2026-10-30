// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.ExifField, Source.ExifField>>()
assert<Same<Public.ExifInfo, Source.ExifInfo>>()
assert<Same<typeof Public.sniff, typeof Source.sniff>>()
assert<Same<typeof Public.readExif, typeof Source.readExif>>()
assert<Same<typeof Public.stripJpeg, typeof Source.stripJpeg>>()
assert<Same<typeof Public.stripPng, typeof Source.stripPng>>()
assert<Same<typeof Public.stripWebp, typeof Source.stripWebp>>()
assert<Same<typeof Public.stripMetadata, typeof Source.stripMetadata>>()
assert<Same<typeof Public.formatCoords, typeof Source.formatCoords>>()
assert<Same<typeof Public.textMap, typeof Source.textMap>>()
