// Draws the labels with pdf-lib (a dynamic import, loaded on download).
// Built-in Helvetica; characters it cannot draw become "?".

import { tr } from '@/lib/i18n'
import { wrapText } from '@/tools/kwitansi/doc'
import { labelSize, MM, paginate, type Layout, type Recipient, type Sender } from './labels'

export async function buildLabels(sender: Sender, people: Recipient[], layout: Layout): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const known = new Set(font.getCharacterSet())
  const clean = (s: string) => [...s.replace(/[\t\r]/g, ' ')].map((c) => (c === '\n' || known.has(c.codePointAt(0)!) ? c : '?')).join('')
  const ink = rgb(0.08, 0.08, 0.1)
  const muted = rgb(0.4, 0.4, 0.45)

  const [lw, lh] = labelSize(layout).map((v) => v * MM)
  const pageW = layout.page[0] * MM
  const pageH = layout.page[1] * MM
  const margin = layout.margin * MM
  const pad = Math.min(9, lw * 0.05) + 3
  // Scale text with the label: 1 for an A6, smaller for 24-up sheets.
  const scale = Math.max(0.55, Math.min(1.6, Math.min(lw / 297, lh / 420) * 1.5 + 0.05))

  for (const group of paginate(people, layout)) {
    const page = doc.addPage([pageW, pageH])
    group.forEach((p, idx) => {
      const col = idx % layout.cols
      const row = Math.floor(idx / layout.cols)
      const x0 = margin + col * lw
      const yTop = pageH - margin - row * lh
      page.drawRectangle({ x: x0 + 1, y: yTop - lh + 1, width: lw - 2, height: lh - 2, borderColor: rgb(0.7, 0.7, 0.74), borderWidth: 0.6, borderDashArray: [3, 2] })

      const maxW = lw - 2 * pad
      let y = yTop - pad
      const widthOf = (s: string, size: number, f = font) => f.widthOfTextAtSize(clean(s), size)
      const lines = (s: string, size: number, f = font) => wrapText(clean(s), (t) => widthOf(t, size, f), maxW)
      const line = (s: string, size: number, f = font, color = ink) => {
        y -= size
        page.drawText(s, { x: x0 + pad, y, size, font: f, color })
        y -= size * 0.35
      }

      // Recipient block first so it gets the room; shrink only if it would overflow.
      const sCount = [sender.name, sender.phone, sender.address].some(Boolean)
      const build = (k: number) => {
        const big = 15 * k
        const mid = 11 * k
        const small = 8.5 * k
        const toLines = lines(p.address, mid)
        const nameLines = lines(p.name, big, bold)
        const sLines = lines([sender.address].filter(Boolean).join(' '), small)
        const height =
          small * 1.4 + nameLines.length * big * 1.35 + (p.phone ? mid * 1.35 : 0) + toLines.length * mid * 1.35 +
          (p.contents ? small * 1.35 * lines(`${tr('Isi', 'Contents')}: ${p.contents}`, small).length : 0) +
          (p.resi ? mid * 1.5 : 0) +
          (sCount ? small * 1.4 + small * 1.35 * (1 + sLines.length) + 14 : 0) + 6
        return { big, mid, small, toLines, nameLines, sLines, height }
      }
      let k = scale
      let m = build(k)
      while (m.height > lh - 2 * pad && k > 0.35) {
        k -= 0.05
        m = build(k)
      }

      line(tr('KEPADA', 'TO'), m.small, bold, muted)
      for (const l of m.nameLines) line(l, m.big, bold)
      if (p.phone) line(p.phone, m.mid, bold)
      for (const l of m.toLines) line(l, m.mid)
      if (p.contents) for (const l of lines(`${tr('Isi', 'Contents')}: ${p.contents}`, m.small)) line(l, m.small, font, muted)
      if (p.resi) {
        y -= 3
        line(`${tr('Resi', 'Tracking')}: ${p.resi}`, m.mid, bold)
      }
      if (sCount) {
        y -= 5
        page.drawLine({ start: { x: x0 + pad, y }, end: { x: x0 + lw - pad, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.84) })
        y -= 3
        line(tr('PENGIRIM', 'FROM'), m.small, bold, muted)
        line([sender.name, sender.phone].filter(Boolean).join(' · '), m.small, bold)
        for (const l of m.sLines) line(l, m.small)
      }
    })
  }
  const bytes = await doc.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
