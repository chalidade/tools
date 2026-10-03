// Everything here runs in the visitor's browser: ExcelJS reads the workbook
// from memory (values + styles), numfmt formats numbers and dates the way
// Excel does, and jsPDF + autotable lays the sheets out as real, selectable
// text across as many pages as needed. Nothing is uploaded. Heavy libraries
// are dynamic imports so they load only when used.

import type { Cell, Workbook, Worksheet } from 'exceljs'

export interface CellStyle {
  bold: boolean
  italic: boolean
  underline: boolean
  /** Font size in points. */
  size: number
  /** Hex colours, e.g. "#1f2937"; undefined = default. */
  color?: string
  fill?: string
  align: 'left' | 'center' | 'right'
  valign: 'top' | 'middle' | 'bottom'
  wrap: boolean
  border: { top: boolean; right: boolean; bottom: boolean; left: boolean }
}

export interface SheetCell {
  text: string
  style: CellStyle
  colSpan?: number
  rowSpan?: number
  /** Covered by a merged cell that starts elsewhere — not drawn. */
  covered?: boolean
}

export interface Sheet {
  name: string
  rows: SheetCell[][]
  /** Column widths in points. */
  colWidths: number[]
  /** Row heights in points (undefined = automatic). */
  rowHeights: (number | undefined)[]
}

export interface Spreadsheet {
  sheets: Sheet[]
}

export class UnsupportedSheetError extends Error {}

const DEFAULT_FONT_SIZE = 11
/** Excel's default column width is ~8.43 characters ≈ 64px ≈ 48pt. */
const DEFAULT_COL_WIDTH = 48
/** One width unit (a "0" character in Calibri 11) ≈ 7px ≈ 5.25pt, plus 5px padding. */
const charsToPoints = (chars: number) => (chars * 7 + 5) * 0.75

const NO_BORDER = { top: false, right: false, bottom: false, left: false }

function plainStyle(size = DEFAULT_FONT_SIZE): CellStyle {
  return { bold: false, italic: false, underline: false, size, align: 'left', valign: 'bottom', wrap: false, border: NO_BORDER }
}

// ─── Colours ────────────────────────────────────────────────────────────────

type ExcelColor = { argb?: string; theme?: number; tint?: number; indexed?: number }

/** Excel's legacy 64-colour palette (the part files still reference). */
const INDEXED: Record<number, string> = {
  0: '000000', 1: 'FFFFFF', 2: 'FF0000', 3: '00FF00', 4: '0000FF', 5: 'FFFF00', 6: 'FF00FF', 7: '00FFFF',
  8: '000000', 9: 'FFFFFF', 10: 'FF0000', 11: '00FF00', 12: '0000FF', 13: 'FFFF00', 14: 'FF00FF', 15: '00FFFF',
  16: '800000', 17: '008000', 18: '000080', 19: '808000', 20: '800080', 21: '008080', 22: 'C0C0C0', 23: '808080',
  24: '9999FF', 25: '993366', 26: 'FFFFCC', 27: 'CCFFFF', 28: '660066', 29: 'FF8080', 30: '0066CC', 31: 'CCCCFF',
  32: '000080', 33: 'FF00FF', 34: 'FFFF00', 35: '00FFFF', 36: '800080', 37: '800000', 38: '008080', 39: '0000FF',
  40: '00CCFF', 41: 'CCFFFF', 42: 'CCFFCC', 43: 'FFFF99', 44: '99CCFF', 45: 'FF99CC', 46: 'CC99FF', 47: 'FFCC99',
  48: '3366FF', 49: '33CCCC', 50: '99CC00', 51: 'FFCC00', 52: 'FF9900', 53: 'FF6600', 54: '666699', 55: '969696',
  56: '003366', 57: '339966', 58: '003300', 59: '333300', 60: '993300', 61: '993366', 62: '333399', 63: '333333',
  64: '000000', // system foreground
  65: 'FFFFFF', // system background
}

/** Office 2013+ default theme, used when the file carries none. */
const DEFAULT_THEME = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47', '0563C1', '954F72']

