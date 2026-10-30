// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.ErrorLevel, Source.ErrorLevel>>()
assert<Same<Public.ModuleStyle, Source.ModuleStyle>>()
assert<Same<Public.QrMatrix, Source.QrMatrix>>()
assert<Same<Public.RenderOptions, Source.RenderOptions>>()
assert<Same<Public.QrKind, Source.QrKind>>()
assert<Same<Public.WifiFields, Source.WifiFields>>()
assert<Same<Public.ContactFields, Source.ContactFields>>()
assert<Same<Public.MessageFields, Source.MessageFields>>()
assert<Same<typeof Public.LOGO_SHARE, typeof Source.LOGO_SHARE>>()
assert<Same<typeof Public.qrMatrix, typeof Source.qrMatrix>>()
assert<Same<typeof Public.toSvg, typeof Source.toSvg>>()
assert<Same<typeof Public.toCanvas, typeof Source.toCanvas>>()
assert<Same<typeof Public.internationalPhone, typeof Source.internationalPhone>>()
assert<Same<typeof Public.normalizeUrl, typeof Source.normalizeUrl>>()
assert<Same<typeof Public.buildWifi, typeof Source.buildWifi>>()
assert<Same<typeof Public.buildContact, typeof Source.buildContact>>()
assert<Same<typeof Public.buildWhatsApp, typeof Source.buildWhatsApp>>()
assert<Same<typeof Public.buildEmail, typeof Source.buildEmail>>()
assert<Same<typeof Public.buildPhone, typeof Source.buildPhone>>()
