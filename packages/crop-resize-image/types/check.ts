// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Rotation, Source.Rotation>>()
assert<Same<Public.Orientation, Source.Orientation>>()
assert<Same<Public.Rect, Source.Rect>>()
assert<Same<Public.Handle, Source.Handle>>()
assert<Same<Public.OutFormat, Source.OutFormat>>()
assert<Same<typeof Public.orient, typeof Source.orient>>()
assert<Same<typeof Public.fitRect, typeof Source.fitRect>>()
assert<Same<typeof Public.dragRect, typeof Source.dragRect>>()
assert<Same<typeof Public.exportImage, typeof Source.exportImage>>()
assert<Same<Public.DecodedImage, Source.DecodedImage>>()
assert<Same<typeof Public.decodeImage, typeof Source.decodeImage>>()
assert<Same<typeof Public.UnreadableImageError, typeof Source.UnreadableImageError>>()