/**
 * Theme colours in the order Excel indexes them: lt1, dk1, lt2, dk2,
 * accent1–6, hlink, folHlink (the XML lists dk before lt, so swap).
 */
function themePalette(workbook: Workbook): string[] {
  const xml = (workbook as unknown as { _themes?: Record<string, string> })._themes?.theme1
  if (!xml) return DEFAULT_THEME
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const scheme = doc.getElementsByTagNameNS('*', 'clrScheme')[0]
  if (!scheme) return DEFAULT_THEME
  const colors = Array.from(scheme.children).map((el) => {
    const c = el.firstElementChild
    return (c?.getAttribute('val') && c.localName === 'srgbClr' ? c.getAttribute('val') : c?.getAttribute('lastClr')) ?? '000000'
  })
  if (colors.length < 12) return DEFAULT_THEME
  const [dk1, lt1, dk2, lt2, ...rest] = colors
  return [lt1, dk1, lt2, dk2, ...rest]
}

/** Excel's tint: shifts HSL lightness toward black (negative) or white (positive). */
function applyTint(hex: string, tint: number) {
  const n = parseInt(hex, 16)
  let r = (n >> 16) / 255
  let g = ((n >> 8) & 255) / 255
  let b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  let l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue(p, q, h + 1 / 3)
    g = hue(p, q, h)
    b = hue(p, q, h - 1 / 3)
  }
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `${to(r)}${to(g)}${to(b)}`
}

function resolveColor(color: ExcelColor | undefined, theme: string[]): string | undefined {
  if (!color) return undefined
  let hex: string | undefined
  if (color.argb) hex = color.argb.slice(-6)
  else if (color.theme !== undefined) hex = theme[color.theme]
  else if (color.indexed !== undefined) hex = INDEXED[color.indexed]
  if (!hex) return undefined
  if (color.tint) hex = applyTint(hex, color.tint)
  return `#${hex.toLowerCase()}`
}

// ─── Values ─────────────────────────────────────────────────────────────────

type NumFmt = typeof import('numfmt')

/** ExcelJS dates are UTC-based; numfmt wants an Excel serial. */
function toSerial(numfmt: NumFmt, d: Date) {
  return numfmt.dateToSerial([
    d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(),
  ])
}

/** The text Excel would show for this cell, and whether it is a number (right-aligned by default). */
function displayValue(cell: Cell, numfmt: NumFmt, locale: string): { text: string; numeric: boolean } {
  let value: unknown = cell.value
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const v = value as Record<string, unknown>
    if ('result' in v) value = v.result // formula: show its cached result
    else if ('richText' in v) return { text: (v.richText as { text: string }[]).map((r) => r.text).join(''), numeric: false }
    else if ('text' in v) return { text: String(v.text), numeric: false } // hyperlink
    else if ('error' in v) return { text: String(v.error), numeric: false }
    if (value && typeof value === 'object' && 'error' in (value as object))
      return { text: String((value as { error: string }).error), numeric: false }
  }
  if (value === null || value === undefined) return { text: '', numeric: false }
  if (typeof value === 'boolean') return { text: value ? 'TRUE' : 'FALSE', numeric: false }

  const pattern = cell.numFmt || 'General'
  if (value instanceof Date) {
    const fmt = numfmt.isDateFormat(pattern) ? pattern : 'yyyy-mm-dd'
    const serial = toSerial(numfmt, value)
    if (serial === null) return { text: value.toISOString().slice(0, 10), numeric: true }
    return { text: safeFormat(numfmt, fmt, serial, locale), numeric: true }
  }
  if (typeof value === 'number') return { text: safeFormat(numfmt, pattern, value, locale), numeric: true }
  return { text: String(value), numeric: false }
}

function safeFormat(numfmt: NumFmt, pattern: string, value: number, locale: string) {
  try {
    return numfmt.format(pattern, value, { locale, throws: false, nbsp: false })
  } catch {
    return String(value)
  }
}

// ─── Reading ────────────────────────────────────────────────────────────────

