// Public types of @chalidade/gaji-bersih. They mirror src/tools/gaji-bersih/
// (payroll.ts, rates.ts); types/check.ts fails the build if they drift.
//
// An estimate for planning, not tax advice: check the figures against the
// current regulations and your payslip.

export interface Input {
  /** Gross monthly salary incl. fixed allowances, rupiah. */
  gross: number
  married: boolean
  /** 0–3 counted for PTKP. */
  dependents: number
  /** Enrolled in BPJS Kesehatan and BPJS Ketenagakerjaan. */
  bpjs: boolean
}

export interface Result {
  gross: number
  /** Employee's BPJS Kesehatan (health) contribution per month. */
  kesEmployee: number
  /** Employee's JHT (old-age savings) contribution per month. */
  jhtEmployee: number
  /** Employee's JP (pension) contribution per month. */
  jpEmployee: number
  /** Annual taxable income (PKP), rounded down to 1,000. */
  taxableYear: number
  /** Annual non-taxable allowance for the status. */
  ptkp: number
  taxYear: number
  taxMonth: number
  /** Average effective tax rate on gross, percent. */
  effectivePct: number
  takeHome: number
}

/** PTKP (annual non-taxable income) for a status: 54 M + 4.5 M if married + 4.5 M per dependent (max 3). */
export declare const ptkp: (married: boolean, dependents: number) => number
/** PPh 21 Article 17 progressive tax on an annual taxable income. */
export declare function progressiveTax(taxable: number): number
/**
 * Annualises the monthly pay and applies Article 17: the average monthly tax of
 * a full year (what the December true-up converges on). NaN, Infinity or a
 * negative gross count as 0.
 */
export declare function netSalary(i: Input): Result

/** Date the rates below were last reviewed. */
export declare const RATES_AS_OF = '2025-03-01'
export declare const PTKP_SELF = 54_000_000
export declare const PTKP_MARRIED = 4_500_000
export declare const PTKP_DEPENDENT = 4_500_000
export declare const MAX_DEPENDENTS = 3
/** Biaya jabatan (job expense deduction): 5% of gross, at most 6,000,000 a year. */
export declare const JOB_COST_RATE = 0.05
export declare const JOB_COST_MAX_YEAR = 6_000_000
/** Article 17 brackets on annual taxable income: 5%, 15%, 25%, 30%, 35%. */
export declare const BRACKETS: { upTo: number; rate: number }[]
/** BPJS Kesehatan wage ceiling per month, and the employee / employer shares. */
export declare const BPJS_KES_CAP = 12_000_000
export declare const BPJS_KES_EMPLOYEE = 0.01
export declare const BPJS_KES_EMPLOYER = 0.04
/** BPJS Ketenagakerjaan: JHT 2% and JP 1% from the employee; JP wage ceiling per month. */
export declare const JHT_EMPLOYEE = 0.02
export declare const JP_EMPLOYEE = 0.01
export declare const JP_CAP = 10_547_400
/** Employer-paid premiums counted as taxable benefit: JKK (lowest risk class) and JKM. */
export declare const JKK_EMPLOYER = 0.0024
export declare const JKM_EMPLOYER = 0.003
