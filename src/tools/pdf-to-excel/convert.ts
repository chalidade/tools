// Everything here runs in the visitor's browser: pdf.js reads the PDF's text
// layer, tables are rebuilt from where the text sits, and ExcelJS writes the
// .xlsx. Nothing is uploaded. Heavy libraries are dynamic imports.
//
// A PDF has no tables — only pieces of text at x/y positions (any ruling
// lines are just drawings). Rows come from shared baselines; columns come
// from the vertical gutters that stay empty down a run of rows.

import { readPdfText, segmentLine as splitLine, type PageText, type TextLine, type TextSegment } from '@/lib/pdf-text'

export type { PageText } from '@/lib/pdf-text'

export { LockedPdfError, ScannedPdfError } from '@/lib/pdf-text'

export interface OutCell {
  text: string
  /** Set when the text is a number (currency/percent/thousands handled). */
  value?: number
  numFmt?: string
  bold: boolean
}

export interface OutRow {
  cells: (OutCell | null)[]
  /** Part of a detected table (gets borders), rather than a loose text line. */
  table: boolean
}

export interface OutSheet {
  name: string
  rows: OutRow[]
  columns: number
}

export interface PdfTables {
  sheets: OutSheet[]
  pages: number
  tables: number
}

export type SheetMode = 'merge' | 'per-page'

interface SegLine {
  segments: TextSegment[]
  y: number
  size: number
}

function segmentLine(line: TextLine): SegLine {
  return { segments: splitLine(line), y: line.y, size: line.size }
}

/**
 * Groups lines into table blocks: runs of lines with 2+ segments, plus any
 * single-segment line sandwiched tightly between them (a row with one filled
 * cell, or a wrapped cell's extra line).
 */
function findBlocks(lines: SegLine[]) {
  const tabular = lines.map((l) => l.segments.length >= 2)
  for (let i = 1; i < lines.length - 1; i++) {
    if (tabular[i] || !tabular[i - 1]) continue
    let j = i + 1
    while (j < lines.length && !tabular[j]) j++
    const gapsOk = (a: number, b: number) => lines[b].y - lines[a].y < lines[b].size * 2.6
    if (j < lines.length && j - i <= 2 && gapsOk(i - 1, i) && gapsOk(j - 1, j)) for (let k = i; k < j; k++) tabular[k] = true
  }
  const blocks: { start: number; end: number }[] = []
  for (let i = 0; i < lines.length; i++) {
    if (!tabular[i]) continue
    let end = i
    while (end + 1 < lines.length && tabular[end + 1]) end++
    // One lone "tabular" line is usually a label/value pair, not a table — still
    // fine to treat as a one-row table.
    blocks.push({ start: i, end })
    i = end
  }
  return { blocks, tabular }
}

/** Column boundaries for a block: midpoints of x-ranges almost no row covers. */
function columnBounds(lines: SegLine[]) {
  const minX = Math.floor(Math.min(...lines.flatMap((l) => l.segments.map((s) => s.x))))
  const maxX = Math.ceil(Math.max(...lines.flatMap((l) => l.segments.map((s) => s.right))))
  const coverage = new Uint16Array(maxX - minX + 1)
  for (const l of lines)
    for (const s of l.segments) for (let x = Math.floor(s.x); x < Math.ceil(s.right); x++) coverage[x - minX]++
  // A few rows may span a gutter (a long note, a merged title cell).
  const tolerance = Math.max(0, Math.floor(lines.length * 0.08))
  const bounds: number[] = []
  let gapStart = -1
  for (let i = 0; i < coverage.length; i++) {
    if (coverage[i] <= tolerance) {
      if (gapStart < 0) gapStart = i
    } else if (gapStart >= 0) {
      if (gapStart > 0 && i - gapStart >= 2) bounds.push(minX + (gapStart + i) / 2)
      gapStart = -1
    }
  }
  return bounds
}

const columnOf = (bounds: number[], x: number) => {
  let c = 0
  while (c < bounds.length && x > bounds[c]) c++
  return c
}

// ─── Numbers ────────────────────────────────────────────────────────────────

type Decimal = ',' | '.'

