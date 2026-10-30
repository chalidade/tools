// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.AudioOut, Source.AudioOut>>()
assert<Same<Public.Recording, Source.Recording>>()
assert<Same<typeof Public.canRecord, typeof Source.canRecord>>()
assert<Same<typeof Public.pickMimeType, typeof Source.pickMimeType>>()
assert<Same<typeof Public.extensionOf, typeof Source.extensionOf>>()
assert<Same<typeof Public.convertRecording, typeof Source.convertRecording>>()
