// Everything here runs in the visitor's browser: pdf.js reads the PDF from
// memory, the text is rebuilt into paragraphs, and `docx` writes the .docx.
// Heavy libraries are dynamic imports so they load only when used.
//
// A PDF has no paragraphs — only pieces of text placed at x/y positions. This
// file reconstructs lines from those pieces, then paragraphs from the lines,
// keeping size, bold and italic. Layout that has no text equivalent (exact
// positions, images, drawn table borders) is not carried over.

import type { PDFPageProxy } from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'

interface Run {
  text: string
  size: number
  bold: boolean
  italic: boolean
  /** Family name as Word knows it, e.g. "Times New Roman"; "" when unknown. */
  font: string
}

interface Piece extends Run {
  x: number
  right: number
  y: number
}

interface Line {
  pieces: Piece[]
  runs: Run[]
  x: number
  right: number
  /** Baseline, measured from the page top (grows downward). */
  y: number
  size: number
}

export interface Paragraph {
  runs: Run[]
  align: 'left' | 'center'
  /** Left indent relative to the page's text margin, in points. */
  indent: number
  pageBreakBefore: boolean
}

export interface PdfConversion {
  paragraphs: Paragraph[]
  pages: number
  /** Page size and text margins of the first page, in points. */
  page: { width: number; height: number; marginLeft: number; marginRight: number; marginTop: number; marginBottom: number }
}

export class ScannedPdfError extends Error {}
export class LockedPdfError extends Error {}

/** Opens the PDF; `destroy()` on the returned task frees it and its worker. */
async function loadPdf(file: File) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
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

async function readLines(page: PDFPageProxy) {
  // The operator list resolves the page's fonts into commonObjs, which is
  // where their real names (and so bold/italic) live.
  await page.getOperatorList()
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()

  const pieces: Piece[] = content.items
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
    // gap that marks a column/tab. Word spacing is rebuilt from gaps below.
    .filter((p) => p.text.trim())
    .sort((p, q) => p.y - q.y || p.x - q.x)

  const lines: Line[] = []
  for (const p of pieces) {
    const line = lines.find((l) => Math.abs(l.y - p.y) < Math.min(l.size, p.size) * 0.5)
    if (!line) {
      lines.push({ pieces: [p], runs: [], x: p.x, right: p.right, y: p.y, size: p.size })
      continue
    }
    line.pieces.push(p)
    line.x = Math.min(line.x, p.x)
    line.right = Math.max(line.right, p.right)
    line.size = Math.max(line.size, p.size)
  }

  for (const line of lines) {
    line.pieces.sort((p, q) => p.x - q.x)
    let prevRight: number | null = null
    for (const p of line.pieces) {
      let text = p.text
      if (prevRight !== null) {
        const gap = p.x - prevRight
        // A wide gap inside one line is a column/table separation → tab.
        if (gap > p.size * 2) text = '\t' + text.trimStart()
        else if (gap > p.size * 0.15 && !/\s$/.test(lastText(line.runs)) && !/^\s/.test(text)) text = ' ' + text
      }
      pushRun(line.runs, { text, size: p.size, bold: p.bold, italic: p.italic, font: p.font })
      prevRight = p.right
    }
  }

  lines.sort((l, m) => l.y - m.y)
  return { lines, width: viewport.width, height: viewport.height }
}

function lastText(runs: Run[]) {
  return runs.length ? runs[runs.length - 1].text : ''
}

/** Appends text, merging into the previous run when the style is the same. */
function pushRun(runs: Run[], run: Run) {
  const last = runs[runs.length - 1]
  if (
    last &&
    last.bold === run.bold &&
    last.italic === run.italic &&
    last.font === run.font &&
    Math.abs(last.size - run.size) < 0.5
  ) {
    last.text += run.text
  } else {
    runs.push({ ...run })
  }
}

/**
 * The usual baseline-to-baseline distance inside a paragraph, per font size.
 * It is the most common gap between consecutive same-size lines; a gap even
 * slightly larger than it (paragraph or list-item spacing) starts a new paragraph.
 */
function linePitches(lines: Line[]) {
  const counts = new Map<number, Map<number, number>>()
  for (let i = 1; i < lines.length; i++) {
    const a = lines[i - 1]
    const b = lines[i]
    const gap = b.y - a.y
    if (Math.abs(a.size - b.size) >= 1 || gap <= 0 || gap > b.size * 2.5) continue
    const size = Math.round(b.size)
    const bySize = counts.get(size) ?? new Map<number, number>()
    const key = Math.round(gap * 4) / 4
    bySize.set(key, (bySize.get(key) ?? 0) + 1)
    counts.set(size, bySize)
  }
  const pitches = new Map<number, number>()
  for (const [size, bySize] of counts) {
    // Most frequent gap; ties go to the smaller one (tighter = in-paragraph).
    const [best] = [...bySize].sort((x, y) => y[1] - x[1] || x[0] - y[0])
    pitches.set(size, best[0])
  }
  return (size: number) => pitches.get(Math.round(size)) ?? size * 1.2
}

const BULLET = /^\s*([•●▪◦‣∙·\-–*]|\d{1,3}[.)]|[a-zA-Z][.)])\s/

