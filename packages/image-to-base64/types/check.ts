// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.SnippetKind, Source.SnippetKind>>()
assert<Same<typeof Public.fileToDataUrl, typeof Source.fileToDataUrl>>()
assert<Same<typeof Public.withMime, typeof Source.withMime>>()
assert<Same<typeof Public.snippet, typeof Source.snippet>>()
assert<Same<typeof Public.sniffMime, typeof Source.sniffMime>>()
assert<Same<typeof Public.NotBase64Error, typeof Source.NotBase64Error>>()
assert<Same<typeof Public.NotImageError, typeof Source.NotImageError>>()
assert<Same<typeof Public.decodeBase64Image, typeof Source.decodeBase64Image>>()
