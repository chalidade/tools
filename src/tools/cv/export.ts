// Writes a CV as PDF (pdf-lib) or Word (docx). Both keep real text, one
// column and standard headings so applicant-tracking systems can read them.
// Both libraries are dynamic imports. Nothing leaves the device.

import { wrapText } from '@/tools/kwitansi/doc'
import type { CvDoc, Layout } from './model'

interface Style {
  serif: boolean
  size: number
  lead: number
  margin: number
  nameSize: number
  center: boolean
  upper: boolean
  /** RGB 0–1 for headings and the name. */
  accent: [number, number, number]
  gap: number
}

export const STYLES: Record<Layout, Style> = {
  classic: { serif: true, size: 11, lead: 14.5, margin: 56, nameSize: 22, center: true, upper: true, accent: [0.05, 0.05, 0.08], gap: 9 },
  modern: { serif: false, size: 10.5, lead: 14, margin: 52, nameSize: 26, center: false, upper: true, accent: [0.15, 0.25, 0.6], gap: 10 },
  compact: { serif: false, size: 9.5, lead: 12.5, margin: 40, nameSize: 20, center: false, upper: false, accent: [0.05, 0.05, 0.08], gap: 6 },
}

export async function cvPdf(doc: CvDoc, layout: Layout): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const st = STYLES[layout]
  const pdf = await PDFDocument.create()
  const F = StandardFonts
  const font = await pdf.embedFont(st.serif ? F.TimesRoman : F.Helvetica)
  const bold = await pdf.embedFont(st.serif ? F.TimesRomanBold : F.HelveticaBold)
  const italic = await pdf.embedFont(st.serif ? F.TimesRomanItalic : F.HelveticaOblique)
  const known = new Set(font.getCharacterSet())
  // Standard fonts hold only Latin-1-ish characters; anything else becomes "?".
  const clean = (s: string) => [...s.replace(/[\t\r\n]/g, ' ')].map((c) => (known.has(c.codePointAt(0)!) ? c : '?')).join('')

  const W = 595
  const H = 842
  const M = st.margin
  const inner = W - 2 * M
  const ink = rgb(0.07, 0.07, 0.1)
  const accent = rgb(...st.accent)
  type Font = typeof font
  let page = pdf.addPage([W, H])
  let y = H - M

  const wd = (s: string, f: Font = font, sz = st.size) => f.widthOfTextAtSize(clean(s), sz)
  const ensure = (need: number) => {
    if (y - need < M) {
      page = pdf.addPage([W, H])
      y = H - M
    }
  }
  const text = (s: string, x: number, f: Font = font, sz = st.size, color = ink) => page.drawText(clean(s), { x, y, size: sz, font: f, color })
  const wrap = (s: string, max: number, f: Font = font, sz = st.size) => wrapText(clean(s), (q) => wd(q, f, sz), max)
  const row = (s: string, x: number, f: Font = font, sz = st.size, color = ink) => {
    ensure(st.lead)
    text(s, x, f, sz, color)
    y -= st.lead
  }

  // Header
  y -= st.nameSize * 0.6
  const nameX = (s: string, f: Font, sz: number) => (st.center ? (W - wd(s, f, sz)) / 2 : M)
  if (doc.name) {
    for (const t of wrap(doc.name, inner, bold, st.nameSize)) {
      text(t, nameX(t, bold, st.nameSize), bold, st.nameSize, accent)
      y -= st.nameSize * 1.15
    }
  }
  if (doc.headline) {
    for (const t of wrap(doc.headline, inner, font, st.size + 2)) {
      text(t, nameX(t, font, st.size + 2), font, st.size + 2)
      y -= st.lead + 1
    }
  }
  if (doc.contact.length) {
    for (const t of wrap(doc.contact.join('  |  '), inner)) {
      text(t, nameX(t, font, st.size), font)
      y -= st.lead
    }
  }
  y -= st.gap

  for (const sec of doc.sections) {
    ensure(st.lead * 4)
    const head = st.upper ? sec.heading.toUpperCase() : sec.heading
    text(head, M, bold, st.size + 1, accent)
    y -= 4
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: accent })
    y -= st.lead - 1
    for (const b of sec.blocks) {
      if (b.kind === 'text') {
        for (const t of wrap(b.text, inner)) row(t, M)
        y -= 3
      } else if (b.kind === 'bullets') {
        for (const item of b.items) bullet(item)
        y -= 3
      } else {
        ensure(st.lead * 3)
        const rw = b.right ? wd(b.right) : 0
        const titleLines = wrap(b.title, inner - (rw ? rw + 12 : 0), bold)
        titleLines.forEach((t, i) => {
          ensure(st.lead)
          text(t, M, bold)
          if (i === 0 && b.right) text(b.right, W - M - rw)
          y -= st.lead
        })
        if (b.sub) for (const t of wrap(b.sub, inner, italic)) row(t, M, italic)
        for (const item of b.bullets) bullet(item)
        y -= 5
      }
    }
    y -= st.gap - 4
  }

  function bullet(s: string) {
    const ls = wrap(s, inner - 16)
    ensure(st.lead)
    text('•', M + 4)
    ls.forEach((t, i) => {
      if (i) ensure(st.lead)
      text(t, M + 16)
      y -= st.lead
    })
  }

  pdf.setTitle(doc.name ? `CV ${doc.name}` : 'CV')
  if (doc.name) pdf.setAuthor(doc.name)
  return new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' })
}

