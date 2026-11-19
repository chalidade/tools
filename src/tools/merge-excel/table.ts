// Pure table logic for merge-excel: CSV parsing/writing, matching columns by
// their titles, and splitting rows by the value of one column. No DOM, no
// libraries — so it can be checked with plain node.

export type Value = string | number | boolean | Date | null

export interface Table {
  name: string
  headers: string[]
  rows: Value[][]
}

/** Parses CSV text (comma, semicolon or tab; quotes; CRLF). Returns rows of strings. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const firstLine = src.split(/\r?\n/, 1)[0] ?? ''
  const count = (c: string) => firstLine.split(c).length - 1
  const delim = [',', ';', '\t'].reduce((best, c) => (count(c) > count(best) ? c : best), ',')

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === delim) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function csvField(v: Value): string {
  const s = v === null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v)
  return /[",\r\n;]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV text with a BOM so Excel opens accents and non-Latin text correctly. */
export function toCsv(headers: string[], rows: Value[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(csvField).join(','))
  return '﻿' + lines.join('\r\n') + '\r\n'
}

/** Turns raw rows (first row = titles) into a Table with usable, unique titles. */
export function toTable(name: string, raw: Value[][], columnLabel = 'Kolom'): Table {
  const rows = raw.filter((r) => r.some((c) => c !== null && String(c).trim() !== ''))
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0)
  const seen = new Map<string, number>()
  const headers = Array.from({ length: width }, (_, i) => {
    const base = rows[0]?.[i] == null ? '' : String(rows[0][i]).trim()
    const title = base || `${columnLabel} ${i + 1}`
    const key = title.toLowerCase()
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)
    return n > 1 ? `${title} (${n})` : title
  })
  const body = rows.slice(1).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? null))
  return { name, headers, rows: body }
}

export interface Merged {
  headers: string[]
  rows: Value[][]
}

export interface MergeOptions {
  /** Match columns by their titles (case/space-insensitive); otherwise by position. */
  byTitle: boolean
  /** Add a first column saying which file/sheet each row came from. */
  sourceColumn?: string
}

/** Stacks tables into one. Titles are matched ignoring case and extra spaces. */
export function mergeTables(tables: Table[], opts: MergeOptions): Merged {
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()
  const headers: string[] = []
  const index = new Map<string, number>()
  const maps = tables.map((t) =>
    t.headers.map((h, i) => {
      if (!opts.byTitle) {
        if (headers.length <= i) headers[i] = h // first table to reach this column names it
        return i
      }
      const key = norm(h)
      let at = index.get(key)
      if (at === undefined) {
        at = headers.length
        headers.push(h.trim().replace(/\s+/g, ' '))
        index.set(key, at)
      }
      return at
    }),
  )
  const rows: Value[][] = []
  tables.forEach((t, ti) => {
    for (const r of t.rows) {
      const out: Value[] = Array(headers.length).fill(null)
      maps[ti].forEach((dest, i) => (out[dest] = r[i] ?? null))
      rows.push(opts.sourceColumn ? [t.name, ...out] : out)
    }
  })
  return { headers: opts.sourceColumn ? [opts.sourceColumn, ...headers] : headers, rows }
}

export interface Group {
  value: string
  rows: Value[][]
}

export function valueLabel(v: Value, empty = '(kosong)'): string {
  if (v === null || (typeof v === 'string' && v.trim() === '')) return empty
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).trim()
}

/** Groups rows by the value in one column, in order of first appearance. */
export function splitByColumn(table: Table, column: number, empty = '(kosong)'): Group[] {
  const groups = new Map<string, Group>()
  for (const r of table.rows) {
    const label = valueLabel(r[column] ?? null, empty)
    const key = label.toLowerCase()
    let g = groups.get(key)
    if (!g) groups.set(key, (g = { value: label, rows: [] }))
    g.rows.push(r)
  }
  return [...groups.values()]
}

/** Excel sheet names: ≤ 31 chars, none of []:*?/\, unique (case-insensitively). */
export function sheetNames(names: string[]): string[] {
  const used = new Set<string>()
  return names.map((raw) => {
    const base = (raw.replace(/[[\]:*?/\\]/g, ' ').replace(/^'+|'+$/g, '').trim() || 'Sheet').slice(0, 31)
    let name = base
    for (let n = 2; used.has(name.toLowerCase()); n++) {
      const suffix = ` (${n})`
      name = base.slice(0, 31 - suffix.length) + suffix
    }
    used.add(name.toLowerCase())
    return name
  })
}

/** File names that are safe on every OS and unique within the list. */
export function fileNames(names: string[], ext: string): string[] {
  const used = new Set<string>()
  return names.map((raw) => {
    const base = (raw.replace(/[\\/:*?"<>|]|\p{Cc}/gu, '_').replace(/^\.+/, '').trim() || 'file').slice(0, 80)
    let name = base
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} (${n})`
    used.add(name.toLowerCase())
    return name + ext
  })
}
