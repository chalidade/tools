// Public types of @chalidade/kwitansi. They mirror src/tools/kwitansi/doc.ts
// and src/tools/kwitansi/pdf.ts; types/check.ts fails the build if they drift.

export interface Item {
  id: number
  name: string
  qty: number
  /** Unit price in whole rupiah. */
  price: number
}

export interface Totals {
  subtotal: number
  discount: number
  tax: number
  total: number
}

/** Subtotal, discount (rupiah, capped at the subtotal), tax (percent of the discounted subtotal, rounded) and total. Whole rupiah. */
export declare function totals(items: Item[], discount: number, taxPercent: number): Totals
/** "1.250.000" or "Rp 1,250,000" → 1250000 (digits only, whole rupiah). */
export declare function amountFromInput(s: string): number
/** Greedy word wrap with your own width function; a word wider than the line is cut. */
export declare function wrapText(text: string, width: (s: string) => number, max: number): string[]

export interface DocData {
  mode: 'kwitansi' | 'invoice'
  number: string
  /** yyyy-mm-dd */
  date: string
  fromName: string
  fromAddress: string
  toName: string
  toAddress: string
  /** Receipt: what the payment is for. */
  purpose: string
  /** Receipt: the amount, whole rupiah. */
  amount: number
  /** Invoice lines. */
  items: Item[]
  discount: number
  taxPercent: number
  notes: string
  place: string
  signer: string
}

/** "Rp 1.250.000" (grouping follows the UI language). */
export declare function rupiahText(n: number): string
/** The amount in words, e.g. "Satu juta dua ratus lima puluh ribu rupiah". */
export declare function amountWords(n: number): string
/** An A4 receipt or invoice PDF (pdf-lib, Helvetica). Characters outside Latin-1 print as "?". */
export declare function buildPdf(d: DocData): Promise<Blob>

/** Language of the generated text (amount in words, dates, PDF labels): 'id' or 'en'. Default: the visitor's browser language. */
export declare function setLanguage(lang: 'id' | 'en'): void
