// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<typeof Public.isPdfFile, typeof Source.isPdfFile>>()
assert<Same<typeof Public.LockedPdfError, typeof Source.LockedPdfError>>()
assert<Same<Public.NumberFormat, Source.NumberFormat>>()
assert<Same<Public.VPos, Source.VPos>>()
assert<Same<Public.HPos, Source.HPos>>()
assert<Same<Public.NumberOptions, Source.NumberOptions>>()
assert<Same<typeof Public.pageLabel, typeof Source.pageLabel>>()
assert<Same<typeof Public.numberFor, typeof Source.numberFor>>()
assert<Same<typeof Public.labelOrigin, typeof Source.labelOrigin>>()
assert<Same<typeof Public.numberPdf, typeof Source.numberPdf>>()
