// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.DecodedImage, Source.DecodedImage>>()
assert<Same<Public.Shape, Source.Shape>>()
assert<Same<Public.Fit, Source.Fit>>()
assert<Same<Public.FaviconOptions, Source.FaviconOptions>>()
assert<Same<typeof Public.UnreadableImageError, typeof Source.UnreadableImageError>>()
assert<Same<typeof Public.decodeImage, typeof Source.decodeImage>>()
assert<Same<typeof Public.drawIcon, typeof Source.drawIcon>>()
assert<Same<typeof Public.buildIco, typeof Source.buildIco>>()
assert<Same<typeof Public.buildFaviconZip, typeof Source.buildFaviconZip>>()
// The source constant has a literal type; the public one is just `string`, so only check assignability.
export const snippetFits: typeof Public.HTML_SNIPPET = undefined as unknown as typeof Source.HTML_SNIPPET
