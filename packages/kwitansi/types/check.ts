// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Item, Source.Item>>()
assert<Same<Public.Totals, Source.Totals>>()
assert<Same<Public.DocData, Source.DocData>>()
assert<Same<typeof Public.totals, typeof Source.totals>>()
assert<Same<typeof Public.amountFromInput, typeof Source.amountFromInput>>()
assert<Same<typeof Public.wrapText, typeof Source.wrapText>>()
assert<Same<typeof Public.rupiahText, typeof Source.rupiahText>>()
assert<Same<typeof Public.amountWords, typeof Source.amountWords>>()
assert<Same<typeof Public.buildPdf, typeof Source.buildPdf>>()
assert<Same<typeof Public.setLanguage, typeof Source.setLanguage>>()
