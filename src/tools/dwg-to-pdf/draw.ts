// Puts a Drawing (cad.ts) on paper: works out the page and scale, draws a
// preview on a canvas, and writes a vector PDF with jsPDF — lines stay lines
// and text stays text, so the PDF is sharp at any zoom and searchable.

import type { Box, Drawing, RGB, Shape } from './cad'

export type Paper = 'A4' | 'A3' | 'A2' | 'A1' | 'A0'
export type Orientation = 'auto' | 'portrait' | 'landscape'
export type ColorMode = 'color' | 'mono'

/** Portrait sizes in millimetres. */
export const PAPERS: Record<Paper, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
  A0: [841, 1189],
}

export interface PageOptions {
  paper: Paper
  orientation: Orientation
  /** 0 = fit to the page; N = 1:N, using the drawing's units. */
  scale: number
  /** Millimetres per drawing unit, used with `scale` (1 when the file does not say). */
  unitMm: number
  mode: ColorMode
}

export interface Layout {
  width: number
  height: number
  /** Millimetres on paper per drawing unit. */
  k: number
  /** Page position (mm, from the top-left) of the drawing's (minX, maxY) corner. */
  ox: number
  oy: number
  bounds: Box
  /** The drawing is larger than the page at the chosen scale. */
  overflow: boolean
}

const MARGIN = 10

export function layoutPage(drawing: Drawing, opts: PageOptions): Layout {
  const b = drawing.bounds
  const dw = Math.max(b.maxX - b.minX, 1e-9)
  const dh = Math.max(b.maxY - b.minY, 1e-9)
  const [pw, ph] = PAPERS[opts.paper]
  const landscape = opts.orientation === 'landscape' || (opts.orientation === 'auto' && dw > dh)
  const width = landscape ? ph : pw
  const height = landscape ? pw : ph
  const fit = Math.min((width - 2 * MARGIN) / dw, (height - 2 * MARGIN) / dh)
  const k = opts.scale > 0 ? (opts.unitMm || 1) / opts.scale : fit
  return {
    width,
    height,
    k,
    ox: (width - dw * k) / 2,
    oy: (height - dh * k) / 2,
    bounds: b,
    overflow: opts.scale > 0 && k > fit * 1.0001,
  }
}

/** Light colours vanish on white paper; anything paler than this prints black in colour mode too. */
const tooLight = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b > 235

const ink = (c: RGB, mode: ColorMode): RGB => (mode === 'mono' || tooLight(c) ? [0, 0, 0] : c)

/** Paper line width (mm) of a stroke; hairlines are kept printable. */
const lineMm = (s: Shape & { kind: 'stroke' }, k: number) => Math.max(s.weight < 0 ? -s.weight * k : s.weight, 0.1)

/** jsPDF's built-in fonts only know Windows-1252; anything else would print as junk. */
const WIN_ANSI = /[^ -~ -ÿ€‘’“”–—•…]/g
export const pdfSafe = (s: string) => s.replace(/ /g, ' ').replace(WIN_ANSI, '?')

