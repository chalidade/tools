import {
  BPJS_KES_CAP,
  BPJS_KES_EMPLOYEE,
  BPJS_KES_EMPLOYER,
  BRACKETS,
  JHT_EMPLOYEE,
  JKK_EMPLOYER,
  JKM_EMPLOYER,
  JOB_COST_MAX_YEAR,
  JOB_COST_RATE,
  JP_CAP,
  JP_EMPLOYEE,
  PTKP_DEPENDENT,
  PTKP_MARRIED,
  PTKP_SELF,
  MAX_DEPENDENTS,
} from './rates'

export interface Input {
  /** Gross monthly salary incl. fixed allowances, rupiah. */
  gross: number
  married: boolean
  dependents: number
  bpjs: boolean
}

export interface Result {
  gross: number
  kesEmployee: number
  jhtEmployee: number
  jpEmployee: number
  taxableYear: number
  ptkp: number
  taxYear: number
  taxMonth: number
  /** Average effective tax rate on gross, percent. */
  effectivePct: number
  takeHome: number
}

export const ptkp = (married: boolean, dependents: number) =>
  PTKP_SELF + (married ? PTKP_MARRIED : 0) + Math.min(MAX_DEPENDENTS, Math.max(0, Math.floor(dependents))) * PTKP_DEPENDENT

export function progressiveTax(taxable: number): number {
  let tax = 0
  let prev = 0
  for (const b of BRACKETS) {
    if (taxable <= prev) break
    tax += (Math.min(taxable, b.upTo) - prev) * b.rate
    prev = b.upTo
  }
  return tax
}

/**
 * Annualises the monthly pay and applies Pasal 17: the average monthly tax of a
 * full year (what the December true-up converges on), expressed as an
 * effective rate. A planning estimate, not a withholding slip.
 */
export function netSalary(i: Input): Result {
  const gross = Math.max(0, i.gross)
  const kesBase = Math.min(gross, BPJS_KES_CAP)
  const jpBase = Math.min(gross, JP_CAP)
  const kesEmployee = i.bpjs ? kesBase * BPJS_KES_EMPLOYEE : 0
  const jhtEmployee = i.bpjs ? gross * JHT_EMPLOYEE : 0
  const jpEmployee = i.bpjs ? jpBase * JP_EMPLOYEE : 0
  // Employer premiums are taxable benefits; employee JHT/JP are deductible.
  const employerBenefit = i.bpjs ? kesBase * BPJS_KES_EMPLOYER + gross * (JKK_EMPLOYER + JKM_EMPLOYER) : 0

  const grossYear = (gross + employerBenefit) * 12
  const jobCost = Math.min(grossYear * JOB_COST_RATE, JOB_COST_MAX_YEAR)
  const deductions = (jhtEmployee + jpEmployee) * 12
  const p = ptkp(i.married, i.dependents)
  const taxableYear = Math.max(0, Math.floor((grossYear - jobCost - deductions - p) / 1000) * 1000)
  const taxYear = progressiveTax(taxableYear)
  const taxMonth = taxYear / 12
  return {
    gross,
    kesEmployee,
    jhtEmployee,
    jpEmployee,
    taxableYear,
    ptkp: p,
    taxYear,
    taxMonth,
    effectivePct: gross > 0 ? (taxMonth / gross) * 100 : 0,
    takeHome: gross - kesEmployee - jhtEmployee - jpEmployee - taxMonth,
  }
}
