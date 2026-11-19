// Pulls the vector content out of PDF pages with pdf.js: every stroked or
// filled path (Bézier curves flattened, full circles kept as circles) and
// every text run, in PDF points with y pointing up — the same orientation as
// a CAD drawing. Raster images are not vectors and are left out.

import type { PDFPageProxy } from 'pdfjs-dist'
import { importPdfjs, loadPdf } from '@/lib/pdf-text'

export type RGB = [number, number, number]

export interface VPath {
  /** Flat x,y pairs. */
  pts: number[]
  closed: boolean
  color: RGB
  /** Line width in points (0 for a fill outline). */
  width: number
  fill: boolean
}

export interface VCircle {
  x: number
  y: number
  r: number
  color: RGB
  fill: boolean
}

export interface VText {
  x: number
  y: number
  /** Font size in points. */
  size: number
  /** Radians, counter-clockwise. */
  angle: number
  text: string
  color: RGB
}

export interface VectorPage {
  width: number
  height: number
  paths: VPath[]
  circles: VCircle[]
  texts: VText[]
  /** Pictures on the page that cannot become lines. */
  images: number
}

type M = [number, number, number, number, number, number]
const mul = (p: M, q: M): M => [
  p[0] * q[0] + p[2] * q[1],
  p[1] * q[0] + p[3] * q[1],
  p[0] * q[2] + p[2] * q[3],
  p[1] * q[2] + p[3] * q[3],
  p[0] * q[4] + p[2] * q[5] + p[4],
  p[1] * q[4] + p[3] * q[5] + p[5],
]

/** "#rrggbb" (what pdf.js hands over for every colour space) → RGB. */
function parseColor(c: unknown): RGB {
  if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
  return [0, 0, 0]
}

interface State {
  m: M
  stroke: RGB
  fill: RGB
  width: number
}

/** A subpath under construction: flat points plus the raw segments, for circle detection. */
interface Sub {
  pts: number[]
  curves: number
  lines: number
  closed: boolean
}

/** Four Bézier quarters around a centre with equal radii: how PDFs draw circles. */
function asCircle(s: Sub): { x: number; y: number; r: number } | null {
  if (s.curves !== 4 || s.lines > 1) return null
  const p = s.pts
  let cx = 0
  let cy = 0
  const n = p.length / 2
  for (let i = 0; i < p.length; i += 2) {
    cx += p[i]
    cy += p[i + 1]
  }
  cx /= n
  cy /= n
  let min = Infinity
  let max = 0
  for (let i = 0; i < p.length; i += 2) {
    const d = Math.hypot(p[i] - cx, p[i + 1] - cy)
    min = Math.min(min, d)
    max = Math.max(max, d)
  }
  return max > 0 && (max - min) / max < 0.01 ? { x: cx, y: cy, r: (min + max) / 2 } : null
}

const FILL_OPS = new Set<number>()
const STROKE_OPS = new Set<number>()

