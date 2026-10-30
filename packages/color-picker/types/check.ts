// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.RGB, Source.RGB>>()
assert<Same<typeof Public.toHex, typeof Source.toHex>>()
assert<Same<typeof Public.toHsl, typeof Source.toHsl>>()
assert<Same<typeof Public.fromHsl, typeof Source.fromHsl>>()
assert<Same<typeof Public.toHsv, typeof Source.toHsv>>()
assert<Same<typeof Public.toCmyk, typeof Source.toCmyk>>()
assert<Same<typeof Public.toOklch, typeof Source.toOklch>>()
assert<Same<typeof Public.SCALE_STEPS, typeof Source.SCALE_STEPS>>()
assert<Same<typeof Public.colorScale, typeof Source.colorScale>>()
assert<Same<typeof Public.luminance, typeof Source.luminance>>()
assert<Same<typeof Public.contrast, typeof Source.contrast>>()
assert<Same<typeof Public.formats, typeof Source.formats>>()
assert<Same<typeof Public.parseColor, typeof Source.parseColor>>()
assert<Same<typeof Public.extractPalette, typeof Source.extractPalette>>()
