// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<typeof Public.isPdfFile, typeof Source.isPdfFile>>()
assert<Same<typeof Public.LockedPdfError, typeof Source.LockedPdfError>>()
assert<Same<Public.WatermarkSize, Source.WatermarkSize>>()
assert<Same<Public.WatermarkLayout, Source.WatermarkLayout>>()
assert<Same<Public.WatermarkColor, Source.WatermarkColor>>()
assert<Same<Public.WatermarkImage, Source.WatermarkImage>>()
assert<Same<Public.WatermarkOptions, Source.WatermarkOptions>>()
assert<Same<Public.Stamp, Source.Stamp>>()
assert<Same<Public.Layout, Source.Layout>>()
assert<Same<typeof Public.measureText, typeof Source.measureText>>()
assert<Same<typeof Public.layoutWatermark, typeof Source.layoutWatermark>>()
assert<Same<typeof Public.readWatermarkImage, typeof Source.readWatermarkImage>>()
assert<Same<typeof Public.watermarkPdf, typeof Source.watermarkPdf>>()
