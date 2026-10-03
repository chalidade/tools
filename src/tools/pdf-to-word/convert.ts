// Everything here runs in the visitor's browser: pdf.js reads the PDF from
// memory, the text is rebuilt into paragraphs, and `docx` writes the .docx.
// Heavy libraries are dynamic imports so they load only when used.
//
// A PDF has no paragraphs — only pieces of text placed at x/y positions. This
// file reconstructs lines from those pieces, then paragraphs from the lines,
// keeping size, bold and italic. Layout that has no text equivalent (exact
// positions, images, drawn table borders) is not carried over.

import { readPdfText, type TextLine } from '@/lib/pdf-text'

export { LockedPdfError, ScannedPdfError } from '@/lib/pdf-text'

interface Run {
  text: string
  size: number
  bold: boolean
  italic: boolean
  /** Family name as Word knows it, e.g. "Times New Roman"; "" when unknown. */
  font: string
}

interface Line {
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

/** Joins a line's pieces into styled runs, turning wide gaps into tabs. */
function toRuns(line: TextLine): Line {
  const runs: Run[] = []
  let prevRight: number | null = null
  for (const p of line.pieces) {
    let text = p.text
    if (prevRight !== null) {
      const gap = p.x - prevRight
      // A wide gap inside one line is a column/table separation → tab.
      if (gap > p.size * 2) text = '\t' + text.trimStart()
      else if (gap > p.size * 0.15 && !/\s$/.test(lastText(runs)) && !/^\s/.test(text)) text = ' ' + text
    }
    pushRun(runs, { text, size: p.size, bold: p.bold, italic: p.italic, font: p.font })
    prevRight = p.right
  }
  return { runs, x: line.x, right: line.right, y: line.y, size: line.size }
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
  const pages = (await readPdfText(file, onProgress)).map((p) => ({ ...p, lines: p.lines.map(toRuns) }))

  const allLines = pages.flatMap((p) => p.lines)

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
