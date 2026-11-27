import { LEAVE_DIVISOR, PESANGON_TABLE, UPMK_TABLE, type Reason } from './rules'

/** Whole years of service from total months. */
export const wholeYears = (months: number) => Math.floor(Math.max(0, months) / 12)

function lookup(table: [number, number][], years: number): number {
  let v = 0
  for (const [min, m] of table) if (years >= min) v = m
  return v
}

export const pesangonMonths = (years: number) => lookup(PESANGON_TABLE, years)
export const upmkMonths = (years: number) => lookup(UPMK_TABLE, years)

export interface Severance {
  years: number
  pesangonBase: number
  upmkBase: number
  pesangon: number
  upmk: number
  leave: number
  other: number
  total: number
}

/** wage = monthly wage (basic + fixed allowances). */
export function severance(wage: number, serviceMonths: number, r: Reason, leaveDays: number, other: number): Severance {
  const years = wholeYears(serviceMonths)
  const pesangonBase = pesangonMonths(years)
  const upmkBase = upmkMonths(years)
  const pesangon = pesangonBase * r.pesangon * wage
  const upmk = upmkBase * r.upmk * wage
  const leave = (Math.max(0, leaveDays) * wage) / LEAVE_DIVISOR
  const o = Math.max(0, other)
  return { years, pesangonBase, upmkBase, pesangon, upmk, leave, other: o, total: pesangon + upmk + leave + o }
}
