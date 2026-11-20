/** Separators CSV files use: "," by default, ";" from Excel in decimal-comma locales (e.g. Indonesian), tab from spreadsheets copied as text. */
export type CsvSeparator = ',' | ';' | '\t'

/** Guesses the separator from the first line, ignoring quoted text. */
export function detectSeparator(text: string): CsvSeparator {
  const end = text.search(/\r?\n/)
  const first = (end < 0 ? text : text.slice(0, end)).replace(/"[^"]*"/g, '')
  const count = (c: string) => first.split(c).length - 1
  const [best] = ([',', ';', '\t'] as const).map((c) => [c, count(c)] as const).sort((a, b) => b[1] - a[1])
  return best[1] > 0 ? best[0] : ','
}

/** RFC 4180 CSV reader: quoted fields, escaped quotes, line breaks inside quotes, CRLF. Blank rows are dropped. */
export function parseCsv(text: string, sep: CsvSeparator = detectSeparator(text)): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // Excel's UTF-8 BOM
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"' && field === '') quoted = true
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

/** One CSV field, quoted only when it has to be. */
function csvField(value: string, sep: CsvSeparator) {
  return /["\r\n]/.test(value) || value.includes(sep) || /^\s|\s$/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Rows back to CSV text (CRLF line ends, as Excel writes them). */
export function toCsv(rows: string[][], sep: CsvSeparator = ','): string {
  return rows.map((r) => r.map((f) => csvField(f, sep)).join(sep)).join('\r\n')
}
