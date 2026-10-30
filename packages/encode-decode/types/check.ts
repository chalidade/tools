// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Mode, Source.Mode>>()
assert<Same<Public.Jwt, Source.Jwt>>()
assert<Same<typeof Public.base64Encode, typeof Source.base64Encode>>()
assert<Same<typeof Public.base64Decode, typeof Source.base64Decode>>()
assert<Same<typeof Public.urlEncode, typeof Source.urlEncode>>()
assert<Same<typeof Public.urlDecode, typeof Source.urlDecode>>()
assert<Same<typeof Public.htmlEncode, typeof Source.htmlEncode>>()
assert<Same<typeof Public.htmlDecode, typeof Source.htmlDecode>>()
assert<Same<typeof Public.decodeJwt, typeof Source.decodeJwt>>()
