export type Verdict = 'pass' | 'fail' | 'skip' | undefined

export interface SummaryRow {
  label: string
  verdict: Verdict
}

export interface SummaryLabels {
  title: string
  pass: string
  fail: string
  skip: string
  pending: string
}

const MARK: Record<'pass' | 'fail' | 'skip' | 'pending', string> = { pass: '✔', fail: '✘', skip: '–', pending: '·' }

/** Plain-text summary of the checklist, ready to paste into a chat or a listing. */
export function buildSummary(rows: SummaryRow[], info: [string, string][], l: SummaryLabels): string {
  const name = (v: Verdict) => (v === 'pass' ? l.pass : v === 'fail' ? l.fail : v === 'skip' ? l.skip : l.pending)
  const mark = (v: Verdict) => MARK[v ?? 'pending']
  const lines = [l.title, '']
  for (const r of rows) lines.push(`${mark(r.verdict)} ${r.label}: ${name(r.verdict)}`)
  const failed = rows.filter((r) => r.verdict === 'fail').length
  const passed = rows.filter((r) => r.verdict === 'pass').length
  lines.push('', `${passed}/${rows.length} ${l.pass.toLowerCase()}, ${failed} ${l.fail.toLowerCase()}`)
  if (info.length) {
    lines.push('')
    for (const [k, v] of info) lines.push(`${k}: ${v}`)
  }
  return lines.join('\n')
}

/** Names of the keys a keyboard test lights up, e.g. "KeyA" → "A", "ArrowUp" → "↑". */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  const map: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Backspace: '⌫', Enter: '⏎', Escape: 'Esc' }
  return map[code] ?? code
}

/** Fraction of touch-grid cells that were touched, 0..1. */
export function coverage(touched: ReadonlySet<number>, total: number): number {
  return total > 0 ? Math.min(1, touched.size / total) : 0
}

/** Which grid cell a point falls in (row-major), clamped to the grid. */
export function cellAt(x: number, y: number, w: number, h: number, cols: number, rows: number): number {
  const c = Math.min(cols - 1, Math.max(0, Math.floor((x / w) * cols)))
  const r = Math.min(rows - 1, Math.max(0, Math.floor((y / h) * rows)))
  return r * cols + c
}
