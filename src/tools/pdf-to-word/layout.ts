// "Same as the PDF" mode for PDF to Word, run entirely in the visitor's browser.
//
// Each PDF page becomes one Word page of the same size, built in two layers:
//  - behind: the page drawn by pdf.js with its text left out, so images, table
//    borders, shading, logos and lines look exactly like the PDF;
//  - in front: the text, as editable Word text in frames placed at the PDF's
//    own positions, with its font, size, bold/italic and colour.
// A block of lines that belong together (same left edge, regular spacing)
// shares one frame, and every PDF line keeps its own line break, so the text
// lines up with the PDF instead of reflowing in Word's metrics.
//
// Text pdf.js does not draw as text (rotated text, Type3 or path-drawn glyphs,
// invisible OCR layers) stays in the background picture only, so it is never
// shown twice.

import type { PDFPageProxy } from 'pdfjs-dist'
import { loadPdf, readPageText, ScannedPdfError, type TextPiece } from '@/lib/pdf-text'

/** Background resolution: 2.5 px per point ≈ 180 dpi, enough for print. */
const RENDER_SCALE = 2.5
/** Longest side of a background picture, so huge pages stay a sane size. */
const MAX_RENDER_PX = 3600

export interface LayoutRun {
  text: string
  size: number
  bold: boolean
  italic: boolean
  font: string
  /** 6-digit hex without '#'. */
  color: string
}

export interface LayoutBlock {
  /** Left edge and top of the first line, in points from the page's top-left. */
  x: number
  top: number
  width: number
  /** Baseline-to-baseline distance used for every line of the block. */
  pitch: number
  /** One entry per PDF line. */
  lines: LayoutRun[][]
  /** Per line: stretched to the block's full width, as in justified text. */
  justify: boolean[]
}

export interface LayoutPage {
  width: number
  height: number
  /** JPEG of the page without its text; absent when that is plain white. */
  background?: { data: Uint8Array; px: number; py: number }
  blocks: LayoutBlock[]
}

export interface LayoutConversion {
  pages: LayoutPage[]
  /** Text blocks in total, for the summary line. */
  blocks: number
}

/** A glyph pdf.js drew as text: where (points, from the top) and in which colour. */
interface Glyph {
  x: number
  y: number
  color: string
}

/** PDF base-14 and common PostScript names → fonts every Word install has. */
const FONT_ALIASES: Record<string, string> = {
  helvetica: 'Arial',
  'helvetica neue': 'Arial',
  arial: 'Arial',
  'arial m t': 'Arial',
  times: 'Times New Roman',
  'times roman': 'Times New Roman',
  'times new roman': 'Times New Roman',
  courier: 'Courier New',
  'courier new': 'Courier New',
  symbol: 'Symbol',
  'zapf dingbats': 'Wingdings',
  // Metric-compatible clones (LibreOffice, Chrome OS, Linux exports): same widths as the originals.
  'liberation sans': 'Arial',
  'liberation serif': 'Times New Roman',
  'liberation mono': 'Courier New',
  arimo: 'Arial',
  tinos: 'Times New Roman',
  cousine: 'Courier New',
  carlito: 'Calibri',
  caladea: 'Cambria',
}

function wordFont(font: string) {
  return FONT_ALIASES[font.toLowerCase()] ?? font
}

