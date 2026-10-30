// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Tlv, Source.Tlv>>()
assert<Same<Public.QrisInfo, Source.QrisInfo>>()
assert<Same<typeof Public.crc16, typeof Source.crc16>>()
assert<Same<typeof Public.parseTlv, typeof Source.parseTlv>>()
assert<Same<typeof Public.NotQrisError, typeof Source.NotQrisError>>()
assert<Same<typeof Public.readQris, typeof Source.readQris>>()
assert<Same<typeof Public.parseAmount, typeof Source.parseAmount>>()
assert<Same<typeof Public.withAmount, typeof Source.withAmount>>()
