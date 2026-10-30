// Public types of @chalidade/cicilan. They mirror src/tools/cicilan/loan.ts;
// types/check.ts fails the build if they drift.

/**
 * 'flat': interest on the original principal for the whole term (common for
 * Indonesian consumer and vehicle loans). 'annuity': interest on the remaining
 * balance, equal payments (mortgages, "bunga efektif").
 */
export type Method = 'flat' | 'annuity'

export interface Row {
  month: number
  payment: number
  principal: number
  interest: number
  /** Principal left after this payment. */
  balance: number
}

export interface Loan {
  rows: Row[]
  /** The first month's payment (every month's, for both methods). */
  monthly: number
  totalInterest: number
  totalPaid: number
}

/** Longest term accepted: 1200 months (100 years). */
export declare const MAX_MONTHS = 1200
/**
 * The month-by-month schedule. `ratePct` is the yearly rate in percent, `months`
 * a whole number from 1 to MAX_MONTHS. Null for anything else (0 or negative
 * principal, NaN, Infinity…). No rounding: format the numbers yourself.
 */
export declare function buildLoan(principal: number, ratePct: number, months: number, method: Method): Loan | null
/** The schedule as CSV (comma separated, dot decimals, 2 decimals), header `bulan,angsuran,pokok,bunga,sisa_pokok`. */
export declare function loanCsv(rows: Row[]): string
/** Reads "1.500.000" (dots group thousands) and "1,5"; 0 for anything not a positive number. */
export declare const num: (s: string) => number
