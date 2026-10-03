// Turns a PDF into Markdown in the visitor's browser, from two engines:
// tables come from the PDF → Excel engine (column gutters across rows), and
// everything else from the PDF → Word engine (lines rebuilt into paragraphs
// with size/bold/italic). This file interleaves them in page order and
// decides what each paragraph is in Markdown terms.

import type { PageText } from '@/lib/pdf-text'
import { tableBlocks, type TableBlock } from '../pdf-to-excel/convert'
import { paragraphsFromPages, type Paragraph } from '../pdf-to-word/convert'

export { LockedPdfError, readPdfText, ScannedPdfError } from '@/lib/pdf-text'

type Run = Paragraph['runs'][number]

const textOf = (p: Paragraph) => p.runs.map((r) => r.text).join('')

/** The body text size: the size most of the document's characters are set in. */
function bodySize(paragraphs: Paragraph[]) {
  const weight = new Map<number, number>()
  for (const p of paragraphs)
    for (const r of p.runs) {
      const size = Math.round(r.size * 2) / 2
      weight.set(size, (weight.get(size) ?? 0) + r.text.length)
    }
  return [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11
}

/** Escapes characters Markdown would read as formatting. */
function escape(text: string) {
  return text.replace(/([\\`*_[\]<>|])/g, '\\$1')
}

/** Inline text with **bold** / *italic*, keeping marker spaces outside the markers. */
function inline(runs: Run[]) {
  // Merge neighbouring runs of the same emphasis first, so "**a** **b**" becomes "**a b**".
  const merged: { text: string; bold: boolean; italic: boolean }[] = []
  for (const r of runs) {
    const last = merged[merged.length - 1]
    if (last && last.bold === r.bold && last.italic === r.italic) last.text += r.text
    else merged.push({ text: r.text, bold: r.bold, italic: r.italic })
  }
  return merged
    .map(({ text, bold, italic }) => {
      // A tab inside a line separates a label from its value ("role ⇥ date").
      const body = escape(text.replace(/\t/g, ' — '))
      const marker = bold && italic ? '***' : bold ? '**' : italic ? '*' : ''
      if (!marker || !body.trim()) return body
      const [, lead, core, trail] = body.match(/^(\s*)(.*?)(\s*)$/s)!
      return `${lead}${marker}${core}${marker}${trail}`
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

const BULLET = /^\s*[•●▪◦‣∙·\-–*]\s+/
const NUMBERED = /^\s*(\d{1,3}|[a-zA-Z])[.)]\s+/

function headingLevel(p: Paragraph, body: number) {
  const text = textOf(p).trim()
  if (!text || text.length > 120 || text.includes('\t')) return 0
  const size = Math.max(...p.runs.map((r) => r.size))
  const ratio = size / body
  if (ratio >= 1.6) return 1
  if (ratio >= 1.3) return 2
  if (ratio >= 1.12) return 3
  // Same size but entirely bold, short and not a sentence: a small heading.
  const allBold = p.runs.every((r) => r.bold || !r.text.trim())
  if (allBold && text.length <= 70 && !/[.:;,]$/.test(text) && !BULLET.test(text)) return 3
  return 0
}

/** The runs with their first `count` characters removed. */
function dropLeading(runs: Run[], count: number): Run[] {
  const rest: Run[] = []
  let left = count
  for (const r of runs) {
    if (left >= r.text.length) {
      left -= r.text.length
      continue
    }
    rest.push(left ? { ...r, text: r.text.slice(left) } : r)
    left = 0
  }
  return rest
}

const rowKey = (row: TableBlock['rows'][number]) => row.texts.map((t) => t.trim()).join('\u0001')

/** Markdown table; empty columns are dropped, the first row is the header. */
function tableMarkdown(rows: TableBlock['rows']) {
  const width = rows[0].texts.length
  const keep = Array.from({ length: width }, (_, c) => c).filter((c) => rows.some((r) => r.texts[c]?.trim()))
  const row = (r: TableBlock['rows'][number]) => `| ${keep.map((c) => escape(r.texts[c] ?? '').trim()).join(' | ')} |`
  return [row(rows[0]), `|${' --- |'.repeat(keep.length)}`, ...rows.slice(1).map(row)].join('\n')
}

export function toMarkdown(pages: PageText[], opts: { pageBreaks: boolean }) {
  // Real tables only: 2+ rows and 2+ filled columns. A single "label ⇥ value"
  // line stays a paragraph.
  const tables = pages.map((page) =>
    tableBlocks(page).filter(
      (t) => t.rows.length >= 2 && t.rows[0].texts.filter((_, c) => t.rows.some((r) => r.texts[c]?.trim())).length >= 2,
    ),
  )
  const inTable = (page: number, line: number) => tables[page].some((t) => line >= t.start && line <= t.end)
  const { paragraphs } = paragraphsFromPages(pages, inTable)
  const body = bodySize(paragraphs)

  // Paragraphs and tables, in reading order.
  type Item = { page: number; line: number } & ({ paragraph: Paragraph } | { table: TableBlock })
  const items: Item[] = [
    ...paragraphs.map((p) => ({ page: p.page, line: p.line, paragraph: p })),
    ...tables.flatMap((ts, page) => ts.map((t) => ({ page, line: t.start, table: t }))),
  ].sort((a, b) => a.page - b.page || a.line - b.line)

  const out: string[] = []
  // The table just written, so a table continuing on the next page (same
  // header repeated at the top) extends it instead of starting a new one.
  let open: { rows: TableBlock['rows']; at: number } | null = null
  let lastPage = 0
  for (const item of items) {
    const continues =
      'table' in item && open && out.length - 1 === open.at && rowKey(item.table.rows[0]) === rowKey(open.rows[0])
    if (item.page !== lastPage) {
      if (opts.pageBreaks && out.length && !continues) out.push('---')
      lastPage = item.page
    }
    if ('table' in item) {
      if (continues && open) {
        open.rows = [...open.rows, ...item.table.rows.slice(1)]
        out[open.at] = tableMarkdown(open.rows)
      } else {
        out.push(tableMarkdown(item.table.rows))
        open = { rows: item.table.rows, at: out.length - 1 }
      }
      continue
    }
    const p = item.paragraph
    const text = textOf(p)
    const level = headingLevel(p, body)
    if (level) {
      out.push(`${'#'.repeat(level)} ${escape(text.replace(/\t/g, ' — ').trim())}`)
      continue
    }

    // List markers are read from the plain text and cut from the runs before
    // formatting, so they never get escaped or wrapped in emphasis.
    let prefix = ''
    let marker = text.match(BULLET)?.[0]
    if (marker) prefix = '- '
    else {
      const numbered = text.match(NUMBERED)
      if (numbered) {
        marker = numbered[0]
        prefix = `${numbered[1]}. `
      }
    }
    let md = inline(marker ? dropLeading(p.runs, marker.length) : p.runs)
    // A plain paragraph that happens to start with #, > or + is not a heading/quote/list.
    if (!prefix && /^[#>+]/.test(md)) md = '\\' + md
    out.push(prefix + md)
  }

  // Consecutive list items stay together; everything else is separated by a blank line.
  let result = ''
  for (const [k, block] of out.entries()) {
    const isItem = /^(- |\d+\. |[a-zA-Z]\. )/.test(block)
    const prevItem = k > 0 && /^(- |\d+\. |[a-zA-Z]\. )/.test(out[k - 1])
    result += k === 0 ? block : (isItem && prevItem ? '\n' : '\n\n') + block
  }
  return result + '\n'
}
