// Loan maths. "Flat": interest is charged on the original principal for the
// whole term. "Anuitas" (effective): interest is charged on the remaining
// balance, so every instalment is equal and the interest share shrinks.

export type Method = 'flat' | 'annuity'

export interface Row {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

export interface Loan {
  rows: Row[]
  monthly: number
  totalInterest: number
  totalPaid: number
}

/** `ratePct` is the yearly rate in percent, `months` the term. */
export function buildLoan(principal: number, ratePct: number, months: number, method: Method): Loan | null {
  if (!(principal > 0) || !(months >= 1) || !Number.isInteger(months) || !(ratePct >= 0)) return null
  const rows: Row[] = []
  let balance = principal

  if (method === 'flat') {
    const interest = (principal * ratePct) / 100 / 12
    const part = principal / months
    for (let m = 1; m <= months; m++) {
      balance = m === months ? 0 : balance - part
      rows.push({ month: m, payment: part + interest, principal: part, interest, balance })
    }
  } else {
    const i = ratePct / 100 / 12
    const pmt = i === 0 ? principal / months : (principal * i) / (1 - Math.pow(1 + i, -months))
    for (let m = 1; m <= months; m++) {
      const interest = balance * i
      const part = m === months ? balance : pmt - interest
      balance = m === months ? 0 : balance - part
      rows.push({ month: m, payment: part + interest, principal: part, interest, balance })
    }
  }

  const totalPaid = rows.reduce((s, r) => s + r.payment, 0)
  return { rows, monthly: rows[0].payment, totalInterest: totalPaid - principal, totalPaid }
}

/** Plain CSV (comma separated, dot decimals) that spreadsheets open directly. */
export function loanCsv(rows: Row[]): string {
  const r2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2)
  const head = 'bulan,angsuran,pokok,bunga,sisa_pokok'
  return [head, ...rows.map((r) => [r.month, r2(r.payment), r2(r.principal), r2(r.interest), r2(r.balance)].join(','))].join('\n') + '\n'
}

/** Accepts "1.500.000", "1500000" and "1,5" alike. */
export const num = (s: string): number => {
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}
