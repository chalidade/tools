// Percentage maths shared by the "Persen & Diskon" calculator. Pure functions, no rounding:
// the UI formats.

export const finite = (n: number) => (Number.isFinite(n) ? n : null)

/** X% of Y. */
export const percentOf = (x: number, y: number) => finite((x / 100) * y)

/** Y is what percent of Z; null when Z is 0. */
export const whatPercent = (y: number, z: number) => (z === 0 ? null : finite((y / z) * 100))

/** Change from a to b in percent (positive = increase); null when a is 0. */
export const percentChange = (a: number, b: number) => (a === 0 ? null : finite(((b - a) / Math.abs(a)) * 100))

export interface DiscountStep {
  percent: number
  /** Price before this step and after it. */
  from: number
  to: number
  saved: number
}

export interface Discounts {
  steps: DiscountStep[]
  final: number
  saved: number
  /** Combined discount in percent: 50% then 20% is 60%, not 70%. */
  combined: number
}

/** Successive discounts, each applied to the price left by the previous one. */
export function stackedDiscount(price: number, percents: number[]): Discounts {
  let current = price
  const steps = percents.map((percent) => {
    const to = current * (1 - percent / 100)
    const step = { percent, from: current, to, saved: current - to }
    current = to
    return step
  })
  return { steps, final: current, saved: price - current, combined: price === 0 ? 0 : ((price - current) / price) * 100 }
}

/** Parses "1.500,5" / "1,500.5" / "12,5" — the last separator is the decimal one unless exactly three digits follow it (then it groups thousands). */
export function parseNumber(input: string) {
  const s = input.trim().replace(/\s/g, '')
  if (!s) return NaN
  const m = s.match(/^(-?)([\d.,]*)$/)
  if (!m) return NaN
  const body = m[2]
  const last = Math.max(body.lastIndexOf('.'), body.lastIndexOf(','))
  if (last === -1) return Number(m[1] + body)
  const frac = body.slice(last + 1)
  const sep = body[last]
  const others = body.slice(0, last)
  const isDecimal = frac.length > 0 && frac.length !== 3 && !others.includes(sep)
  if (isDecimal) return Number(m[1] + others.replace(/[.,]/g, '') + '.' + frac)
  return Number(m[1] + body.replace(/[.,]/g, ''))
}
