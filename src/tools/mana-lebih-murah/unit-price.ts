// Unit-price comparison: every pack is converted to one base unit (g, ml or pcs) so prices
// of different sizes can be compared.

export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'pcs'
export type Dimension = 'mass' | 'volume' | 'count'

export const UNITS: { value: Unit; dim: Dimension; factor: number }[] = [
  { value: 'g', dim: 'mass', factor: 1 },
  { value: 'kg', dim: 'mass', factor: 1000 },
  { value: 'ml', dim: 'volume', factor: 1 },
  { value: 'l', dim: 'volume', factor: 1000 },
  { value: 'pcs', dim: 'count', factor: 1 },
]

const info = (u: Unit) => UNITS.find((x) => x.value === u)!

export interface Pack {
  price: number
  /** Pieces in a pack (e.g. 6 cans). */
  count: number
  size: number
  unit: Unit
}

export interface Ranked {
  /** Price per 1 base unit (g, ml or pcs). */
  perBase: number
  dim: Dimension
}

export function unitPrice(p: Pack): Ranked | null {
  const { price, count, size } = p
  if (!(price > 0) || !(count > 0) || !(size > 0)) return null
  const u = info(p.unit)
  return { perBase: price / (count * size * u.factor), dim: u.dim }
}

export interface Comparison {
  /** Index of the cheapest pack among comparable ones, or -1. */
  best: number
  /** Percent more expensive than the cheapest, per index (0 for the best, null if unpriced). */
  extra: (number | null)[]
  /** True when packs of different dimensions (e.g. g vs ml) were mixed. */
  mixed: boolean
}

export function compare(packs: Pack[]): Comparison {
  const ranked = packs.map(unitPrice)
  const dims = new Set(ranked.filter(Boolean).map((r) => r!.dim))
  const mixed = dims.size > 1
  // With mixed dimensions only the first one found is ranked.
  const dim = ranked.find(Boolean)?.dim
  const valid = ranked.map((r) => (r && r.dim === dim ? r : null))
  const prices = valid.filter(Boolean).map((r) => r!.perBase)
  if (prices.length === 0) return { best: -1, extra: ranked.map(() => null), mixed }
  const min = Math.min(...prices)
  return {
    best: valid.findIndex((r) => r?.perBase === min),
    extra: valid.map((r) => (r ? (r.perBase / min - 1) * 100 : null)),
    mixed,
  }
}

/** Shows the per-base price in the unit people compare by: per 100 g, per kg, per 100 ml, per l, per pcs. */
export function displayPrice(r: Ranked): { per: string; value: number } {
  if (r.dim === 'count') return { per: 'pcs', value: r.perBase }
  if (r.dim === 'mass') return r.perBase * 100 >= 1 ? { per: '100 g', value: r.perBase * 100 } : { per: 'kg', value: r.perBase * 1000 }
  return r.perBase * 100 >= 1 ? { per: '100 ml', value: r.perBase * 100 } : { per: 'l', value: r.perBase * 1000 }
}
