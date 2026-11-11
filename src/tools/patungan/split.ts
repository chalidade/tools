// Bill splitting: pure logic, no React.

export type Item = {
  id: number
  name: string
  price: number
  /** Person ids who share this item. Empty = everyone. */
  who: number[]
}

export type Person = { id: number; name: string }

export type Mode = 'equal' | 'items'

export type Rounding = 'exact' | 100 | 500 | 1000

export type Share = {
  person: Person
  subtotal: number
  service: number
  tax: number
  /** Amount to pay, whole rupiah (rounded up if a rounding step is chosen). */
  total: number
}

export type Split = {
  subtotal: number
  service: number
  tax: number
  grand: number
  shares: Share[]
  /** What people pay beyond the bill because of rounding up (0 when exact). */
  extra: number
}

export const num = (s: string) => {
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Split `total` whole units across `weights` proportionally so the parts add up
 * to exactly `total` (largest-remainder method; ties go to the earlier index).
 */
export function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!weights.length) return []
  if (sum <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (total * w) / sum)
  const parts = raw.map(Math.floor)
  let left = total - parts.reduce((a, b) => a + b, 0)
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (let k = 0; left > 0 && k < order.length; k++, left--) parts[order[k].i]++
  return parts
}

const roundUp = (n: number, step: Rounding) => (step === 'exact' ? n : Math.ceil(n / step) * step)

export function splitBill(opts: {
  people: Person[]
  items: Item[]
  mode: Mode
  /** Used in 'equal' mode as the bill subtotal. */
  equalTotal: number
  servicePct: number
  taxPct: number
  rounding: Rounding
}): Split | null {
  const { people, items, mode, servicePct, taxPct, rounding } = opts
  if (!people.length) return null

  // Subtotal per person (whole rupiah, remainders allocated exactly).
  let base: number[]
  if (mode === 'equal') {
    const total = Math.round(opts.equalTotal)
    base = apportion(total, people.map(() => 1))
  } else {
    base = people.map(() => 0)
    for (const it of items) {
      const price = Math.round(it.price)
      if (price <= 0) continue
      const ids = new Set(people.map((p) => p.id))
      const sharers = it.who.filter((id) => ids.has(id))
      const idx = (sharers.length ? sharers : people.map((p) => p.id)).map((id) => people.findIndex((p) => p.id === id))
      const parts = apportion(price, idx.map(() => 1))
      idx.forEach((pi, k) => (base[pi] += parts[k]))
    }
  }

  const subtotal = base.reduce((a, b) => a + b, 0)
  if (subtotal <= 0) return null

  // Service on subtotal; tax on subtotal + service (the usual restaurant bill).
  const service = Math.round((subtotal * servicePct) / 100)
  const tax = Math.round(((subtotal + service) * taxPct) / 100)
  const serviceParts = apportion(service, base)
  const taxParts = apportion(tax, base.map((b, i) => b + serviceParts[i]))

  const shares: Share[] = people.map((person, i) => {
    const exact = base[i] + serviceParts[i] + taxParts[i]
    return { person, subtotal: base[i], service: serviceParts[i], tax: taxParts[i], total: roundUp(exact, rounding) }
  })
  const grand = subtotal + service + tax
  const paid = shares.reduce((a, s) => a + s.total, 0)
  return { subtotal, service, tax, grand, shares, extra: paid - grand }
}

export function summaryText(
  split: Split,
  o: { title: string; rp: (n: number) => string; labels: { subtotal: string; service: string; tax: string; total: string; extra: string; each: string } },
): string {
  const lines = [o.title]
  for (const s of split.shares) lines.push(`• ${s.person.name}: ${o.rp(s.total)}`)
  lines.push('')
  if (split.service) lines.push(`${o.labels.service}: ${o.rp(split.service)}`)
  if (split.tax) lines.push(`${o.labels.tax}: ${o.rp(split.tax)}`)
  lines.push(`${o.labels.total}: ${o.rp(split.grand)}`)
  if (split.extra > 0) lines.push(`${o.labels.extra}: ${o.rp(split.extra)}`)
  return lines.join('\n')
}
