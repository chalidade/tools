// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<typeof Public.encryptionInfo, typeof Source.encryptionInfo>>()
assert<Same<Public.Permission, Source.Permission>>()
assert<Same<typeof Public.AlreadyEncryptedError, typeof Source.AlreadyEncryptedError>>()
assert<Same<typeof Public.protectPdf, typeof Source.protectPdf>>()
