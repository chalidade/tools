// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.JsonNode, Source.JsonNode>>()
assert<Same<Public.Indent, Source.Indent>>()
assert<Same<typeof Public.JsonSyntaxError, typeof Source.JsonSyntaxError>>()
assert<Same<typeof Public.parseJson, typeof Source.parseJson>>()
assert<Same<typeof Public.formatJson, typeof Source.formatJson>>()
assert<Same<typeof Public.minifyJson, typeof Source.minifyJson>>()
assert<Same<typeof Public.stats, typeof Source.stats>>()