function cellStyle(cell: Cell, numeric: boolean, theme: string[]): CellStyle {
  const font = cell.font ?? {}
  const align = cell.alignment ?? {}
  const fill = cell.fill as { type?: string; pattern?: string; fgColor?: ExcelColor } | undefined
  const border = cell.border ?? {}
  const horizontal = align.horizontal
  return {
    bold: !!font.bold,
    italic: !!font.italic,
    underline: !!font.underline && font.underline !== 'none',
    size: font.size || DEFAULT_FONT_SIZE,
    color: resolveColor(font.color as ExcelColor, theme),
    fill: fill?.type === 'pattern' && fill.pattern === 'solid' ? resolveColor(fill.fgColor, theme) : undefined,
    align:
      horizontal === 'center' || horizontal === 'centerContinuous'
        ? 'center'
        : horizontal === 'right'
          ? 'right'
          : horizontal === 'left' || horizontal === 'justify' || horizontal === 'distributed'
            ? 'left'
            : numeric
              ? 'right'
              : 'left',
    valign: align.vertical === 'top' ? 'top' : align.vertical === 'middle' ? 'middle' : 'bottom',
    wrap: !!align.wrapText,
    border: {
      top: !!border.top?.style,
      right: !!border.right?.style,
      bottom: !!border.bottom?.style,
      left: !!border.left?.style,
    },
  }
}

function readSheet(ws: Worksheet, numfmt: NumFmt, theme: string[], locale: string): Sheet | null {
  // Used range: the last row/column holding a value or a merge.
  let lastRow = 0
  let lastCol = 0
  ws.eachRow({ includeEmpty: false }, (row, r) => {
    row.eachCell({ includeEmpty: false }, (cell, c) => {
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        lastRow = Math.max(lastRow, r)
        lastCol = Math.max(lastCol, c)
      }
    })
  })
  if (!lastRow) return null

  const merges = (ws.model as unknown as { merges?: string[] }).merges ?? []
  const spans = new Map<string, { rowSpan: number; colSpan: number }>()
  const covered = new Set<string>()
  for (const range of merges) {
    const [from, to] = range.split(':')
    if (!from || !to) continue
    const a = ws.getCell(from).fullAddress
    const b = ws.getCell(to).fullAddress
    spans.set(`${a.row}:${a.col}`, { rowSpan: b.row - a.row + 1, colSpan: b.col - a.col + 1 })
    for (let r = a.row; r <= b.row; r++)
      for (let c = a.col; c <= b.col; c++) if (r !== a.row || c !== a.col) covered.add(`${r}:${c}`)
    lastRow = Math.max(lastRow, b.row)
    lastCol = Math.max(lastCol, b.col)
  }

  const visibleCols: number[] = []
  for (let c = 1; c <= lastCol; c++) if (!ws.getColumn(c).hidden) visibleCols.push(c)

  const rows: SheetCell[][] = []
  const rowHeights: (number | undefined)[] = []
  for (let r = 1; r <= lastRow; r++) {
    const row = ws.getRow(r)
    if (row.hidden) continue
    rowHeights.push(row.height || undefined)
    rows.push(
      visibleCols.map((c) => {
        const key = `${r}:${c}`
        if (covered.has(key)) return { text: '', style: plainStyle(), covered: true }
        const cell = row.getCell(c)
        const { text, numeric } = displayValue(cell, numfmt, locale)
        const span = spans.get(key)
        return { text, style: cellStyle(cell, numeric, theme), ...span }
      }),
    )
  }

  const colWidths = fitColumns(
    rows,
    visibleCols.map((c) => {
      const width = ws.getColumn(c).width
      return width ? charsToPoints(width) : DEFAULT_COL_WIDTH
    }),
  )

  return { name: ws.name, rows, colWidths, rowHeights }
}

let measureCtx: CanvasRenderingContext2D | null = null

/**
 * Widens columns whose single-line values would not fit. The PDF uses
 * Helvetica, which runs wider than Excel's Calibri, so a column sized in Excel
 * ("06 Aug 2026" in 12 characters) can be too narrow and get cut off. Capped
 * so one long value cannot blow a column up.
 */
