// Writes a Letter as PDF (pdf-lib) or Word (docx). Both libraries are dynamic
// imports, loaded when a download button is pressed. Nothing leaves the device.

import { wrapText } from '@/tools/kwitansi/doc'
import { headerLine, type Letter } from './templates'

const bodyBlocks = (l: Letter) => l.blocks

export async function letterPdf(l: Letter): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.TimesRoman)
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const known = new Set(font.getCharacterSet())
  // Standard fonts hold only Latin-1-ish characters; anything else becomes "?".
  const clean = (s: string) => [...s.replace(/[\t\r]/g, ' ')].map((c) => (c === '\n' || known.has(c.codePointAt(0)!) ? c : '?')).join('')

  const W = 595
  const H = 842
  const M = 72
  const size = 12
  const lead = 17
  const ink = rgb(0.05, 0.05, 0.08)
  let page = doc.addPage([W, H])
  let y = H - M

  const widthOf = (s: string, f = font, sz = size) => f.widthOfTextAtSize(clean(s), sz)
  const ensure = (need: number) => {
    if (y - need < M) {
      page = doc.addPage([W, H])
      y = H - M
    }
  }
  const line = (s: string, x: number, f = font, sz = size) => {
    ensure(lead)
    page.drawText(clean(s), { x, y, size: sz, font: f, color: ink })
    y -= lead
  }
  const para = (s: string, x = M, max = W - 2 * M) => {
    for (const t of wrapText(clean(s), (q) => widthOf(q), max)) line(t, x)
  }

  if (l.title) {
    const t = clean(l.title)
    ensure(40)
    page.drawText(t, { x: (W - widthOf(t, bold, 14)) / 2, y, size: 14, font: bold, color: ink })
    page.drawLine({ start: { x: (W - widthOf(t, bold, 14)) / 2, y: y - 3 }, end: { x: (W + widthOf(t, bold, 14)) / 2, y: y - 3 }, thickness: 0.8, color: ink })
    y -= 34
  } else {
    const hl = headerLine(l)
    line(hl, W - M - widthOf(hl))
    y -= 10
    for (const t of l.to) line(t, M)
    if (l.to.length) y -= 8
    if (l.subject) {
      line('Perihal: ' + l.subject, M, bold)
      y -= 8
    }
  }
  if (l.opening) {
    line(l.opening, M)
    y -= 4
  }
  for (const b of bodyBlocks(l)) {
    if ('rows' in b) {
      const lw = Math.max(...b.rows.map(([k]) => widthOf(k))) + 14
      for (const [k, val] of b.rows) {
        const wrapped = wrapText(clean(val), (q) => widthOf(q), W - 2 * M - lw - 14)
        ensure(lead * wrapped.length)
        page.drawText(clean(k), { x: M + 24, y, size, font, color: ink })
        page.drawText(':', { x: M + 24 + lw, y, size, font, color: ink })
        wrapped.forEach((t, i) => {
          page.drawText(t, { x: M + 24 + lw + 12, y: y - i * lead, size, font, color: ink })
        })
        y -= lead * wrapped.length
      }
      y -= 8
    } else {
      para(b.p)
      y -= 8
    }
  }
  if (l.closing) para(l.closing)
  ensure(130)
  y -= 12
  const sx = W - M - 190
  if (l.title) {
    const hl = headerLine(l)
    line(hl, sx)
  }
  if (l.signOff) line(l.signOff, sx)
  y -= 58
  line(l.signer, sx, bold)
  if (l.signerRole) for (const t of wrapText(clean(l.signerRole), (q) => widthOf(q, font, 10), 190)) line(t, sx, font, 10)

  return new Blob([new Uint8Array(await doc.save())], { type: 'application/pdf' })
}

export async function letterDocx(l: Letter): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = await import('docx')
  const FONT = 'Times New Roman'
  const run = (text: string, o: { bold?: boolean; size?: number } = {}) => new TextRun({ text, font: FONT, size: o.size ?? 24, bold: o.bold })
  const p = (text: string, o: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {}) =>
    new Paragraph({
      alignment: o.align,
      spacing: { after: o.after ?? 160 },
      children: text.split('\n').flatMap((t, i) => [new TextRun({ text: t, font: FONT, size: 24, bold: o.bold, break: i ? 1 : 0 })]),
    })
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const noBorders = { top: none, bottom: none, left: none, right: none }

  const kids: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = []
  if (l.title) {
    kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: l.title, font: FONT, size: 28, bold: true, underline: {} })] }))
  } else {
    kids.push(p(headerLine(l), { align: AlignmentType.RIGHT, after: 240 }))
    for (const t of l.to) kids.push(p(t, { after: 0 }))
    if (l.to.length) kids.push(p('', { after: 60 }))
    if (l.subject) kids.push(p('Perihal: ' + l.subject, { bold: true, after: 240 }))
  }
  if (l.opening) kids.push(p(l.opening))
  for (const b of bodyBlocks(l)) {
    if ('rows' in b) {
      kids.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
          rows: b.rows.map(
            ([k, val]) =>
              new TableRow({
                children: [
                  new TableCell({ borders: noBorders, width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ indent: { left: 360 }, children: [run(k)] })] }),
                  new TableCell({ borders: noBorders, width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [run(': ' + val)] })] }),
                ],
              }),
          ),
        }),
        p('', { after: 80 }),
      )
    } else kids.push(p(b.p))
  }
  if (l.closing) kids.push(p(l.closing))
  const right = AlignmentType.LEFT
  const sign = (t: string, o: { bold?: boolean; after?: number } = {}) =>
    new Paragraph({ alignment: right, indent: { left: 5600 }, spacing: { after: o.after ?? 0 }, children: [run(t, o)] })
  kids.push(p('', { after: 200 }))
  if (l.title) kids.push(sign(headerLine(l)))
  if (l.signOff) kids.push(sign(l.signOff))
  kids.push(sign('', { after: 900 }), sign(l.signer, { bold: true }))
  if (l.signerRole) kids.push(sign(l.signerRole))

  const doc = new Document({
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: kids }],
  })
  return Packer.toBlob(doc)
}
