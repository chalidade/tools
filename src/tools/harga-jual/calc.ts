// The numbers behind Kalkulator Harga Jual & HPP. No marketplace rates live
// here: every fee, discount and tax is typed in by the user, as a percent of
// the price or as a rupiah amount per order.

export type Unit = 'pct' | 'rp'
export interface Adj {
  value: number
  unit: Unit
}
export type Target = 'margin' | 'markup' | 'manual'

export interface Costs {
  /** Cost of the whole batch, rupiah. */
  materials: number
  packaging: number
  labor: number
  other: number
  /** Units made from that batch. */
  quantity: number
}

export interface Inputs {
  costs: Costs
  target: Target
  /** Percent when target is margin or markup. */
  targetPercent: number
  /** Listed price when target is manual. */
  manualPrice: number
  /** Round the listed price up to a multiple of this (1 = none). */
  rounding: number
  admin: Adj
  service: Adj
  tax: Adj
  /** Discount off the listed price. */
  discount: Adj
  /** Fixed costs to recover (rent, equipment), rupiah, optional. */
  fixed: number
}

export interface Result {
  ok: boolean
  /** Why it cannot be solved (percent cuts eat the whole price). */
  problem?: 'quantity' | 'percent'
  hpp: number
  /** Price shown to the buyer, before the discount. */
  listPrice: number
  /** What the buyer pays after the discount. */
  sellPrice: number
  fees: number
  /** Money kept per unit after fees and tax, before HPP. */
  net: number
  profit: number
  /** profit / sell price, percent. */
  margin: number
  /** profit / HPP, percent. */
  markup: number
  /** Units whose profit covers the fixed costs; 0 when there are none, Infinity when profit <= 0. */
  breakEven: number
}

const num = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

export function hppPerUnit(c: Costs): number {
  const q = Math.floor(num(c.quantity))
  if (q < 1) return 0
  return (num(c.materials) + num(c.packaging) + num(c.labor) + num(c.other)) / q
}

const pctOf = (a: Adj) => (a.unit === 'pct' ? Math.min(num(a.value), 100) / 100 : 0)
const rpOf = (a: Adj) => (a.unit === 'rp' ? num(a.value) : 0)

const empty = (problem: Result['problem'], hpp = 0): Result => ({
  ok: false, problem, hpp, listPrice: 0, sellPrice: 0, fees: 0, net: 0, profit: 0, margin: 0, markup: 0, breakEven: 0,
})

/** What happens at a given listed price. */
export function evaluate(i: Inputs, listPrice: number): Result {
  const hpp = hppPerUnit(i.costs)
  const sell = Math.max(0, listPrice * (1 - pctOf(i.discount)) - rpOf(i.discount))
  const fees = sell * (pctOf(i.admin) + pctOf(i.service) + pctOf(i.tax)) + rpOf(i.admin) + rpOf(i.service) + rpOf(i.tax)
  const net = sell - fees
  const profit = net - hpp
  const fixed = num(i.fixed)
  return {
    ok: true,
    hpp,
    listPrice,
    sellPrice: sell,
    fees,
    net,
    profit,
    margin: sell > 0 ? (profit / sell) * 100 : 0,
    markup: hpp > 0 ? (profit / hpp) * 100 : 0,
    breakEven: fixed <= 0 ? 0 : profit > 0 ? Math.ceil(fixed / profit - 1e-9) : Infinity,
  }
}

/** Listed price that reaches the target margin or markup, or the manual price. */
export function solve(i: Inputs): Result {
  if (Math.floor(num(i.costs.quantity)) < 1) return empty('quantity')
  const hpp = hppPerUnit(i.costs)
  if (i.target === 'manual') return evaluate(i, num(i.manualPrice))

  const f = pctOf(i.admin) + pctOf(i.service) + pctOf(i.tax)
  const rp = rpOf(i.admin) + rpOf(i.service) + rpOf(i.tax)
  const t = num(i.targetPercent) / 100
  // Sell price S: S - S*f - rp - hpp = profit, with profit = t*S (margin) or t*hpp (markup).
  const sell = i.target === 'margin' ? (hpp + rp) / (1 - f - t) : (hpp * (1 + t) + rp) / (1 - f)
  const den = i.target === 'margin' ? 1 - f - t : 1 - f
  const dp = pctOf(i.discount)
  if (den <= 0 || dp >= 1 || !Number.isFinite(sell)) return empty('percent', hpp)
  // S = list*(1 - dp) - dRp
  const list = (sell + rpOf(i.discount)) / (1 - dp)
  const step = Math.max(1, Math.floor(num(i.rounding)))
  return evaluate(i, Math.ceil(list / step - 1e-9) * step)
}
