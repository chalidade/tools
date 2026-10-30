// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<typeof Public.isPdfFile, typeof Source.isPdfFile>>()
assert<Same<typeof Public.LockedPdfError, typeof Source.LockedPdfError>>()
assert<Same<Public.Signature, Source.Signature>>()
assert<Same<Public.Placement, Source.Placement>>()
assert<Same<typeof Public.trimToSignature, typeof Source.trimToSignature>>()
assert<Same<typeof Public.readSignatureImage, typeof Source.readSignatureImage>>()
assert<Same<typeof Public.signPdf, typeof Source.signPdf>>()
