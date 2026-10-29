// Every rate and ceiling used by the take-home calculator lives here, so a
// regulation change is a one-file edit. Check these against the latest rules.

/** Date these figures were last reviewed (shown to the user). */
export const RATES_AS_OF = '2025-03-01'

/** PTKP, annual non-taxable income (PMK 101/2016), rupiah. */
export const PTKP_SELF = 54_000_000
export const PTKP_MARRIED = 4_500_000
export const PTKP_DEPENDENT = 4_500_000
export const MAX_DEPENDENTS = 3

/** Biaya jabatan: 5% of gross, at most 500,000 a month (6,000,000 a year). */
export const JOB_COST_RATE = 0.05
export const JOB_COST_MAX_YEAR = 6_000_000

/** PPh 21 Pasal 17 progressive brackets on annual taxable income. */
export const BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 60_000_000, rate: 0.05 },
  { upTo: 250_000_000, rate: 0.15 },
  { upTo: 500_000_000, rate: 0.25 },
  { upTo: 5_000_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
]

/** BPJS Kesehatan: wage ceiling 12,000,000 a month. */
export const BPJS_KES_CAP = 12_000_000
export const BPJS_KES_EMPLOYEE = 0.01
export const BPJS_KES_EMPLOYER = 0.04

/** BPJS Ketenagakerjaan. JP ceiling follows the yearly update (Mar 2025). */
export const JHT_EMPLOYEE = 0.02
export const JP_EMPLOYEE = 0.01
export const JP_CAP = 10_547_400
/** Employer-paid, counted as taxable benefit: JKK (lowest risk class) and JKM. */
export const JKK_EMPLOYER = 0.0024
export const JKM_EMPLOYER = 0.003