/** Groups a page's lines into paragraphs. */
function toParagraphs(lines: Line[], pageWidth: number, marginLeft: number, textWidth: number) {
  const pitch = linePitches(lines)
  const paragraphs: (Paragraph & { last: Line })[] = []

  for (const line of lines) {
    const text = line.runs.map((r) => r.text).join('')
    if (!text.trim()) continue

    const center = (line.x + line.right) / 2
    const centered =
      Math.abs(center - pageWidth / 2) < pageWidth * 0.04 && line.x - marginLeft > textWidth * 0.12

    const prev = paragraphs[paragraphs.length - 1]
    const joins =
      prev &&
      !centered &&
      prev.align === 'left' &&
      line.y - prev.last.y <= pitch(line.size) + Math.max(1, line.size * 0.12) &&
      Math.abs(line.size - prev.last.size) < 1 &&
      // A tabbed line ("role ⇥ date") is a row of its own.
      !text.includes('\t') &&
      !prev.runs.some((r) => r.text.includes('\t')) &&
      !BULLET.test(text) &&
      // The previous line stopped well short of the margin: it ended its paragraph.
      prev.last.right > marginLeft + textWidth * 0.75 &&
      // A continuation line starts at the paragraph's left edge or its hanging indent.
      line.x >= marginLeft + prev.indent - 2

    if (joins) {
      const tail = lastText(prev.runs)
      if (tail.endsWith('-') && /^[a-z]/.test(text)) {
        // Word split across lines with a hyphen: rejoin it.
        prev.runs[prev.runs.length - 1].text = tail.slice(0, -1)
      } else if (!/\s$/.test(tail)) {
        pushRun(prev.runs, { ...line.runs[0], text: ' ' })
      }
      for (const run of line.runs) pushRun(prev.runs, run)
      prev.last = line
    } else {
      paragraphs.push({
        runs: line.runs.map((r) => ({ ...r })),
        align: centered ? 'center' : 'left',
        indent: centered ? 0 : Math.max(0, line.x - marginLeft),
        pageBreakBefore: false,
        last: line,
      })
    }
  }

  return paragraphs.map(({ last: _last, ...p }) => p)
}

export async function convertPdf(file: File, onProgress: (done: number, total: number) => void): Promise<PdfConversion> {
  const { task, pdf } = await loadPdf(file)
  const pages = []
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      pages.push(await readLines(page))
      page.cleanup()
      onProgress(n, pdf.numPages)
    }
  } finally {
    void task.destroy()
  }

  const allLines = pages.flatMap((p) => p.lines)
  const chars = allLines.reduce((n, l) => n + l.runs.reduce((m, r) => m + r.text.trim().length, 0), 0)
  if (chars < 20) throw new ScannedPdfError()

  // One text margin for the whole document, from where most lines start/end.
  const first = pages[0]
  const marginLeft = Math.max(18, Math.min(...allLines.map((l) => l.x)))
  const marginRight = Math.max(18, first.width - Math.max(...allLines.map((l) => l.right)))
  const marginTop = Math.max(18, Math.min(...pages.filter((p) => p.lines.length).map((p) => p.lines[0].y - p.lines[0].size)))
  const marginBottom = Math.max(18, Math.min(...pages.filter((p) => p.lines.length).map((p) => p.height - p.lines[p.lines.length - 1].y)) - 6)
  const textWidth = first.width - marginLeft - marginRight

  const paragraphs: Paragraph[] = []
  pages.forEach((page, i) => {
    const ps = toParagraphs(page.lines, page.width, marginLeft, textWidth)
    if (i > 0 && ps[0]) ps[0].pageBreakBefore = true
    paragraphs.push(...ps)
  })

  return {
    paragraphs,
    pages: pages.length,
    page: { width: first.width, height: first.height, marginLeft, marginRight, marginTop, marginBottom },
  }
}

export async function buildDocx({ paragraphs, page }: PdfConversion) {
  const { AlignmentType, Document, Packer, Paragraph, Tab, TabStopType, TextRun } = await import('docx')
  const twips = (pt: number) => Math.round(pt * 20)
  const textWidth = page.width - page.marginLeft - page.marginRight

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: twips(page.width), height: twips(page.height) },
            margin: {
              top: twips(page.marginTop),
              bottom: twips(page.marginBottom),
              left: twips(page.marginLeft),
              right: twips(page.marginRight),
            },
          },
        },
        children: paragraphs.map(
          (p) =>
            new Paragraph({
              alignment: p.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
              indent: p.indent > 2 ? { left: twips(p.indent) } : undefined,
              pageBreakBefore: p.pageBreakBefore,
              spacing: { after: 120 },
              // Right-aligned stop for "label ⇥ date" style lines.
              tabStops: [{ type: TabStopType.RIGHT, position: twips(textWidth) }],
              children: p.runs.map(
                (r) =>
                  new TextRun({
                    // A tab-separated run becomes text pieces with real tabs between.
                    children: r.text.split('\t').flatMap((part, i) => (i === 0 ? [part] : [new Tab(), part])),
                    bold: r.bold,
                    italics: r.italic,
                    size: Math.round(r.size * 2), // half-points
                    font: r.font || undefined,
                  }),
              ),
            }),
        ),
      },
    ],
  })

  return Packer.toBlob(doc)
}
