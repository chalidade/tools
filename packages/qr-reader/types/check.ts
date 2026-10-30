// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Scan, Source.Scan>>()
assert<Same<Public.QrKind, Source.QrKind>>()
assert<Same<Public.ParsedQr, Source.ParsedQr>>()
assert<Same<typeof Public.UnreadableImageError, typeof Source.UnreadableImageError>>()
assert<Same<typeof Public.scanFile, typeof Source.scanFile>>()
assert<Same<typeof Public.scanPixels, typeof Source.scanPixels>>()
assert<Same<typeof Public.formatName, typeof Source.formatName>>()
assert<Same<typeof Public.isQrLike, typeof Source.isQrLike>>()
assert<Same<typeof Public.parseQr, typeof Source.parseQr>>()
