// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.CaptureOptions, Source.CaptureOptions>>()
assert<Same<Public.RecordingResult, Source.RecordingResult>>()
assert<Same<Public.CaptureWarning, Source.CaptureWarning>>()
assert<Same<Public.Capture, Source.Capture>>()
assert<Same<typeof Public.captureScreen, typeof Source.captureScreen>>()
assert<Same<typeof Public.recordScreen, typeof Source.recordScreen>>()
assert<Same<typeof Public.toMp4, typeof Source.toMp4>>()
assert<Same<typeof Public.canRecordScreen, typeof Source.canRecordScreen>>()