function hexColor(style: unknown): string {
  if (typeof style !== 'string') return '000000'
  if (/^#[0-9a-f]{6}$/i.test(style)) return style.slice(1).toUpperCase()
  const m = style.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/)
  if (!m) return '000000'
  return [m[1], m[2], m[3]]
    .map((v) => Number(v).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/**
 * Renders the page with every upright glyph left out, and records where each
 * left-out glyph would have been drawn and in what colour. Rotated or skewed
 * text is drawn normally (a frame cannot hold it) and not recorded.
 */
async function renderWithoutText(page: PDFPageProxy) {
  const base = page.getViewport({ scale: 1 })
  const scale = Math.min(RENDER_SCALE, MAX_RENDER_PX / Math.max(base.width, base.height))
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const glyphs: Glyph[] = []
  const intercept = (draw: CanvasRenderingContext2D['fillText'], style: () => unknown) =>
    function (this: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth?: number) {
      const m = ctx.getTransform()
      // Upright, unskewed text only (the y axis may be flipped).
      const upright = Math.abs(m.b) < 1e-3 * Math.abs(m.a) && Math.abs(m.c) < 1e-3 * Math.abs(m.d) && m.a > 0
      if (!upright) return maxWidth === undefined ? draw.call(this, text, x, y) : draw.call(this, text, x, y, maxWidth)
      glyphs.push({
        x: (m.a * x + m.e) / scale,
        y: (m.d * y + m.f) / scale,
        color: hexColor(style()),
      })
    }
  const fillText = ctx.fillText
  const strokeText = ctx.strokeText
  ctx.fillText = intercept(fillText, () => ctx.fillStyle)
  ctx.strokeText = intercept(strokeText, () => ctx.strokeStyle)

  // 'print': the display intent waits on requestAnimationFrame and stalls in background tabs.
  await page.render({ canvas, canvasContext: ctx, viewport, intent: 'print' }).promise

  let background: LayoutPage['background']
  if (!isBlank(ctx, canvas.width, canvas.height)) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
    if (blob)
      background = {
        data: new Uint8Array(await blob.arrayBuffer()),
        px: canvas.width,
        py: canvas.height,
      }
  }
  canvas.width = canvas.height = 0
  return { glyphs, background }
}

/** True when (nearly) every pixel is white — nothing worth a background picture. */
function isBlank(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data
  for (let i = 0; i < data.length; i += 4 * 3) {
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) return false
  }
  return true
}

interface ColoredPiece extends TextPiece {
  color: string
}

/**
 * Pairs text pieces with the glyphs drawn on them, for their colour; pieces
 * with none were not drawn as text and are left out.
 */
function glyphMatcher(glyphs: Glyph[]) {
  // Bucket glyphs by baseline so each piece only checks its neighbourhood.
  const rows = new Map<number, Glyph[]>()
  for (const g of glyphs) {
    const key = Math.round(g.y)
    const row = rows.get(key) ?? []
    row.push(g)
    rows.set(key, row)
  }
  return (pieces: TextPiece[]) => {
    const out: ColoredPiece[] = []
    for (const p of pieces) {
      const reach = Math.max(1, Math.ceil(p.size * 0.4))
      let hit: Glyph | undefined
      for (let k = Math.round(p.y) - reach; k <= Math.round(p.y) + reach && !hit; k++) {
        hit = rows.get(k)?.find((g) => g.x >= p.x - 1.5 && g.x <= p.right + 0.5)
      }
      if (hit) out.push({ ...p, color: hit.color })
    }
    return out
  }
}

interface Segment {
  pieces: ColoredPiece[]
  x: number
  right: number
  y: number
  size: number
}

/**
 * Splits a line where pieces are far apart (columns, table cells, a date
 * pushed to the right margin), so each part keeps its own position.
 */
function segments(pieces: ColoredPiece[]): Segment[] {
  const out: Segment[] = []
  for (const p of pieces) {
    const last = out[out.length - 1]
    if (last && p.x - last.right < Math.max(p.size, last.size) * 1.1) {
      last.pieces.push(p)
      last.right = Math.max(last.right, p.right)
      last.size = Math.max(last.size, p.size)
    } else {
      out.push({ pieces: [p], x: p.x, right: p.right, y: p.y, size: p.size })
    }
  }
  return out
}

/** A segment's styled runs, rebuilding the word spaces pdf.js leaves out. */
function runsOf(seg: Segment): LayoutRun[] {
  const runs: LayoutRun[] = []
  let prevRight: number | null = null
  for (const p of seg.pieces) {
    let text = p.text
    if (prevRight !== null) {
      const gap = p.x - prevRight
      const tail = runs[runs.length - 1]?.text ?? ''
      if (gap > p.size * 0.15 && !/\s$/.test(tail) && !/^\s/.test(text)) text = ' ' + text
    }
    const run: LayoutRun = {
      text,
      size: p.size,
      bold: p.bold,
      italic: p.italic,
      font: wordFont(p.font),
      color: p.color,
    }
    const last = runs[runs.length - 1]
    if (
      last &&
      last.bold === run.bold &&
      last.italic === run.italic &&
      last.font === run.font &&
      last.color === run.color &&
      Math.abs(last.size - run.size) < 0.5
    ) {
      last.text += run.text
    } else {
      runs.push(run)
    }
    prevRight = p.right
  }
  return runs
}