/** Indonesian-style 1.234,56 vs English-style 1,234.56, by majority across the document. */
function detectDecimal(texts: string[]): Decimal {
  let comma = 0
  let dot = 0
  for (const t of texts) {
    if (/\d{1,3}(\.\d{3})+(,\d+)?(?!\d)/.test(t) || /\d,\d{1,2}(?!\d)/.test(t)) comma++
    if (/\d{1,3}(,\d{3})+(\.\d+)?(?!\d)/.test(t) || /\d\.\d{1,2}(?!\d)/.test(t)) dot++
  }
  return comma > dot ? ',' : '.'
}

const CURRENCY: [RegExp, string][] = [
  [/^(rp\.?|idr)\s?/i, '"Rp"'],
  [/^\$\s?/, '"$"'],
  [/^usd\s?/i, '"USD "'],
  [/^€\s?/, '"€"'],
  [/^£\s?/, '"£"'],
]

/** "Rp15.500.000" → 15500000 with "Rp"#,##0; "12,5%" → 0.125 with 0.0%. Null when not a plain number. */
function parseNumber(raw: string, decimal: Decimal): { value: number; numFmt: string } | null {
  let t = raw.trim().replace(/[\s ]/g, '')
  if (!/\d/.test(t) || t.length > 24) return null

  let negative = false
  if (/^\(.*\)$/.test(t)) {
    negative = true
    t = t.slice(1, -1)
  }
  if (/^[-−–]/.test(t)) {
    negative = true
    t = t.slice(1)
  }
  let prefix = ''
  for (const [re, fmt] of CURRENCY)
    if (re.test(t)) {
      prefix = fmt
      t = t.replace(re, '')
      break
    }
  if (/^[-−–]/.test(t)) {
    negative = true
    t = t.slice(1)
  }
  const percent = t.endsWith('%')
  if (percent) t = t.slice(0, -1)

  // Leading zeros mean an identifier (phone, account, ID), not a quantity.
  if (/^0\d/.test(t)) return null

  const thousands = decimal === ',' ? '.' : ','
  const th = thousands === '.' ? '\\.' : ','
  const dc = decimal === '.' ? '\\.' : ','
  const grouped = new RegExp(`^\\d{1,3}(${th}\\d{3})+(${dc}\\d+)?$`)
  const plain = new RegExp(`^\\d+(${dc}\\d+)?$`)
  const hasGroups = grouped.test(t)
  if (!hasGroups && !plain.test(t)) return null

  const decimals = t.includes(decimal) ? t.split(decimal)[1].length : 0
  let value = Number(t.split(thousands).join('').replace(decimal, '.'))
  if (!Number.isFinite(value)) return null
  if (negative) value = -value

  const frac = decimals ? '.' + '0'.repeat(Math.min(decimals, 6)) : ''
  if (percent) return { value: value / 100, numFmt: `0${frac}%` }
  const body = hasGroups || prefix ? `#,##0${frac}` : `0${frac}`
  return { value, numFmt: prefix + body }
}

// ─── Assembly ───────────────────────────────────────────────────────────────

function cell(text: string, bold: boolean, decimal: Decimal, convertNumbers: boolean): OutCell {
  const num = convertNumbers ? parseNumber(text, decimal) : null
  return num ? { text, bold, ...num } : { text, bold }
}

export interface TableBlock {
  /** Line range on the page (indices into PageText.lines), inclusive. */
  start: number
  end: number
  rows: { texts: string[]; bold: boolean[] }[]
}

/**
 * The page's tables: runs of lines that share column gutters, with wrapped
 * cell text folded back into its row. A one-line "table" is usually a
 * label/value pair.
 */