export async function cvDocx(doc: CvDoc, layout: Layout): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, BorderStyle, HeadingLevel } = await import('docx')
  const st = STYLES[layout]
  const FONT = st.serif ? 'Times New Roman' : 'Arial'
  const half = Math.round(st.size * 2)
  const hex = st.accent.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
  const MARGIN = Math.round(st.margin * 20)
  const WIDTH = 11906 - 2 * MARGIN
  const run = (t: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) =>
    new TextRun({ text: t, font: FONT, size: o.size ?? half, bold: o.bold, italics: o.italics, color: o.color })
  const align = st.center ? AlignmentType.CENTER : AlignmentType.LEFT
  const gap = Math.round(st.gap * 20)

  const kids: InstanceType<typeof Paragraph>[] = []
  if (doc.name) kids.push(new Paragraph({ alignment: align, spacing: { after: 40 }, children: [run(doc.name, { bold: true, size: st.nameSize * 2, color: hex })] }))
  if (doc.headline) kids.push(new Paragraph({ alignment: align, spacing: { after: 40 }, children: [run(doc.headline, { size: half + 4 })] }))
  if (doc.contact.length) kids.push(new Paragraph({ alignment: align, spacing: { after: gap }, children: [run(doc.contact.join('  |  '))] }))

  for (const sec of doc.sections) {
    kids.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        keepNext: true,
        spacing: { before: gap * 2, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: hex, space: 2 } },
        children: [run(st.upper ? sec.heading.toUpperCase() : sec.heading, { bold: true, size: half + 2, color: hex })],
      }),
    )
    const bullet = (t: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: [run(t)] })
    for (const b of sec.blocks) {
      if (b.kind === 'text') kids.push(new Paragraph({ spacing: { after: 60 }, children: [run(b.text)] }))
      else if (b.kind === 'bullets') kids.push(...b.items.map(bullet))
      else {
        kids.push(
          new Paragraph({
            keepNext: true,
            spacing: { before: 60, after: 0 },
            tabStops: [{ type: TabStopType.RIGHT, position: WIDTH }],
            children: [run(b.title, { bold: true }), ...(b.right ? [new TextRun({ text: '\t' + b.right, font: FONT, size: half })] : [])],
          }),
        )
        if (b.sub) kids.push(new Paragraph({ keepNext: b.bullets.length > 0, children: [run(b.sub, { italics: true })] }))
        kids.push(...b.bullets.map(bullet))
      }
    }
  }
  if (!kids.length) kids.push(new Paragraph({ children: [run(' ')] }))

  const out = new Document({
    title: doc.name ? `CV ${doc.name}` : 'CV',
    creator: doc.name || 'CV',
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } }, children: kids }],
  })
  return Packer.toBlob(out)
}
