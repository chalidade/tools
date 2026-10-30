// The headless API. The source lives with the site (src/tools/gaji-bersih/).
// An estimate for planning, not tax advice.
//
//   import { netSalary } from '@chalidade/gaji-bersih'
//   netSalary({ gross: 10_000_000, married: false, dependents: 0, bpjs: true }).takeHome

export { netSalary, progressiveTax, ptkp, type Input, type Result } from '@/tools/gaji-bersih/payroll'
export * from '@/tools/gaji-bersih/rates'