export function tableBlocks(page: PageText): TableBlock[] {
  const lines = page.lines.map(segmentLine)
  const { blocks } = findBlocks(lines)
  return blocks.map((block) => {
    const blockLines = lines.slice(block.start, block.end + 1)
    const bounds = columnBounds(blockLines)
    // Lines much closer together than this block's usual row spacing are
    // one row whose cell(s) wrapped onto extra lines.
    const gaps = blockLines.slice(1).map((l, k) => l.y - blockLines[k].y).sort((x, y) => x - y)
    const pitch = gaps.length ? gaps[Math.floor(gaps.length / 2)] : Infinity

    const rows: TableBlock['rows'] = []
    let current: { parts: string[][]; bold: boolean[]; y: number } | null = null
    const flush = () => {
      if (current) rows.push({ texts: current.parts.map((p) => p.join(' ')), bold: current.bold })
      current = null
    }
    for (const line of blockLines) {
      if (current && line.y - current.y > pitch * 0.8) flush()
      current ??= { parts: Array.from({ length: bounds.length + 1 }, () => []), bold: Array(bounds.length + 1).fill(true), y: line.y }
      for (const s of line.segments) {
        const c = columnOf(bounds, s.x + 1)
        current.parts[c].push(s.text)
        current.bold[c] = current.bold[c] && s.bold
      }
      current.y = line.y
    }
    flush()
    return { start: block.start, end: block.end, rows }
  })
}

function pageRows(page: PageText, decimal: Decimal, convertNumbers: boolean) {
  const tables = tableBlocks(page)
  const rows: OutRow[] = []
  let t = 0
  for (let i = 0; i < page.lines.length; i++) {
    const table = tables[t]
    if (table && i === table.start) {
      for (const row of table.rows)
        rows.push({
          cells: row.texts.map((text, c) => (text ? cell(text, row.bold[c], decimal, convertNumbers) : null)),
          table: true,
        })
      i = table.end
      t++
    } else {
      const segments = segmentLine(page.lines[i]).segments
      if (!segments.length) continue
      rows.push({ cells: [{ text: segments.map((s) => s.text).join(' '), bold: segments.every((s) => s.bold) }], table: false })
    }
  }
  return { rows, tables: tables.length }
}

const rowKey = (row: OutRow) => row.cells.map((c) => c?.text ?? '').join('\u0001')

/** Reads the PDF's text once; `assemble` can then be re-run for any options. */
export const readPdf = readPdfText

export interface AssembleOptions {
  mode: SheetMode
  convertNumbers: boolean
}

export function assemble(pages: PageText[], opts: AssembleOptions): PdfTables {
  const decimal = detectDecimal(pages.flatMap((p) => p.lines.flatMap((l) => l.pieces.map((x) => x.text))))

  let tables = 0
  const perPage = pages.map((page) => {
    const result = pageRows(page, decimal, opts.convertNumbers)
    tables += result.tables
    return result.rows
  })

  let sheets: OutSheet[]
  if (opts.mode === 'per-page') {
    sheets = perPage.map((rows, i) => ({ name: `Halaman ${i + 1}`, rows, columns: 0 }))
  } else {
    // One sheet; a table header repeated at the top of every page is kept once.
    const firstHeader = perPage.flat().find((r) => r.table)
    const header = firstHeader ? rowKey(firstHeader) : null
    const rows: OutRow[] = []
    perPage.forEach((pageRows, p) =>
      pageRows.forEach((row) => {
        if (p > 0 && header && row.table && rowKey(row) === header) return
        rows.push(row)
      }),
    )
    sheets = [{ name: 'Data', rows, columns: 0 }]
  }
  for (const s of sheets) s.columns = Math.max(1, ...s.rows.map((r) => r.cells.length))
  return { sheets: sheets.filter((s) => s.rows.length), pages: pages.length, tables }
}

export async function buildXlsx(result: PdfTables): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const border = { style: 'thin' as const, color: { argb: 'FFD4D4D8' } }

  for (const sheet of result.sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31))
    const widths = Array(sheet.columns).fill(8)
    for (const row of sheet.rows) {
      const added = ws.addRow(row.cells.map((c) => (c ? (c.value ?? c.text) : null)))
      row.cells.forEach((c, i) => {
        const target = added.getCell(i + 1)
        if (row.table) target.border = { top: border, bottom: border, left: border, right: border }
        if (!c) return
        if (c.numFmt) target.numFmt = c.numFmt
        if (c.bold) target.font = { bold: true }
        // Loose text lines overflow into empty cells, so they do not set widths.
        if (row.table) widths[i] = Math.max(widths[i], Math.min(c.text.length + 2, 60))
      })
      // Fill the bordered table row out to its full width.
      if (row.table)
        for (let i = row.cells.length; i < sheet.columns; i++)
          added.getCell(i + 1).border = { top: border, bottom: border, left: border, right: border }
    }
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w))
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
