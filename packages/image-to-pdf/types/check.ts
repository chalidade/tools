// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Rotation, Source.Rotation>>()
assert<Same<Public.ImageItem, Source.ImageItem>>()
assert<Same<Public.PageSize, Source.PageSize>>()
assert<Same<Public.Orientation, Source.Orientation>>()
assert<Same<Public.PdfOptions, Source.PdfOptions>>()
assert<Same<typeof Public.UnsupportedImageError, typeof Source.UnsupportedImageError>>()
assert<Same<typeof Public.loadImage, typeof Source.loadImage>>()
assert<Same<typeof Public.rotateThumb, typeof Source.rotateThumb>>()
assert<Same<typeof Public.rotatedSize, typeof Source.rotatedSize>>()
assert<Same<typeof Public.layout, typeof Source.layout>>()
assert<Same<typeof Public.buildPdf, typeof Source.buildPdf>>()