function fitColumns(rows: SheetCell[][], widths: number[]) {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  if (!measureCtx) return widths
  const ctx = measureCtx
  const padding = 7 // 3pt each side + a little air
  return widths.map((width, c) => {
    let needed = 0
    for (const row of rows) {
      const cell = row[c]
      if (!cell || cell.covered || cell.colSpan || cell.style.wrap || !cell.text) continue
      ctx.font = `${cell.style.italic ? 'italic ' : ''}${cell.style.bold ? 'bold ' : ''}${cell.style.size}pt Helvetica, Arial, sans-serif`
      // measureText works in CSS px; the widths here are points.
      needed = Math.max(needed, ctx.measureText(cell.text).width * 0.75 + padding)
    }
    return Math.max(width, Math.min(needed, width * 2.5, 400))
  })
}

/** Minimal RFC 4180 CSV reader (quoted fields, escaped quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  // Excel writes ";" for locales with a decimal comma (e.g. Indonesian).
  const firstLine = text.slice(0, text.indexOf('\n') >>> 0)
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim()))
}

function csvSheet(name: string, data: string[][]): Sheet {
  const cols = Math.max(...data.map((r) => r.length))
  const numeric = /^[-+]?[\d.,\s]+%?$/
  const rows = data.map((r, i) =>
    Array.from({ length: cols }, (_, c) => {
      const text = r[c] ?? ''
      const style = plainStyle()
      if (i === 0) style.bold = true // CSV header row
      if (i > 0 && numeric.test(text.trim())) style.align = 'right'
      return { text, style }
    }),
  )
  // Width from the longest value in each column, like Excel's auto-fit.
  const colWidths = Array.from({ length: cols }, (_, c) =>
    Math.min(charsToPoints(Math.max(8, ...data.map((r) => (r[c] ?? '').length)) + 1), 300),
  )
  return { name, rows, colWidths: fitColumns(rows, colWidths), rowHeights: rows.map(() => undefined) }
}

export async function readSpreadsheet(file: File): Promise<Spreadsheet> {
  if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
    const data = parseCsv(await file.text())
    if (!data.length) throw new UnsupportedSheetError()
    return { sheets: [csvSheet(file.name.replace(/\.csv$/i, ''), data)] }
  }

  const [{ default: ExcelJS }, numfmt] = await Promise.all([import('exceljs'), import('numfmt')])
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(await file.arrayBuffer())
  } catch {
    throw new UnsupportedSheetError()
  }
  const theme = themePalette(workbook)
  const locale = navigator.language || 'en'
  const sheets = workbook.worksheets
    .filter((ws) => ws.state === 'visible')
    .map((ws) => readSheet(ws, numfmt, theme, locale))
    .filter((s): s is Sheet => s !== null)
  if (!sheets.length) throw new UnsupportedSheetError()
  return { sheets }
}

// ─── PDF ────────────────────────────────────────────────────────────────────

export type PageSize = 'a4' | 'letter'
export type Orientation = 'auto' | 'portrait' | 'landscape'

export interface PdfOptions {
  page: PageSize
  orientation: Orientation
  /** Shrink each sheet to the page width (true) or keep its real size and spill onto extra pages. */
  fitWidth: boolean
  gridlines: boolean
}

const PAGE_SIZES: Record<PageSize, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] }
const MARGIN = 36

const sheetWidth = (sheet: Sheet) => sheet.colWidths.reduce((a, b) => a + b, 0)

