// The numbers and layout helpers behind Kwitansi & Invoice. Amounts are whole
// rupiah (integers), so totals never pick up floating-point dust.

export interface Item {
  id: number
  name: string
  qty: number
  price: number
}

export interface Totals {
  subtotal: number
  discount: number
  tax: number
  total: number
}

const whole = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0)

/** Subtotal, discount (rupiah), tax (percent of the discounted subtotal, rounded) and total. */
export function totals(items: Item[], discount: number, taxPercent: number): Totals {
  const subtotal = items.reduce((sum, i) => sum + whole(i.qty * whole(i.price)), 0)
  const off = Math.min(whole(discount), subtotal)
  const tax = Math.round(((subtotal - off) * Math.max(0, Number.isFinite(taxPercent) ? taxPercent : 0)) / 100)
  return { subtotal, discount: off, tax, total: subtotal - off + tax }
}

/** Reads "1.250.000" or "1250000" (digits and dots/commas only) as whole rupiah. */
export const amountFromInput = (s: string) => whole(Number(s.replace(/[^\d]/g, '')))

/** Greedy word wrap with a width function; a word wider than the line is cut. */
export function wrapText(text: string, width: (s: string) => number, max: number): string[] {
  const lines: string[] = []
  for (const para of text.split(/\r?\n/)) {
    let line = ''
    for (let word of para.split(/\s+/).filter(Boolean)) {
      while (width(word) > max) {
        let cut = word.length - 1
        while (cut > 1 && width(word.slice(0, cut)) > max) cut--
        if (line) lines.push(line)
        lines.push(word.slice(0, cut))
        line = ''
        word = word.slice(cut)
      }
      const next = line ? `${line} ${word}` : word
      if (width(next) <= max) line = next
      else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  return lines
}
