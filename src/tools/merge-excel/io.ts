// Reading and writing the files merge-excel works with. ExcelJS and JSZip are
// dynamic imports, so they load only when this tool is used.

import { tr } from '@/lib/i18n'
import { fileNames, parseCsv, sheetNames, toCsv, toTable, type Table, type Value } from './table'

export interface LoadedFile {
  id: number
  name: string
  tables: Table[]
}

export class UnreadableFileError extends Error {}

/** ExcelJS cell values can be formulas, rich text or links: reduce them to plain values. */
function plain(v: unknown): Value {
  if (v === null || v === undefined) return null
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v instanceof Date) return v
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('result' in o) return plain(o.result)
    if (Array.isArray(o.richText)) return o.richText.map((p: { text?: string }) => p.text ?? '').join('')
    if ('text' in o) return plain(o.text)
    if ('error' in o) return String(o.error)
  }
  return String(v)
}

export async function readFile(file: File): Promise<Table[]> {
  const base = file.name.replace(/\.[^.]+$/, '')
  if (/\.(csv|txt|tsv)$/i.test(file.name) || file.type === 'text/csv') {
    const t = toTable(base, parseCsv(await file.text()), tr('Kolom', 'Column'))
    if (!t.headers.length) throw new UnreadableFileError()
    return [t]
  }
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(await file.arrayBuffer())
  } catch {
    throw new UnreadableFileError()
  }
  const tables: Table[] = []
  for (const ws of wb.worksheets) {
    if (ws.state !== 'visible') continue
    const raw: Value[][] = []
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: Value[] = []
      // row.values is 1-based and sparse.
      const values = row.values as unknown[]
      for (let c = 1; c <= row.cellCount; c++) cells.push(plain(values[c]))
      raw.push(cells)
    })
    const t = toTable(wb.worksheets.length > 1 ? `${base} – ${ws.name}` : base, raw, tr('Kolom', 'Column'))
    if (t.headers.length) tables.push(t)
  }
  if (!tables.length) throw new UnreadableFileError()
  return tables
}

export interface OutSheet {
  name: string
  headers: string[]
  rows: Value[][]
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function buildWorkbook(sheets: OutSheet[]): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const names = sheetNames(sheets.map((s) => s.name))
  sheets.forEach((s, i) => {
    const ws = wb.addWorksheet(names[i], { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.addRow(s.headers).font = { bold: true }
    for (const r of s.rows) ws.addRow(r)
    ws.columns.forEach((col, c) => {
      let width = String(s.headers[c] ?? '').length
      for (const r of s.rows.slice(0, 200)) {
        const v = r[c]
        const len = v instanceof Date ? 10 : v === null ? 0 : String(v).length
        if (len > width) width = len
      }
      col.width = Math.min(Math.max(width + 2, 8), 50)
    })
    if (s.headers.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.headers.length } }
  })
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: XLSX_MIME })
}

export function buildCsv(s: OutSheet): Blob {
  return new Blob([toCsv(s.headers, s.rows)], { type: 'text/csv;charset=utf-8' })
}

/** One file per sheet (.xlsx or .csv), zipped. */
export async function buildZip(sheets: OutSheet[], kind: 'xlsx' | 'csv'): Promise<Blob> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const names = fileNames(sheets.map((s) => s.name), kind === 'xlsx' ? '.xlsx' : '.csv')
  for (const [i, s] of sheets.entries()) {
    zip.file(names[i], kind === 'xlsx' ? await buildWorkbook([s]) : buildCsv(s))
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}