/** Page size for a sheet, and how much it must shrink to fit (1 = not at all). */
export function pageFor(sheet: Sheet, opts: PdfOptions) {
  const [short, long] = PAGE_SIZES[opts.page]
  const width = sheetWidth(sheet)
  const landscape =
    opts.orientation === 'landscape' || (opts.orientation === 'auto' && width > short - MARGIN * 2)
  const pageW = landscape ? long : short
  const pageH = landscape ? short : long
  const scale = opts.fitWidth ? Math.min(1, (pageW - MARGIN * 2) / width) : 1
  return { pageW, pageH, landscape, scale }
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

export async function buildPdf(
  sheets: Sheet[],
  opts: PdfOptions,
  onProgress: (done: number, total: number) => void,
): Promise<Blob> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  let pdf: InstanceType<typeof jsPDF> | null = null

  for (const [i, sheet] of sheets.entries()) {
    const { pageW, pageH, landscape, scale } = pageFor(sheet, opts)
    const orientation = landscape ? 'landscape' : 'portrait'
    if (!pdf) pdf = new jsPDF({ unit: 'pt', format: [pageW, pageH], orientation, compress: true })
    else pdf.addPage([pageW, pageH], orientation)

    const darkEdges: (readonly [number, number, number, number])[] = []
    const body = sheet.rows.map((row, r) =>
      row
        .filter((cell) => !cell.covered)
        .map((cell) => {
          const s = cell.style
          const side = (on: boolean) => (on ? Math.max(0.75 * scale, 0.5) : 0)
          return {
            content: cell.text,
            // Read back in didDrawCell to draw gridlines on the other sides.
            border: s.border,
            colSpan: cell.colSpan,
            rowSpan: cell.rowSpan,
            styles: {
              fontStyle: (s.bold && s.italic ? 'bolditalic' : s.bold ? 'bold' : s.italic ? 'italic' : 'normal') as
                | 'bolditalic'
                | 'bold'
                | 'italic'
                | 'normal',
              fontSize: s.size * scale,
              textColor: s.color ? hexToRgb(s.color) : ([17, 17, 17] as [number, number, number]),
              fillColor: s.fill ? hexToRgb(s.fill) : false as const,
              halign: s.align,
              valign: s.valign,
              overflow: (s.wrap ? 'linebreak' : 'ellipsize') as 'linebreak' | 'ellipsize',
              // Only when Excel stored a height: autotable treats an explicit
              // `undefined` as 0 and stops growing rows for wrapped text.
              ...(sheet.rowHeights[r] ? { minCellHeight: sheet.rowHeights[r]! * scale } : {}),
              lineColor: [63, 63, 70] as [number, number, number],
              lineWidth: { top: side(s.border.top), right: side(s.border.right), bottom: side(s.border.bottom), left: side(s.border.left) },
            },
          }
        }),
    )

    autoTable(pdf, {
      body,
      startY: MARGIN,
      margin: MARGIN,
      theme: 'plain',
      tableWidth: sheetWidth(sheet) * scale,
      // Real-size mode: columns that do not fit continue on the next page.
      horizontalPageBreak: !opts.fitWidth,
      horizontalPageBreakRepeat: undefined,
      styles: { font: 'helvetica', cellPadding: { top: 2 * scale, bottom: 2 * scale, left: 3 * scale, right: 3 * scale } },
      columnStyles: Object.fromEntries(sheet.colWidths.map((w, c) => [c, { cellWidth: w * scale }])),
      // Excel draws light gridlines on every side without a real border, but
      // autotable has one line colour per cell — so gridlines are drawn here,
      // and the dark borders they may have overdrawn are re-stroked once the
      // page is done.
      didDrawCell: ({ cell, doc }) => {
        const border = (cell.raw as { border?: CellStyle['border'] } | undefined)?.border
        if (!border) return
        const { x, y, width: w, height: h } = cell
        const edges = {
          top: [x, y, x + w, y],
          bottom: [x, y + h, x + w, y + h],
          left: [x, y, x, y + h],
          right: [x + w, y, x + w, y + h],
        } as const
        for (const side of ['top', 'bottom', 'left', 'right'] as const) {
          if (border[side]) darkEdges.push(edges[side])
          // A filled cell hides its gridlines, as in Excel.
          else if (opts.gridlines && !cell.styles.fillColor) {
            doc.setDrawColor(212, 212, 216)
            doc.setLineWidth(0.4 * scale)
            doc.line(...edges[side])
          }
        }
      },
      didDrawPage: ({ doc }) => {
        doc.setDrawColor(63, 63, 70)
        doc.setLineWidth(Math.max(0.75 * scale, 0.5))
        for (const edge of darkEdges) doc.line(...edge)
        darkEdges.length = 0
      },
    })

    onProgress(i + 1, sheets.length)
    await new Promise((r) => setTimeout(r, 0))
  }

  return pdf!.output('blob')
}
