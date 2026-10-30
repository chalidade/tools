// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Method, Source.Method>>()
assert<Same<Public.Row, Source.Row>>()
assert<Same<Public.Loan, Source.Loan>>()
assert<Same<typeof Public.buildLoan, typeof Source.buildLoan>>()
assert<Same<typeof Public.loanCsv, typeof Source.loanCsv>>()
assert<Same<typeof Public.num, typeof Source.num>>()
assert<Same<typeof Public.MAX_MONTHS, typeof Source.MAX_MONTHS>>()
