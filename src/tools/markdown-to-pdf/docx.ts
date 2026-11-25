// Markdown → .docx, built from marked's tokens with the `docx` library (a
// dynamic import). Headings, emphasis, lists (nested, numbered, checklists),
// quotes, code, tables, rules and links come across as real Word structures.
// Images are not embedded: Word gets the alt text instead.

import type { Token, Tokens } from 'marked'

export interface DocxOptions {
  page: 'a4' | 'letter'
  /** Page margin in millimetres. */
  marginMm: number
  font: 'sans' | 'serif'
  /** Single newlines become line breaks (right for plain text). */
  breaks: boolean
}

const TWIPS_PER_MM = 56.6929

export async function markdownToDocx(source: string, opts: DocxOptions): Promise<Blob> {
  const [docx, { marked }] = await Promise.all([import('docx'), import('marked')])
  const {
    AlignmentType, BorderStyle, Document, ExternalHyperlink, HeadingLevel, LevelFormat, Packer, Paragraph,
    ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
  } = docx
  type Child = InstanceType<typeof Paragraph> | InstanceType<typeof Table>
  type Run = InstanceType<typeof TextRun> | InstanceType<typeof ExternalHyperlink>

  const font = opts.font === 'serif' ? 'Times New Roman' : 'Calibri'
  const mono = 'Courier New'
  const numbering: { reference: string; levels: object[] }[] = []
  let listCount = 0

  const tokens = marked.lexer(source, { gfm: true, breaks: opts.breaks })

  // ─── inline ───
  type Style = { bold?: boolean; italics?: boolean; strike?: boolean; code?: boolean; link?: boolean }
  const strip = (html: string) => html.replace(/<[^>]*>/g, '')

  function inline(list: Token[] | undefined, style: Style = {}): Run[] {
    const out: Run[] = []
    const run = (text: string, s: Style) =>
      new TextRun({
        text,
        bold: s.bold,
        italics: s.italics,
        strike: s.strike,
        font: s.code ? mono : undefined,
        shading: s.code ? { type: ShadingType.CLEAR, fill: 'EEEEEE' } : undefined,
        color: s.link ? '0563C1' : undefined,
        underline: s.link ? {} : undefined,
      })
    for (const tok of list ?? []) {
      switch (tok.type) {
        case 'strong': out.push(...inline((tok as Tokens.Strong).tokens, { ...style, bold: true })); break
        case 'em': out.push(...inline((tok as Tokens.Em).tokens, { ...style, italics: true })); break
        case 'del': out.push(...inline((tok as Tokens.Del).tokens, { ...style, strike: true })); break
        case 'codespan': out.push(run((tok as Tokens.Codespan).text, { ...style, code: true })); break
        case 'br': out.push(new TextRun({ break: 1 })); break
        case 'link': {
          const l = tok as Tokens.Link
          const kids = inline(l.tokens, { ...style, link: true })
          if (/^(https?:|mailto:)/i.test(l.href)) out.push(new ExternalHyperlink({ link: l.href, children: kids }))
          else out.push(...kids)
          break
        }
        case 'image': {
          const alt = (tok as Tokens.Image).text
          if (alt) out.push(run(`[${alt}]`, { ...style, italics: true }))
          break
        }
        case 'html': {
          const t = strip((tok as Tokens.Tag).text)
          if (t) out.push(run(t, style))
          break
        }
        default: {
          const t = tok as Tokens.Text
          if (t.tokens?.length) out.push(...inline(t.tokens, style))
          else if (t.text) out.push(run(t.text, style))
        }
      }
    }
    return out
  }

  // ─── blocks ───
  const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6]

  function blocks(list: Token[], indent = 0): Child[] {
    const out: Child[] = []
    for (const tok of list) {
      switch (tok.type) {
        case 'heading': {
          const h = tok as Tokens.Heading
          out.push(new Paragraph({ heading: HEADINGS[Math.min(h.depth, 6) - 1], children: inline(h.tokens), indent: indent ? { left: indent } : undefined }))
          break
        }
        case 'paragraph':
        case 'text': {
          const p = tok as Tokens.Paragraph
          out.push(new Paragraph({ children: inline(p.tokens ?? [{ type: 'text', raw: p.text, text: p.text } as Token]), spacing: { after: 120 }, indent: indent ? { left: indent } : undefined }))
          break
        }
        case 'blockquote':
          for (const inner of (tok as Tokens.Blockquote).tokens) {
            if (inner.type === 'space') continue
            if (inner.type === 'paragraph' || inner.type === 'text') {
              out.push(new Paragraph({
                children: inline((inner as Tokens.Paragraph).tokens),
                indent: { left: 567 + indent },
                border: { left: { style: BorderStyle.SINGLE, size: 12, space: 8, color: 'AAAAAA' } },
                spacing: { after: 120 },
              }))
            } else out.push(...blocks([inner], 567 + indent))
          }
          break
        case 'code': {
          const lines = (tok as Tokens.Code).text.split('\n')
          lines.forEach((line, i) =>
            out.push(new Paragraph({
              children: [new TextRun({ text: line, font: mono, size: 20 })],
              shading: { type: ShadingType.CLEAR, fill: 'F3F3F3' },
              indent: { left: 200 + indent, right: 200 },
              spacing: { before: i === 0 ? 80 : 0, after: i === lines.length - 1 ? 160 : 0 },
              keepLines: true,
            })),
          )
          break
        }
        case 'hr':
          out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 1, color: '999999' } }, spacing: { after: 160 } }))
          break
        case 'list': {
          const l = tok as Tokens.List
          const ref = l.ordered ? `ol-${++listCount}` : 'bullets'
          if (l.ordered) {
            numbering.push({
              reference: ref,
              levels: Array.from({ length: 9 }, (_, level) => ({
                level,
                format: LevelFormat.DECIMAL,
                text: `%${level + 1}.`,
                alignment: AlignmentType.START,
                start: level === 0 ? Number(l.start) || 1 : 1,
                style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
              })),
            })
          }
          out.push(...listItems(l, ref, 0))
          break
        }
        case 'table': {
          const tb = tok as Tokens.Table
          const cell = (c: Tokens.TableCell, header: boolean, i: number) =>
            new TableCell({
              children: [new Paragraph({
                children: inline(c.tokens, header ? { bold: true } : {}),
                alignment: tb.align[i] === 'center' ? AlignmentType.CENTER : tb.align[i] === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT,
              })],
              shading: header ? { type: ShadingType.CLEAR, fill: 'E8E8E8' } : undefined,
              margins: { top: 40, bottom: 40, left: 80, right: 80 },
            })
          out.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ tableHeader: true, children: tb.header.map((c, i) => cell(c, true, i)) }),
              ...tb.rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, false, i)) })),
            ],
          }))
          out.push(new Paragraph({ spacing: { after: 120 } }))
          break
        }
        case 'html': {
          const t = strip((tok as Tokens.HTML).text).trim()
          if (t) out.push(new Paragraph({ children: [new TextRun(t)] }))
          break
        }
        default:
          break
      }
    }
    return out
  }

  function listItems(l: Tokens.List, ref: string, level: number): Child[] {
    const out: Child[] = []
    for (const item of l.items) {
      let first = true
      for (const child of item.tokens) {
        if (child.type === 'list') {
          const sub = child as Tokens.List
          const subRef = sub.ordered ? `ol-${++listCount}` : 'bullets'
          if (sub.ordered) {
            numbering.push({
              reference: subRef,
              levels: Array.from({ length: 9 }, (_, lv) => ({
                level: lv, format: LevelFormat.DECIMAL, text: `%${lv + 1}.`, alignment: AlignmentType.START,
                start: lv === 0 ? Number(sub.start) || 1 : 1,
                style: { paragraph: { indent: { left: 720 * (lv + 1), hanging: 360 } } },
              })),
            })
          }
          out.push(...listItems(sub, subRef, Math.min(level + 1, 8)))
        } else if (child.type === 'text' || child.type === 'paragraph') {
          const t = child as Tokens.Text
          const box = item.task ? (item.checked ? '☑ ' : '☐ ') : ''
          const runs = inline(t.tokens ?? [{ type: 'text', raw: t.text, text: t.text } as Token])
          out.push(new Paragraph({
            children: first && box ? [new TextRun(box), ...runs] : runs,
            numbering: first ? { reference: ref, level } : undefined,
            indent: first ? undefined : { left: 720 * (level + 1) },
            spacing: { after: 60 },
          }))
          first = false
        } else if (child.type !== 'space') {
          out.push(...blocks([child], 720 * (level + 1)))
        }
      }
    }
    return out
  }

  const children = blocks(tokens)
  if (!children.length) children.push(new Paragraph({}))

  const bulletLevels = Array.from({ length: 9 }, (_, level) => ({
    level,
    format: LevelFormat.BULLET,
    text: ['•', '◦', '▪'][level % 3],
    alignment: AlignmentType.START,
    style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
  }))

  const margin = Math.round(opts.marginMm * TWIPS_PER_MM)
  const heading = (size: number) => ({ run: { font, bold: true, size, color: '000000' }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true } })
  const doc = new Document({
    styles: {
      default: { document: { run: { font, size: 22 }, paragraph: { spacing: { line: 300 } } } },
      paragraphStyles: [1, 2, 3, 4, 5, 6].map((n) => ({
        id: `Heading${n}`, name: `heading ${n}`, basedOn: 'Normal', next: 'Normal', quickFormat: true,
        ...heading([40, 32, 28, 24, 22, 22][n - 1]),
      })),
    },
    numbering: { config: [{ reference: 'bullets', levels: bulletLevels }, ...numbering] as never },
    sections: [{
      properties: {
        page: {
          size: opts.page === 'a4' ? { width: 11906, height: 16838 } : { width: 12240, height: 15840 },
          margin: { top: margin, bottom: margin, left: margin, right: margin },
        },
      },
      children,
    }],
  })
  return Packer.toBlob(doc)
}
