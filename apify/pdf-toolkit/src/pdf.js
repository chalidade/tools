// The PDF operations, each one qpdf command (see qpdf.js).
import { qpdf } from './qpdf.js'

export class PdfError extends Error {}

// Smaller output: pack objects into object streams, recompress streams.
const OPTIMIZE = ['--object-streams=generate', '--compress-streams=y', '--recompress-flate']

function check(r, what) {
  if (r.code === 0 || r.code === 3) return
  const log = r.log
  if (/invalid password|password/i.test(log)) throw new PdfError('The PDF is password-protected: set "password" (the one that opens it).')
  if (/not a PDF|can't find PDF header|unable to find trailer/i.test(log)) throw new PdfError('Not a PDF file, or a badly damaged one.')
  if (/page range|invalid range|out of range/i.test(log)) throw new PdfError(`Invalid page range: ${(log.split('\n').find((l) => /range/i.test(l)) ?? '').replace(/^[\w.]+:\s*/, '')}`.trim())
  throw new PdfError(`${what} failed: ${log.split('\n').filter(Boolean).pop() ?? 'qpdf error ' + r.code}`)
}

const pw = (password) => (password ? [`--password=${password}`] : [])

/**
 * A page selection in plain words → qpdf's syntax: "1-3, 7, 10-" → "1-3,7,10-z",
 * "last" → "z". Returns null for an empty selection.
 */
export function qpdfRange(spec) {
  const s = String(spec ?? '').replace(/\s+/g, '').toLowerCase()
  if (!s) return null
  return s
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\d+|last|z)?(-)?(\d+|last|z)?$/)
      if (!m || (!m[1] && !m[3])) throw new PdfError(`Invalid page range "${part}". Use e.g. "1-3,7,10-" or "last".`)
      const v = (x) => (x === 'last' || x === 'z' ? 'z' : x)
      if (!m[2]) return v(m[1] ?? m[3])
      return `${m[1] ? v(m[1]) : '1'}-${m[3] ? v(m[3]) : 'z'}`
    })
    .join(',')
}

export async function pageCount(bytes, password) {
  const r = await qpdf({ 'a.pdf': bytes }, [...pw(password), '--show-npages', '/in/a.pdf'])
  check(r, 'Reading the PDF')
  return Number(r.log.trim().split('\n').pop()) || 0
}

/** Several PDFs → one, in order. `files` = [{ bytes, pages?: string }]. */
export async function mergePdfs(files, password) {
  const inputs = {}
  const pages = []
  files.forEach((f, i) => {
    const name = `${String(i).padStart(4, '0')}.pdf`
    inputs[name] = f.bytes
    pages.push(`/in/${name}`, ...pw(password), qpdfRange(f.pages) ?? '1-z')
  })
  const r = await qpdf(inputs, ['--empty', ...OPTIMIZE, '--pages', ...pages, '--', '/out/merged.pdf'])
  check(r, 'Merging')
  return r.outputs.get('merged.pdf')
}

/** One PDF → several: every N pages, or one file per comma-separated range ("1-3,4-10,11-"). */
export async function splitPdf(bytes, { every, ranges, password }) {
  if (ranges && String(ranges).trim()) {
    const parts = String(ranges).split(',').map((s) => s.trim()).filter(Boolean)
    const out = []
    for (const part of parts) {
      const range = qpdfRange(part)
      const r = await qpdf({ 'a.pdf': bytes }, [...pw(password), ...OPTIMIZE, '/in/a.pdf', '--pages', '.', range, '--', '/out/part.pdf'])
      check(r, `Pages ${part}`)
      out.push({ label: part.replace(/\s+/g, '').replace(/-$/, '-end').replace(/^-/, '1-'), bytes: r.outputs.get('part.pdf') })
    }
    return out
  }
  const n = Math.max(1, Math.floor(every || 1))
  const r = await qpdf({ 'a.pdf': bytes }, [...pw(password), ...OPTIMIZE, `--split-pages=${n}`, '/in/a.pdf', '/out/part-%d.pdf'])
  check(r, 'Splitting')
  // qpdf names them part-01.pdf (single pages) or part-01-05.pdf (groups).
  return [...r.outputs.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
    .map(([name, b]) => ({ label: name.replace(/^part-|\.pdf$/g, '').replace(/^0+(?=\d)/, '').replace(/-0+(?=\d)/, '-'), bytes: b }))
}

/** Keep only the selected pages, in the given order. */
export async function extractPages(bytes, pages, password) {
  const range = qpdfRange(pages)
  if (!range) throw new PdfError('Set "pages" to the pages to keep, e.g. "1-3,7".')
  const r = await qpdf({ 'a.pdf': bytes }, [...pw(password), ...OPTIMIZE, '/in/a.pdf', '--pages', '.', range, '--', '/out/out.pdf'])
  check(r, 'Extracting pages')
  return r.outputs.get('out.pdf')
}

/** Drop the selected pages. */
export async function deletePages(bytes, pages, password) {
  const range = qpdfRange(pages)
  if (!range) throw new PdfError('Set "pages" to the pages to delete, e.g. "2,5-6".')
  const total = await pageCount(bytes, password)
  const drop = new Set()
  for (const part of range.split(',')) {
    const [a, b] = part.split('-').map((x) => (x === 'z' ? total : Number(x)))
    for (let p = a; p <= (b ?? a); p++) drop.add(p)
  }
  const keep = []
  for (let p = 1; p <= total; p++) if (!drop.has(p)) keep.push(p)
  if (!keep.length) throw new PdfError('That would delete every page.')
  const r = await qpdf({ 'a.pdf': bytes }, [...pw(password), ...OPTIMIZE, '/in/a.pdf', '--pages', '.', keep.join(','), '--', '/out/out.pdf'])
  check(r, 'Deleting pages')
  return r.outputs.get('out.pdf')
}

/** Rotate the selected pages (all when empty) clockwise by 90, 180 or 270 degrees. */
export async function rotatePages(bytes, angle, pages, password) {
  const range = qpdfRange(pages) ?? '1-z'
  const r = await qpdf({ 'a.pdf': bytes }, [...pw(password), ...OPTIMIZE, `--rotate=+${angle}:${range}`, '/in/a.pdf', '/out/out.pdf'])
  check(r, 'Rotating')
  return r.outputs.get('out.pdf')
}

/** Remove the password and restrictions (needs the password when it opens with one). */
export async function unlockPdf(bytes, password) {
  const r = await qpdf({ 'a.pdf': bytes }, [...pw(password), '--decrypt', ...OPTIMIZE, '/in/a.pdf', '/out/out.pdf'])
  check(r, 'Unlocking')
  return r.outputs.get('out.pdf')
}
