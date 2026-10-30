// Compile-time guard: the hand-written public types (index.d.ts) must match
// the real source. `tsc --noEmit -p .` in the build fails if they drift.

import type * as Public from './index'
import type * as Source from '../src/index'

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const assert = <T extends true>() => undefined as unknown as T

assert<Same<Public.Input, Source.Input>>()
assert<Same<Public.Result, Source.Result>>()
assert<Same<typeof Public.netSalary, typeof Source.netSalary>>()
assert<Same<typeof Public.progressiveTax, typeof Source.progressiveTax>>()
assert<Same<typeof Public.ptkp, typeof Source.ptkp>>()
assert<Same<typeof Public.RATES_AS_OF, typeof Source.RATES_AS_OF>>()
assert<Same<typeof Public.PTKP_SELF, typeof Source.PTKP_SELF>>()
assert<Same<typeof Public.PTKP_MARRIED, typeof Source.PTKP_MARRIED>>()
assert<Same<typeof Public.PTKP_DEPENDENT, typeof Source.PTKP_DEPENDENT>>()
assert<Same<typeof Public.MAX_DEPENDENTS, typeof Source.MAX_DEPENDENTS>>()
assert<Same<typeof Public.JOB_COST_RATE, typeof Source.JOB_COST_RATE>>()
assert<Same<typeof Public.JOB_COST_MAX_YEAR, typeof Source.JOB_COST_MAX_YEAR>>()
assert<Same<typeof Public.BRACKETS, typeof Source.BRACKETS>>()
assert<Same<typeof Public.BPJS_KES_CAP, typeof Source.BPJS_KES_CAP>>()
assert<Same<typeof Public.BPJS_KES_EMPLOYEE, typeof Source.BPJS_KES_EMPLOYEE>>()
assert<Same<typeof Public.BPJS_KES_EMPLOYER, typeof Source.BPJS_KES_EMPLOYER>>()
assert<Same<typeof Public.JHT_EMPLOYEE, typeof Source.JHT_EMPLOYEE>>()
assert<Same<typeof Public.JP_EMPLOYEE, typeof Source.JP_EMPLOYEE>>()
assert<Same<typeof Public.JP_CAP, typeof Source.JP_CAP>>()
assert<Same<typeof Public.JKK_EMPLOYER, typeof Source.JKK_EMPLOYER>>()
assert<Same<typeof Public.JKM_EMPLOYER, typeof Source.JKM_EMPLOYER>>()
