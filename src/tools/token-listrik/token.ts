export interface TokenInput {
  /** Amount paid, rupiah. */
  amount: number
  /** Admin fee charged by the seller/bank, rupiah. */
  admin: number
  /** Tariff per kWh before taxes. */
  rate: number
  /** PPJ percent, e.g. 3. */
  ppjPct: number
  /** PPN percent applied on top, 0 when not applicable. */
  ppnPct: number
}

export interface TokenResult {
  /** Amount left after admin. */
  net: number
  /** Energy cost before taxes. */
  energy: number
  ppj: number
  ppn: number
  kwh: number
}

/**
 * Pay = energy × (1 + PPJ) × (1 + PPN), with energy = kWh × tariff. We work
 * backwards from the amount paid. kWh is rounded down to 2 decimals like the token.
 */
export function tokenKwh(i: TokenInput): TokenResult {
  const net = Math.max(0, i.amount - Math.max(0, i.admin))
  const energy = net / ((1 + i.ppjPct / 100) * (1 + i.ppnPct / 100))
  const withPpj = energy * (1 + i.ppjPct / 100)
  const kwh = i.rate > 0 ? Math.floor((energy / i.rate) * 100 + 1e-9) / 100 : 0
  return { net, energy, ppj: withPpj - energy, ppn: net - withPpj, kwh }
}

/** Days a token lasts at a given daily use (kWh/day); null without a use figure. */
export function daysLeft(kwh: number, perDay: number): number | null {
  return perDay > 0 ? kwh / perDay : null
}
