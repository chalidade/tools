// The headless API. The source lives with the site (src/tools/cicilan/).
//
//   import { buildLoan } from '@chalidade/cicilan'
//   buildLoan(100_000_000, 12, 12, 'annuity')?.monthly

export { buildLoan, loanCsv, num, MAX_MONTHS, type Method, type Row, type Loan } from '@/tools/cicilan/loan'
