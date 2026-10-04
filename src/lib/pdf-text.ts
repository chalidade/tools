// Reads the text layer of a PDF with pdf.js, in the visitor's browser: every
// piece of text with its position, size, and bold/italic/font family. Shared
// by the tools that rebuild documents from PDFs (Word, Excel). pdf.js is a
// dynamic import so it loads only when used.

import type { PDFPageProxy } from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'

export class ScannedPdfError extends Error {}
export class LockedPdfError extends Error {}

export interface TextPiece {
  text: string
  /** Left/right edge and baseline in points; y is measured from the page top. */
  x: number
  right: number
  y: number
  size: number
  bold: boolean
  italic: boolean
  /** Family name as office apps know it, e.g. "Times New Roman"; "" when unknown. */
  font: string
}

export interface TextLine {
  /** Left to right. */
  pieces: TextPiece[]
  x: number
  right: number
  y: number
  size: number
}

export interface PageText {
  /** Top to bottom. */
  lines: TextLine[]
  width: number
  height: number
}

/** A run of a line's text that sits together — one table cell or text block. */
export interface TextSegment {
  text: string
  x: number
  right: number
  y: number
  size: number
  /** True only when every piece in the segment is bold/italic. */
  bold: boolean
  italic: boolean
  font: string
}

/**
 * Splits a line where the gap between pieces is wider than a word space,
 * rebuilding the word spaces pdf.js leaves out inside each segment.
 */
export function segmentLine(line: TextLine): TextSegment[] {
  const segments: TextSegment[] = []
  for (const p of line.pieces) {
    const last = segments[segments.length - 1]
    const gap = last ? p.x - last.right : Infinity
    if (last && gap < Math.max(p.size * 0.6, 3)) {
      last.text += (gap > p.size * 0.12 && !/\s$/.test(last.text) ? ' ' : '') + p.text
      last.right = p.right
      last.bold &&= p.bold
      last.italic &&= p.italic
    } else {
      segments.push({ text: p.text, x: p.x, right: p.right, y: line.y, size: p.size, bold: p.bold, italic: p.italic, font: p.font })
    }
  }
  for (const s of segments) s.text = s.text.replace(/\s+/g, ' ').trim()
  return segments.filter((s) => s.text)
}

/**
 * pdf.js itself. The legacy build: pdf.js 6 relies on very new JavaScript
 * (Map.getOrInsertComputed, Promise.try, Uint8Array.fromBase64,
 * Math.sumPrecise…) in both the page and the worker, and the legacy build
 * ships polyfills for them, so PDFs still open in browsers a few versions old.
 */
export const importPdfjs = () => import('pdfjs-dist/legacy/build/pdf.mjs')

/** Opens the PDF; `destroy()` on the returned task frees it and its worker. */
export async function loadPdf(file: File) {
  const pdfjs = await importPdfjs()
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  try {
    return { task, pdf: await task.promise }
  } catch (e) {
    void task.destroy()
    if (e instanceof pdfjs.PasswordException) throw new LockedPdfError()
    throw e
  }
}

/**
 * "ABCDEF+TimesNewRomanPS-BoldItalicMT" → "Times New Roman": drops the subset
 * prefix, the style suffix and PostScript tags, then splits CamelCase.
 */
function familyName(postscript: string) {
  const base = postscript
    .replace(/^[A-Z]{6}\+/, '')
    .split(/[-,]/)[0]
    .replace(/(PSMT|PS|MT)$/, '')
  if (!base || /^g_d\d|^f\d/i.test(base)) return '' // pdf.js internal id, not a real name
  return base.replace(/([a-z])([A-Z])/g, '$1 $2')
}

/** Bold/italic/family come from the embedded font's real name, e.g. "ABCDEF+Calibri-BoldItalic". */
function fontStyle(page: PDFPageProxy, fontName: string) {
  let name = fontName
  let flags: { bold?: boolean; italic?: boolean } = {}
  try {
    const font = page.commonObjs.get(fontName) as { name?: string; bold?: boolean; italic?: boolean } | null
    if (font?.name) name = font.name
    if (font) flags = font
  } catch {
    // Font not resolved yet — fall back to the name pdf.js gave the item.
  }
  return {
    bold: !!flags.bold || /bold|black|heavy|semibold|demi/i.test(name),
    italic: !!flags.italic || /italic|oblique/i.test(name),
    font: familyName(name),
  }
}

/** The page's text pieces, grouped into lines by baseline. */
export async function readPageText(page: PDFPageProxy): Promise<PageText> {
  // The operator list resolves the page's fonts into commonObjs, which is
  // where their real names (and so bold/italic) live.
  await page.getOperatorList()
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()

  const pieces: TextPiece[] = content.items
    .filter((item): item is TextItem => 'str' in item && item.str.length > 0)
    .map((item) => {
      const [a, b, , , e, f] = item.transform
      const size = Math.hypot(a, b) || item.height || 10
      return {
        text: item.str,
        x: e,
        right: e + item.width,
        y: viewport.height - f,
        size,
        ...fontStyle(page, item.fontName),
      }
    })
    // Whitespace-only pieces are dropped: some producers (Chrome among them)
    // fill a right-aligned gap with one very wide space, which would hide the
    // gap that marks a column/tab. Callers rebuild spacing from the gaps.
    .filter((p) => p.text.trim())
    .sort((p, q) => p.y - q.y || p.x - q.x)

  const lines: TextLine[] = []
  for (const p of pieces) {
    const line = lines.find((l) => Math.abs(l.y - p.y) < Math.min(l.size, p.size) * 0.5)
    if (!line) {
      lines.push({ pieces: [p], x: p.x, right: p.right, y: p.y, size: p.size })
      continue
    }
    line.pieces.push(p)
    line.x = Math.min(line.x, p.x)
    line.right = Math.max(line.right, p.right)
    line.size = Math.max(line.size, p.size)
  }
  for (const line of lines) line.pieces.sort((p, q) => p.x - q.x)
  lines.sort((l, m) => l.y - m.y)

  return { lines, width: viewport.width, height: viewport.height }
}

/** Reads every page, in order. Throws ScannedPdfError when there is (almost) no text. */
export async function readPdfText(file: File, onProgress: (done: number, total: number) => void) {
  const { task, pdf } = await loadPdf(file)
  const pages: PageText[] = []
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      pages.push(await readPageText(page))
      page.cleanup()
      onProgress(n, pdf.numPages)
    }
  } finally {
    void task.destroy()
  }
  const chars = pages.reduce((n, p) => n + p.lines.reduce((m, l) => m + l.pieces.reduce((k, x) => k + x.text.trim().length, 0), 0), 0)
  if (chars < 20) throw new ScannedPdfError()
  return pages
}