interface OpenBlock {
  x: number
  right: number
  firstY: number
  lastY: number
  size: number
  pitch: number | null
  lines: LayoutRun[][]
  rights: number[]
}

/**
 * Stacks segments into blocks: a segment continues the block above it when it
 * starts at the same left edge, has the same size, and sits one regular line
 * below. Everything else starts a block of its own.
 */
function toBlocks(segs: Segment[], pageWidth: number, measure: (runs: LayoutRun[]) => number): LayoutBlock[] {
  const done: OpenBlock[] = []
  let open: OpenBlock[] = []
  // Top to bottom, then left to right.
  const sorted = [...segs].sort((a, b) => a.y - b.y || a.x - b.x)
  for (const s of sorted) {
    open = open.filter((b) => {
      const keep = s.y - b.lastY <= b.size * 2
      if (!keep) done.push(b)
      return keep
    })
    const gapOk = (b: OpenBlock) => {
      const gap = s.y - b.lastY
      if (gap < s.size * 0.95 || gap > s.size * 1.75) return false
      return b.pitch === null || Math.abs(gap - b.pitch) <= Math.max(0.75, s.size * 0.06)
    }
    const block = open.find((b) => Math.abs(b.x - s.x) <= 1.5 && Math.abs(b.size - s.size) < 0.6 && gapOk(b))
    if (block) {
      const gap = s.y - block.lastY
      block.pitch = block.pitch === null ? gap : (block.pitch * (block.lines.length - 1) + gap) / block.lines.length
      block.lastY = s.y
      block.right = Math.max(block.right, s.right)
      block.lines.push(runsOf(s))
      block.rights.push(s.right)
    } else {
      open.push({
        x: s.x,
        right: s.right,
        firstY: s.y,
        lastY: s.y,
        size: s.size,
        pitch: null,
        lines: [runsOf(s)],
        rights: [s.right],
      })
    }
  }
  done.push(...open)

  return done.map((b) => {
    const pitch = b.pitch ?? b.size * 1.2
    const textWidth = b.right - b.x
    // Justified text: a line that ends at the block's right edge although its
    // words, set naturally in this browser, would end well short of it — the
    // PDF stretched its spaces. Such lines are stretched to the block width in
    // Word too, but only when every line of the block fits in that width, so a
    // wider substitute font cannot push a word onto an extra line.
    const natural = b.lines.map(measure)
    const stretched = b.rights.map((r, i) => b.right - r < 1.5 && natural[i] < 0.985 * (r - b.x))
    const justified = stretched.some(Boolean) && natural.every((w) => w <= textWidth + 1)
    // Otherwise leave room for a substitute font that runs wider than the
    // PDF's; every line ends in its own break, so extra width never rewraps.
    // A point and a half of slack absorbs rounding in Word's own text measuring.
    const width = justified ? textWidth + 1.5 : Math.max(8, Math.min(pageWidth - b.x, textWidth * 1.15 + b.size * 2))
    return {
      x: b.x,
      // Word puts an exact-height line's baseline about one descent above its bottom.
      top: b.firstY - (pitch - b.size * 0.22),
      width,
      pitch,
      lines: b.lines,
      justify: justified ? stretched : stretched.map(() => false),
    }
  })
}

/** Width in points of runs as this browser draws them in their fonts (or its stand-in). */
function textMeasurer() {
  const ctx = document.createElement('canvas').getContext('2d')!
  return (runs: LayoutRun[]) =>
    runs.reduce((w, r) => {
      ctx.font = `${r.italic ? 'italic ' : ''}${r.bold ? 'bold ' : ''}${r.size}px ${r.font ? `"${r.font}", ` : ''}serif`
      return w + ctx.measureText(r.text).width
    }, 0)
}

