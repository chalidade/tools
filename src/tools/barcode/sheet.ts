// A print-ready sheet of barcode labels, drawn as vector shapes with pdf-lib
// (a dynamic import, loaded on download).

import { drawBarcode, encodeBarcode, type BarcodeType, type Encoded } from './barcode'

export interface SheetLayout {
  id: string
  label: string
  cols: number
  rows: number
}

export const SHEETS: SheetLayout[] = [
  { id: '2x5', label: '2 × 5 (10)', cols: 2, rows: 5 },
  { id: '3x8', label: '3 × 8 (24)', cols: 3, rows: 8 },
  { id: '4x10', label: '4 × 10 (40)', cols: 4, rows: 10 },
]

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 28

export interface SheetOpts {
  type: BarcodeType
  values: string[]
  copies: number
  layout: SheetLayout
  showText: boolean
}

/** Values the sheet can encode, repeated `copies` times; invalid ones are skipped. */
export function sheetLabels(o: Pick<SheetOpts, 'type' | 'values' | 'copies'>) {
  const out: Encoded[] = []
  for (const v of o.values) {
    const r = encodeBarcode(o.type, v)
    if (!r.ok) continue
    for (let i = 0; i < o.copies; i++) out.push(r.code)
  }
  return out
}

export async function buildSheet(o: SheetOpts): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const labels = sheetLabels(o)
  const perPage = o.layout.cols * o.layout.rows
  const cellW = (A4[0] - MARGIN * 2) / o.layout.cols
  const cellH = (A4[1] - MARGIN * 2) / o.layout.rows
  const pad = 8
  for (let start = 0; start < Math.max(labels.length, 1); start += perPage) {
    const page = doc.addPage(A4)
    labels.slice(start, start + perPage).forEach((code, idx) => {
      const col = idx % o.layout.cols
      const row = Math.floor(idx / o.layout.cols)
      const x0 = MARGIN + col * cellW
      const yTop = A4[1] - MARGIN - row * cellH
      // Draw at module = 1 then scale to the cell.
      const d = drawBarcode(code, { module: 1, height: 50, showText: o.showText, quiet: 4 })
      const k = Math.min((cellW - pad * 2) / d.width, (cellH - pad * 2) / d.height)
      const ox = x0 + (cellW - d.width * k) / 2
      const oy = yTop - (cellH - d.height * k) / 2
      for (const r of d.rects) {
        page.drawRectangle({ x: ox + r.x * k, y: oy - (r.y + r.h) * k, width: r.w * k, height: r.h * k, color: rgb(0, 0, 0) })
      }
      for (const t of d.texts) {
        const size = t.size * k
        const w = font.widthOfTextAtSize(t.s, size)
        const x = ox + t.x * k - (t.anchor === 'middle' ? w / 2 : t.anchor === 'end' ? w : 0)
        page.drawText(t.s, { x, y: oy - t.y * k, size, font, color: rgb(0, 0, 0) })
      }
    })
  }
  const bytes = await doc.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
