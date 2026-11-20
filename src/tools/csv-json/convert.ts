import { parseCsv, toCsv, type CsvSeparator } from '@/lib/csv'
import { tr } from '@/lib/i18n'

/** "12" → 12, "true" → true; numbers with a leading zero (phone numbers, IDs) stay text. */
function typed(value: string): unknown {
  const v = value.trim()
  if (v === '') return ''
  if (v === 'true' || v === 'false') return v === 'true'
  if (v === 'null') return null
  if (/^-?(0|[1-9]\d{0,14})(\.\d+)?([eE][-+]?\d+)?$/.test(v)) return Number(v)
  return value
}

export interface CsvToJsonOptions {
  sep: CsvSeparator
  header: boolean
  types: boolean
}

/** CSV text → rows (for the preview) and JSON text. */
export function csvToJson(text: string, { sep, header, types }: CsvToJsonOptions, indent: number) {
  const rows = parseCsv(text, sep)
  const cell = (v: string | undefined) => (types ? typed(v ?? '') : (v ?? ''))
  let data: unknown
  if (header && rows.length) {
    // Blank or repeated header cells still need distinct keys.
    const seen = new Map<string, number>()
    const keys = rows[0].map((k, i) => {
      const base = k.trim() || `kolom_${i + 1}`
      const n = seen.get(base) ?? 0
      seen.set(base, n + 1)
      return n ? `${base}_${n + 1}` : base
    })
    data = rows.slice(1).map((r) => Object.fromEntries(keys.map((k, i) => [k, cell(r[i])])))
  } else data = rows.map((r) => r.map((v) => cell(v)))
  return { rows, json: JSON.stringify(data, null, indent) }
}

const asText = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))

/** JSON (an array of objects, an array of arrays, or one object) → rows and CSV text. */
export function jsonToCsv(text: string, sep: CsvSeparator) {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (e) {
    throw new Error(tr('JSON tidak valid: ', 'Invalid JSON: ') + (e instanceof Error ? e.message : String(e)))
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    // { "items": [...] } — use the first array inside, else the object itself as one row.
    const inner = Object.values(data).find(Array.isArray)
    data = inner ?? [data]
  }
  if (!Array.isArray(data)) throw new Error(tr('JSON harus berupa array atau objek.', 'The JSON must be an array or an object.'))
  let rows: string[][]
  if (data.every(Array.isArray)) rows = (data as unknown[][]).map((r) => r.map(asText))
  else {
    // Keys in the order they first appear across all rows.
    const keys: string[] = []
    const seen = new Set<string>()
    for (const item of data)
      if (item && typeof item === 'object' && !Array.isArray(item))
        for (const k of Object.keys(item))
          if (!seen.has(k)) {
            seen.add(k)
            keys.push(k)
          }
    if (!keys.length) rows = data.map((v) => [asText(v)])
    else
      rows = [
        keys,
        ...data.map((item) =>
          keys.map((k) => (item && typeof item === 'object' ? asText((item as Record<string, unknown>)[k]) : '')),
        ),
      ]
  }
  return { rows, csv: toCsv(rows, sep) }
}
