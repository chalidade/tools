// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<typeof Public.LockedPdfError, typeof Source.LockedPdfError>>()
assert<Same<typeof Public.ScannedPdfError, typeof Source.ScannedPdfError>>()
assert<Same<Public.TextPiece, Source.TextPiece>>()
assert<Same<Public.TextLine, Source.TextLine>>()
assert<Same<Public.PageText, Source.PageText>>()
assert<Same<typeof Public.readPdfText, typeof Source.readPdfText>>()
assert<Same<typeof Public.toMarkdown, typeof Source.toMarkdown>>()
