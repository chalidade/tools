// Draws the receipt / invoice with pdf-lib (a dynamic import, loaded when
// "Unduh PDF" is pressed). A4, built-in Helvetica, nothing leaves the device.

import { getLang, locale, tr } from '@/lib/i18n'
import { parseNumber, toWords } from '@/tools/terbilang/terbilang'
import { totals, wrapText, type Item } from './doc'

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
  /** Receipt: the amount, digits. */
  amount: number
  items: Item[]
  discount: number
  taxPercent: number
  notes: string
  place: string
  signer: string
}

export const rupiahText = (n: number) => 'Rp ' + new Intl.NumberFormat(locale()).format(n)

export const amountWords = (n: number) => toWords(parseNumber(String(n))!, { lang: getLang(), currency: true, case: 'sentence' })

const longDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  return isNaN(+d) ? iso : d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function buildPdf(d: DocData): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const known = new Set(font.getCharacterSet())
  // Standard fonts hold only Latin-1-ish characters; anything else becomes "?".
  const clean = (s: string) => [...s.replace(/[\t\r]/g, ' ')].map((c) => (c === '\n' || known.has(c.codePointAt(0)!) ? c : '?')).join('')

  const W = 595
  const H = 842
  const M = 48
  const ink = rgb(0.1, 0.1, 0.12)
  const muted = rgb(0.4, 0.4, 0.45)
  const line = rgb(0.8, 0.8, 0.84)
  let page = doc.addPage([W, H])
  let y = H - M

  const widthOf = (s: string, size: number, f = font) => f.widthOfTextAtSize(clean(s), size)
  const text = (s: string, x: number, size = 10, f = font, color = ink) => page.drawText(clean(s), { x, y, size, font: f, color })
  const right = (s: string, xr: number, size = 10, f = font) => text(s, xr - widthOf(s, size, f), size, f)
  const rule = (yy = y) => page.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: 0.6, color: line })
  const ensure = (need: number) => {
    if (y - need < M) {
      page = doc.addPage([W, H])
      y = H - M
    }
  }
  /** Wrapped paragraph; moves y down. */
  const paragraph = (s: string, x: number, max: number, size = 10, f = font, color = ink) => {
    for (const l of wrapText(clean(s), (t) => widthOf(t, size, f), max)) {
      ensure(size + 4)
      page.drawText(l, { x, y, size, font: f, color })
      y -= size + 4
    }
  }

  const signature = () => {
    ensure(110)
    y -= 16
    const x = W - M - 180
    text([d.place, longDate(d.date)].filter(Boolean).join(', '), x)
    y -= 70
    text(d.signer || '(                              )', x, 10, bold)
    y -= 14
  }

  // Header: sender on the left, document title on the right.
  const title = d.mode === 'kwitansi' ? tr('KWITANSI', 'RECEIPT') : tr('INVOICE', 'INVOICE')
  right(title, W - M, 22, bold)
  text(d.fromName || ' ', M, 13, bold)
  y -= 16
  const top = y
  paragraph(d.fromAddress, M, 260, 9.5, font, muted)
  const after = y
  y = top
  right(`${tr('No.', 'No.')} ${d.number}`, W - M, 10)
  y -= 14
  right(longDate(d.date), W - M, 10)
  y = Math.min(after, y) - 8
  rule()
  y -= 22

  if (d.mode === 'kwitansi') {
    const label = (l: string, v: string) => {
      text(l, M, 9, font, muted)
      y -= 14
      paragraph(v || '-', M, W - 2 * M, 12)
      y -= 8
    }
    label(tr('Telah terima dari', 'Received from'), d.toName)
    label(tr('Uang sejumlah', 'The sum of'), amountWords(d.amount))
    label(tr('Untuk pembayaran', 'For payment of'), d.purpose)
    y -= 6
    ensure(60)
    page.drawRectangle({ x: M, y: y - 34, width: 230, height: 44, borderColor: ink, borderWidth: 1 })
    text(rupiahText(d.amount), M + 14, 18, bold)
    y -= 50
    if (d.notes.trim()) paragraph(d.notes, M, W - 2 * M, 9.5, font, muted)
    signature()
  } else {
    text(tr('Ditagihkan kepada', 'Bill to'), M, 9, font, muted)
    y -= 14
    text(d.toName || '-', M, 11, bold)
    y -= 14
    paragraph(d.toAddress, M, 300, 9.5, font, muted)
    y -= 14

    const colQty = 330
    const colPrice = 430
    const colAmt = W - M
    const head = () => {
      page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: rgb(0.94, 0.94, 0.96) })
      text(tr('Item', 'Item'), M + 6, 9, bold)
      right(tr('Jml', 'Qty'), colQty, 9, bold)
      right(tr('Harga', 'Price'), colPrice, 9, bold)
      right(tr('Jumlah', 'Amount'), colAmt - 6, 9, bold)
      y -= 22
    }
    head()
    for (const it of d.items) {
      const lines = wrapText(clean(it.name || '-'), (s) => widthOf(s, 10), colQty - M - 70)
      ensure(lines.length * 14 + 10)
      if (y > H - M - 1) head()
      const yy = y
      lines.forEach((l, i) => page.drawText(l, { x: M + 6, y: yy - i * 14, size: 10, font, color: ink }))
      right(String(it.qty), colQty)
      right(rupiahText(it.price), colPrice)
      right(rupiahText(Math.round(it.qty * it.price)), colAmt - 6)
      y = yy - lines.length * 14 - 2
      rule(y + 8)
    }
    y -= 10
    const t = totals(d.items, d.discount, d.taxPercent)
    const row = (l: string, v: string, f = font, size = 10) => {
      ensure(20)
      text(l, 330, size, f)
      right(v, colAmt - 6, size, f)
      y -= size + 6
    }
    row('Subtotal', rupiahText(t.subtotal))
    if (t.discount) row(tr('Diskon', 'Discount'), '- ' + rupiahText(t.discount))
    if (t.tax) row(`${tr('Pajak', 'Tax')} ${d.taxPercent}%`, rupiahText(t.tax))
    row('Total', rupiahText(t.total), bold, 12)
    y -= 6
    text(tr('Terbilang', 'In words'), M, 9, font, muted)
    y -= 14
    paragraph(amountWords(t.total), M, W - 2 * M, 10.5, bold)
    if (d.notes.trim()) {
      y -= 8
      text(tr('Catatan', 'Notes'), M, 9, font, muted)
      y -= 14
      paragraph(d.notes, M, W - 2 * M, 10)
    }
    signature()
  }

  const bytes = await doc.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
