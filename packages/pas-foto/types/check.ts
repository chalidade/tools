// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<typeof Public.DPI, typeof Source.DPI>>()
assert<Same<typeof Public.mmToPx, typeof Source.mmToPx>>()
assert<Same<Public.PhotoSize, Source.PhotoSize>>()
assert<Same<Public.Paper, Source.Paper>>()
assert<Same<Public.Sheet, Source.Sheet>>()
assert<Same<typeof Public.SIZES, typeof Source.SIZES>>()
assert<Same<typeof Public.PAPERS, typeof Source.PAPERS>>()
assert<Same<typeof Public.sheetLayout, typeof Source.sheetLayout>>()
assert<Same<Public.Bg, Source.Bg>>()
assert<Same<typeof Public.BG_COLOR, typeof Source.BG_COLOR>>()
assert<Same<typeof Public.renderPhoto, typeof Source.renderPhoto>>()
assert<Same<Public.DecodedImage, Source.DecodedImage>>()
assert<Same<typeof Public.decodeImage, typeof Source.decodeImage>>()
assert<Same<typeof Public.UnreadableImageError, typeof Source.UnreadableImageError>>()
