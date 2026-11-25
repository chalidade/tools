// Parsing and layout for Label Pengiriman. Sizes are millimetres; the PDF is
// drawn in points (1 mm = 72 / 25.4 pt).

import { detectSeparator, parseCsv } from '@/lib/csv'

export interface Recipient {
  id: number
  name: string
  phone: string
  address: string
  /** Tracking number, optional. */
  resi: string
  /** What is in the parcel, optional. */
  contents: string
}

export interface Sender {
  name: string
  phone: string
  address: string
}

export interface Layout {
  id: string
  /** Page size, mm. */
  page: [number, number]
  cols: number
  rows: number
  /** Margin around the grid on the page, mm. */
  margin: number
  label: [string, string]
}

// A4 grids split the sheet evenly (no gaps), so any sticker sheet of that grid
// lines up; the single-label pages fill the page.
export const LAYOUTS: Layout[] = [
  { id: 'a6', page: [105, 148], cols: 1, rows: 1, margin: 4, label: ['Satu label per halaman A6 (105 × 148 mm)', 'One label per A6 page (105 × 148 mm)'] },
  { id: 'thermal', page: [100, 150], cols: 1, rows: 1, margin: 3, label: ['Stiker resi 100 × 150 mm (printer thermal)', 'Shipping sticker 100 × 150 mm (thermal printer)'] },
  { id: 'a4-2x3', page: [210, 297], cols: 2, rows: 3, margin: 0, label: ['A4 · 6 label per lembar (2 × 3)', 'A4 · 6 labels per sheet (2 × 3)'] },
  { id: 'a4-2x4', page: [210, 297], cols: 2, rows: 4, margin: 0, label: ['A4 · 8 label per lembar (2 × 4)', 'A4 · 8 labels per sheet (2 × 4)'] },
  { id: 'a4-2x5', page: [210, 297], cols: 2, rows: 5, margin: 0, label: ['A4 · 10 label per lembar (2 × 5)', 'A4 · 10 labels per sheet (2 × 5)'] },
  { id: 'a4-3x8', page: [210, 297], cols: 3, rows: 8, margin: 0, label: ['A4 · 24 label kecil per lembar (3 × 8)', 'A4 · 24 small labels per sheet (3 × 8)'] },
]

export const MM = 72 / 25.4

export function labelSize(l: Layout): [number, number] {
  return [(l.page[0] - 2 * l.margin) / l.cols, (l.page[1] - 2 * l.margin) / l.rows]
}

/** Cell positions on each page, as top-left corners in mm, row by row. */
export function paginate<T>(items: T[], l: Layout): T[][] {
  const per = l.cols * l.rows
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += per) pages.push(items.slice(i, i + per))
  return pages
}

const HEADER = /^(nama|name|penerima|receiver|recipient)\b/i

/**
 * Reads pasted rows: name, phone, address, tracking no., contents. Excel pastes
 * tab-separated text; CSV with "," or ";" works too. A header row is skipped.
 * Rows with no name and no address are dropped.
 */
export function parseRecipients(text: string, startId = 1): Recipient[] {
  const trimmed = text.replace(/^\s*\n/, '')
  if (!trimmed.trim()) return []
  const rows = parseCsv(trimmed, detectSeparator(trimmed))
  if (rows.length && HEADER.test(rows[0][0]?.trim() ?? '')) rows.shift()
  const out: Recipient[] = []
  for (const r of rows) {
    const c = (i: number) => (r[i] ?? '').trim()
    if (!c(0) && !c(2)) continue
    out.push({ id: startId + out.length, name: c(0), phone: c(1), address: c(2), resi: c(3), contents: c(4) })
  }
  return out
}