export async function readVectorPage(page: PDFPageProxy): Promise<VectorPage> {
  const pdfjs = await importPdfjs()
  const OPS = pdfjs.OPS
  if (!FILL_OPS.size) {
    for (const k of ['fill', 'eoFill', 'fillStroke', 'eoFillStroke', 'closeFillStroke', 'closeEOFillStroke'] as const) FILL_OPS.add(OPS[k])
    for (const k of ['stroke', 'closeStroke', 'fillStroke', 'eoFillStroke', 'closeFillStroke', 'closeEOFillStroke'] as const) STROKE_OPS.add(OPS[k])
  }
  const view = page.view // [x0, y0, x1, y1] of the media box
  const out: VectorPage = { width: view[2] - view[0], height: view[3] - view[1], paths: [], circles: [], texts: [], images: 0 }
  // Shift so the page's lower-left corner is the origin.
  const base: M = [1, 0, 0, 1, -view[0], -view[1]]
  const list = await page.getOperatorList({ intent: 'print' })
  let st: State = { m: base, stroke: [0, 0, 0], fill: [0, 0, 0], width: 1 }
  const stack: State[] = []

  for (let i = 0; i < list.fnArray.length; i++) {
    const fn = list.fnArray[i]
    const args = list.argsArray[i] as unknown[]
    switch (fn) {
      case OPS.save:
      case OPS.paintFormXObjectBegin:
        stack.push(st)
        st = { ...st }
        if (fn === OPS.paintFormXObjectBegin && Array.isArray(args?.[0])) st.m = mul(st.m, args[0] as M)
        break
      case OPS.restore:
      case OPS.paintFormXObjectEnd:
        st = stack.pop() ?? st
        break
      case OPS.transform:
        st.m = mul(st.m, args as M)
        break
      case OPS.setLineWidth:
        st.width = Number(args[0]) || 0
        break
      case OPS.setStrokeRGBColor:
        st.stroke = parseColor(args[0])
        break
      case OPS.setFillRGBColor:
        st.fill = parseColor(args[0])
        break
      case OPS.paintImageXObject:
      case OPS.paintInlineImageXObject:
      case OPS.paintImageXObjectRepeat:
        out.images++
        break
      case OPS.constructPath: {
        const op = args[0] as number
        const fill = FILL_OPS.has(op)
        const stroke = STROKE_OPS.has(op)
        if (!fill && !stroke) break // clipping path or endPath
        const data = (args[1] as ArrayLike<number>[] | undefined)?.[0]
        if (!data) break
        const m = st.m
        const scaleM = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]))
        const subs: Sub[] = []
        let cur: Sub | null = null
        let lx = 0
        let ly = 0
        let sx = 0
        let sy = 0
        const T = (x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
        for (let k = 0; k < data.length; ) {
          const code = data[k++]
          if (code === 0) {
            lx = sx = data[k++]
            ly = sy = data[k++]
            cur = { pts: [...T(lx, ly)], curves: 0, lines: 0, closed: false }
            subs.push(cur)
          } else if (code === 1) {
            const x = data[k++]
            const y = data[k++]
            if (!cur) subs.push((cur = { pts: [...T(lx, ly)], curves: 0, lines: 0, closed: false }))
            cur.pts.push(...T(x, y))
            cur.lines++
            lx = x
            ly = y
          } else if (code === 2 || code === 3) {
            const cubic = code === 2
            const c = cubic ? [data[k++], data[k++], data[k++], data[k++]] : [data[k++], data[k++]]
            const x = data[k++]
            const y = data[k++]
            if (!cur) subs.push((cur = { pts: [...T(lx, ly)], curves: 0, lines: 0, closed: false }))
            // Flatten: enough steps that the chord error stays tiny on paper.
            const len = Math.hypot(x - lx, y - ly) * scaleM
            const steps = Math.min(32, Math.max(4, Math.ceil(len / 6)))
            for (let s = 1; s <= steps; s++) {
              const t = s / steps
              const u = 1 - t
              let px: number
              let py: number
              if (cubic) {
                px = u * u * u * lx + 3 * u * u * t * c[0] + 3 * u * t * t * c[2] + t * t * t * x
                py = u * u * u * ly + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t * t * t * y
              } else {
                px = u * u * lx + 2 * u * t * c[0] + t * t * x
                py = u * u * ly + 2 * u * t * c[1] + t * t * y
              }
              cur.pts.push(...T(px, py))
            }
            cur.curves++
            lx = x
            ly = y
          } else if (code === 4) {
            if (cur) cur.closed = true
            lx = sx
            ly = sy
            cur = null
          } else break
        }
        for (const s of subs) {
          if (s.pts.length < 4) continue
          // A closing segment back to the start counts as closed.
          const n = s.pts.length
          if (!s.closed && n >= 6 && Math.abs(s.pts[0] - s.pts[n - 2]) < 1e-6 && Math.abs(s.pts[1] - s.pts[n - 1]) < 1e-6) {
            s.closed = true
            s.pts.length = n - 2
          } else if (s.closed && Math.abs(s.pts[0] - s.pts[n - 2]) < 1e-6 && Math.abs(s.pts[1] - s.pts[n - 1]) < 1e-6) s.pts.length = n - 2
          const circle = asCircle(s)
          if (circle) {
            out.circles.push({ ...circle, color: stroke ? st.stroke : st.fill, fill: !stroke })
            continue
          }
          if (stroke) out.paths.push({ pts: s.pts, closed: s.closed || op === OPS.closeStroke, color: st.stroke, width: st.width * scaleM, fill: false })
          else out.paths.push({ pts: s.pts, closed: true, color: st.fill, width: 0, fill: true })
        }
        break
      }
    }
  }

  // Text comes from the text layer: positions in the same unrotated page space.
  const content = await page.getTextContent()
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue
    const [a, b, c, d, e, f] = item.transform as M
    const size = Math.hypot(c, d)
    if (!(size > 0)) continue
    out.texts.push({ x: e - view[0], y: f - view[1], size, angle: Math.atan2(b, a), text: item.str, color: [0, 0, 0] })
  }
  return out
}

export async function readVectorPages(file: File, pages: number[], onProgress: (done: number, total: number) => void) {
  const { task, pdf } = await loadPdf(file)
  const result: VectorPage[] = []
  try {
    for (const [i, n] of pages.entries()) {
      const page = await pdf.getPage(n)
      result.push(await readVectorPage(page))
      page.cleanup()
      onProgress(i + 1, pages.length)
    }
  } finally {
    void task.destroy()
  }
  return result
}