/** Draws the page (white sheet included) onto a canvas `pxPerMm` pixels per millimetre. */
export function drawCanvas(canvas: HTMLCanvasElement, drawing: Drawing, page: Layout, mode: ColorMode, pxPerMm: number) {
  canvas.width = Math.round(page.width * pxPerMm)
  canvas.height = Math.round(page.height * pxPerMm)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const { k, ox, oy, bounds } = page
  const X = (x: number) => (ox + (x - bounds.minX) * k) * pxPerMm
  const Y = (y: number) => (oy + (bounds.maxY - y) * k) * pxPerMm
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`
  for (const s of drawing.shapes) {
    if (s.kind === 'fill') {
      ctx.beginPath()
      for (const r of s.rings) {
        ctx.moveTo(X(r[0]), Y(r[1]))
        for (let i = 2; i < r.length; i += 2) ctx.lineTo(X(r[i]), Y(r[i + 1]))
        ctx.closePath()
      }
      ctx.fillStyle = css(ink(s.color, mode))
      ctx.fill('evenodd')
    } else if (s.kind === 'stroke') {
      ctx.beginPath()
      ctx.moveTo(X(s.pts[0]), Y(s.pts[1]))
      for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(X(s.pts[i]), Y(s.pts[i + 1]))
      if (s.closed) ctx.closePath()
      ctx.setLineDash(s.dash ? s.dash.map((d) => d * k * pxPerMm) : [])
      ctx.strokeStyle = css(ink(s.color, mode))
      ctx.lineWidth = Math.max(lineMm(s, k) * pxPerMm, 0.6)
      ctx.stroke()
    } else {
      const size = (s.height / 0.72) * k * pxPerMm
      if (size < 0.5) continue
      ctx.save()
      ctx.translate(X(s.x), Y(s.y))
      ctx.rotate(-s.angle)
      ctx.font = `${size}px Helvetica, Arial, sans-serif`
      ctx.fillStyle = css(ink(s.color, mode))
      ctx.fillText(s.text, 0, 0)
      ctx.restore()
    }
  }
}

/** Writes the page as a one-page vector PDF. */
export async function writePdf(drawing: Drawing, page: Layout, mode: ColorMode, title: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: [page.width, page.height], orientation: page.width > page.height ? 'l' : 'p', compress: true })
  doc.setProperties({ title, creator: 'toowl.my.id' })
  doc.setFont('helvetica', 'normal')
  doc.setLineCap('round')
  doc.setLineJoin('round')
  const { k, ox, oy, bounds } = page
  const X = (x: number) => ox + (x - bounds.minX) * k
  const Y = (y: number) => oy + (bounds.maxY - y) * k
  // Only change graphics state when it differs; big drawings have tens of thousands of lines.
  let stroke = ''
  let fill = ''
  let width = -1
  let dash = ''
  const setStroke = (c: RGB) => {
    const key = c.join()
    if (key !== stroke) doc.setDrawColor(c[0], c[1], c[2])
    stroke = key
  }
  const setFill = (c: RGB) => {
    const key = c.join()
    if (key !== fill) {
      doc.setFillColor(c[0], c[1], c[2])
      doc.setTextColor(c[0], c[1], c[2])
    }
    fill = key
  }
  for (const s of drawing.shapes) {
    if (s.kind === 'fill') {
      setFill(ink(s.color, mode))
      for (const r of s.rings) {
        doc.moveTo(X(r[0]), Y(r[1]))
        for (let i = 2; i < r.length; i += 2) doc.lineTo(X(r[i]), Y(r[i + 1]))
        doc.close()
      }
      doc.fillEvenOdd()
    } else if (s.kind === 'stroke') {
      setStroke(ink(s.color, mode))
      const w = lineMm(s, k)
      if (w !== width) doc.setLineWidth(w)
      width = w
      const d = s.dash ? s.dash.map((v) => +(v * k).toFixed(3)) : []
      const dk = d.join()
      if (dk !== dash) doc.setLineDashPattern(d, 0)
      dash = dk
      const x0 = X(s.pts[0])
      const y0 = Y(s.pts[1])
      doc.moveTo(x0, y0)
      if (s.pts.length === 4 && s.pts[0] === s.pts[2] && s.pts[1] === s.pts[3]) doc.lineTo(x0 + 0.001, y0) // a point
      else for (let i = 2; i < s.pts.length; i += 2) doc.lineTo(X(s.pts[i]), Y(s.pts[i + 1]))
      if (s.closed) doc.close()
      doc.stroke()
    } else {
      const sizePt = (s.height / 0.72) * k * (72 / 25.4)
      if (sizePt < 0.5) continue
      setFill(ink(s.color, mode))
      doc.setFontSize(sizePt)
      doc.text(pdfSafe(s.text), X(s.x), Y(s.y), { angle: (s.angle * 180) / Math.PI, baseline: 'alphabetic' })
    }
  }
  return doc.output('blob')
}

/** Width of text at font size 1 in Helvetica — the font the PDF uses. */
export async function helveticaMeasure() {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  doc.setFont('helvetica', 'normal')
  return (text: string) => doc.getStringUnitWidth(pdfSafe(text))
}
