// Mortgage (KPR) maths. Indonesian banks quote a fixed rate for the first
// years, then a floating rate: the instalment is an annuity over the whole
// term at the fixed rate, and when the rate changes it is recomputed as an
// annuity on the remaining balance over the remaining months. The floating
// rate is the visitor's guess; nobody knows it in advance.

export interface MortgageInput {
  /** Property price. */
  price: number
  /** Down payment, percent of the price (0–100). */
  downPct: number
  /** Term in years. */
  years: number
  /** Fixed rate per year, percent. */
  fixedRate: number
  /** Years at the fixed rate (0 = floating from the start). */
  fixedYears: number
  /** Floating rate per year, percent, after the fixed years. */
  floatRate: number
}

export interface Row {
  month: number
  rate: number
  payment: number
  principal: number
  interest: number
  balance: number
}

export interface YearRow {
  year: number
  paid: number
  principal: number
  interest: number
  balance: number
}

export interface Mortgage {
  down: number
  loan: number
  rows: Row[]
  years: YearRow[]
  /** Instalment during the fixed years (or the only one, if never floating). */
  fixedPayment: number
  /** Instalment once floating; null when the fixed rate lasts the whole term. */
  floatPayment: number | null
  totalInterest: number
  totalPaid: number
}

export const MAX_YEARS = 40

const annuity = (balance: number, monthlyRate: number, months: number) =>
  monthlyRate === 0 ? balance / months : (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))

const valid = (n: number, min: number, max = Infinity) => Number.isFinite(n) && n >= min && n <= max

export function buildMortgage(input: MortgageInput): Mortgage | null {
  const { price, downPct, years, fixedRate, fixedYears, floatRate } = input
  if (!valid(price, 0) || price === 0 || !valid(downPct, 0, 99.99) || !valid(years, 1, MAX_YEARS) || !Number.isInteger(years)) return null
  if (!valid(fixedRate, 0, 100) || !valid(fixedYears, 0, years) || !Number.isInteger(fixedYears) || !valid(floatRate, 0, 100)) return null

  const down = (price * downPct) / 100
  const loan = price - down
  const months = years * 12
  const fixedMonths = fixedYears * 12
  const rows: Row[] = []
  let balance = loan
  let payment = 0
  let fixedPayment = 0
  let floatPayment: number | null = null

  for (let m = 1; m <= months; m++) {
    const fixed = m <= fixedMonths
    const rate = fixed ? fixedRate : floatRate
    const i = rate / 100 / 12
    if (m === 1 || m === fixedMonths + 1) {
      payment = annuity(balance, i, months - m + 1)
      if (fixed || fixedMonths === 0) fixedPayment = payment
      if (!fixed) floatPayment = payment
    }
    const interest = balance * i
    const principal = m === months ? balance : payment - interest
    balance = m === months ? 0 : balance - principal
    rows.push({ month: m, rate, payment: principal + interest, principal, interest, balance })
  }
  // Floating from the very first month: there is one instalment, shown as the fixed one.
  if (fixedMonths === 0) floatPayment = null

  const yearRows: YearRow[] = []
  for (let y = 0; y < years; y++) {
    const slice = rows.slice(y * 12, y * 12 + 12)
    yearRows.push({
      year: y + 1,
      paid: slice.reduce((s, r) => s + r.payment, 0),
      principal: slice.reduce((s, r) => s + r.principal, 0),
      interest: slice.reduce((s, r) => s + r.interest, 0),
      balance: slice[slice.length - 1].balance,
    })
  }

  const totalPaid = rows.reduce((s, r) => s + r.payment, 0)
  return { down, loan, rows, years: yearRows, fixedPayment, floatPayment, totalInterest: totalPaid - loan, totalPaid }
}

/**
 * The highest price whose instalment stays within `share` of a monthly income,
 * at the fixed rate (banks check affordability against the first instalment).
 */
export function maxPrice(income: number, share: number, input: Omit<MortgageInput, 'price'>): number {
  const i = input.fixedYears > 0 ? input.fixedRate / 100 / 12 : input.floatRate / 100 / 12
  const months = input.years * 12
  const budget = income * share
  const loan = i === 0 ? budget * months : (budget * (1 - Math.pow(1 + i, -months))) / i
  return loan / (1 - input.downPct / 100)
}

/** Plain CSV (comma separated, dot decimals), one row per month. */
export function mortgageCsv(rows: Row[]): string {
  const r2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2)
  const head = 'bulan,bunga_pct,angsuran,pokok,bunga,sisa_pokok'
  return [head, ...rows.map((r) => [r.month, r.rate, r2(r.payment), r2(r.principal), r2(r.interest), r2(r.balance)].join(','))].join('\n') + '\n'
}