export async function convertPdfLayout(
  file: File,
  onProgress: (done: number, total: number) => void,
): Promise<LayoutConversion> {
  const { task, pdf } = await loadPdf(file)
  const measure = textMeasurer()
  const pages: LayoutPage[] = []
  let chars = 0
  let blocks = 0
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const text = await readPageText(page)
      const { glyphs, background } = await renderWithoutText(page)
      const match = glyphMatcher(glyphs)
      const segs = text.lines.flatMap((l) => segments(match(l.pieces)))
      const pageBlocks = toBlocks(segs, text.width, measure)
      chars += text.lines.reduce((m, l) => m + l.pieces.reduce((k, x) => k + x.text.trim().length, 0), 0)
      blocks += pageBlocks.length
      pages.push({
        width: text.width,
        height: text.height,
        background,
        blocks: pageBlocks,
      })
      page.cleanup()
      onProgress(n, pdf.numPages)
    }
  } finally {
    void task.destroy()
  }
  if (chars < 20) throw new ScannedPdfError()
  return { pages, blocks }
}

export async function buildLayoutDocx({ pages }: LayoutConversion) {
  const {
    AlignmentType,
    Document,
    FrameAnchorType,
    FrameWrap,
    HeightRule,
    HorizontalPositionRelativeFrom,
    ImageRun,
    LineRuleType,
    Packer,
    Paragraph,
    TextRun,
    VerticalPositionRelativeFrom,
  } = await import('docx')
  const twips = (pt: number) => Math.round(pt * 20)
  const px96 = (pt: number) => Math.round((pt * 96) / 72)

  const sections = pages.map((page) => {
    // One paragraph per PDF line; consecutive paragraphs with the same frame
    // settings share one frame in Word, so a block stays a single box.
    const frames = page.blocks.flatMap((b) => {
      const frame = {
        type: 'absolute' as const,
        position: { x: twips(b.x), y: twips(b.top) },
        width: twips(b.width),
        height: twips(b.pitch * b.lines.length),
        rule: HeightRule.ATLEAST,
        anchor: { horizontal: FrameAnchorType.PAGE, vertical: FrameAnchorType.PAGE },
        wrap: FrameWrap.NONE,
      }
      return b.lines.map(
        (runs, i) =>
          new Paragraph({
            frame,
            alignment: b.justify[i] ? AlignmentType.DISTRIBUTE : AlignmentType.LEFT,
            spacing: { before: 0, after: 0, line: twips(b.pitch), lineRule: LineRuleType.EXACT },
            children: runs.map(
              (r) =>
                new TextRun({
                  text: r.text,
                  bold: r.bold,
                  italics: r.italic,
                  size: Math.max(2, Math.round(r.size * 2)), // half-points
                  font: r.font || undefined,
                  color: r.color === '000000' ? undefined : r.color,
                }),
            ),
          }),
      )
    })

    // One tiny body paragraph holds the page picture, anchored behind the text.
    const anchor = new Paragraph({
      spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT },
      children: page.background
        ? [
            new ImageRun({
              type: 'jpg',
              data: page.background.data,
              transformation: {
                width: px96(page.width),
                height: px96(page.height),
              },
              floating: {
                horizontalPosition: {
                  relative: HorizontalPositionRelativeFrom.PAGE,
                  offset: 0,
                },
                verticalPosition: {
                  relative: VerticalPositionRelativeFrom.PAGE,
                  offset: 0,
                },
                behindDocument: true,
                allowOverlap: true,
                lockAnchor: true,
              },
            }),
          ]
        : [],
    })

    return {
      properties: {
        page: {
          size: { width: twips(page.width), height: twips(page.height) },
          // The body only carries anchors; small margins keep them on the page.
          margin: {
            top: 0,
            bottom: 0,
            left: twips(18),
            right: twips(18),
            header: 0,
            footer: 0,
          },
        },
      },
      // The plain paragraph comes last: it carries the section break, which
      // Word expects in a normal paragraph rather than a framed one.
      children: [...frames, anchor],
    }
  })

  return Packer.toBlob(new Document({ sections }))
}
