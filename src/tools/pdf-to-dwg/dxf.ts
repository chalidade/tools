// Writes vector pages as an ASCII DXF (AutoCAD R12 / AC1009): the plainest
// flavour of the format, which AutoCAD, BricsCAD, LibreCAD, DraftSight and
// QCAD all open, and which AutoCAD can save as .dwg in one step. R12 needs no
// object handles, so the file stays small and valid by construction.

import type { RGB, VectorPage } from './extract'

export interface DxfOptions {
  /** Drawing units per PDF point (e.g. 25.4/72 for millimetres at 1:1). */
  unit: number
  /** Include filled areas (as outlines on their own layer). */
  fills: boolean
  /** Gap between pages laid side by side, in drawing units. */
  gap: number
}

/** The 9 basic ACI colours plus greys, enough to find a close match. */
const ACI_BASE: [number, RGB][] = [
  [1, [255, 0, 0]],
  [2, [255, 255, 0]],
  [3, [0, 255, 0]],
  [4, [0, 255, 255]],
  [5, [0, 0, 255]],
  [6, [255, 0, 255]],
  [8, [128, 128, 128]],
  [9, [192, 192, 192]],
  [30, [255, 127, 0]],
  [250, [51, 51, 51]],
  [251, [91, 91, 91]],
  [252, [132, 132, 132]],
  [253, [173, 173, 173]],
  [254, [214, 214, 214]],
]

/** Nearest AutoCAD colour index; black and near-black become 7 (black on paper, white on a dark screen). */
export function aciOf([r, g, b]: RGB): number {
  if (r < 40 && g < 40 && b < 40) return 7
  if (r > 245 && g > 245 && b > 245) return 7
  let best = 7
  let dist = Infinity
  for (const [i, [cr, cg, cb]] of ACI_BASE) {
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
    if (d < dist) {
      dist = d
      best = i
    }
  }
  return best
}

/** Text in an R12 DXF is Windows-1252; anything else goes in as \U+XXXX, which AutoCAD understands. */
function dxfText(s: string) {
  let out = ''
  for (const ch of s.replace(/[\r\n]+/g, ' ')) {
    const code = ch.codePointAt(0)!
    if (code < 32) continue
    out += code < 128 ? ch : `\\U+${code.toString(16).toUpperCase().padStart(4, '0')}`
  }
  return out.replace(/%%/g, '%%%')
}

const num = (v: number) => (Number.isFinite(v) ? +v.toFixed(6) : 0).toString()

export interface DxfResult {
  text: string
  counts: { lines: number; circles: number; texts: number; fills: number }
}

export function writeDxf(pages: VectorPage[], opts: DxfOptions): DxfResult {
  const k = opts.unit
  const body: string[] = []
  const layers = new Map<string, number>()
  const counts = { lines: 0, circles: 0, texts: 0, fills: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const g = (code: number, value: string | number) => body.push(String(code), typeof value === 'number' ? num(value) : value)
  /** Layer by kind (lines, fills, text, sheet); the PDF's colour goes on the entity itself. */
  const put = (type: string, kind: string, color: RGB) => {
    if (!layers.has(kind)) layers.set(kind, kind === 'PDF_ISIAN' || kind === 'PDF_HALAMAN' ? 8 : 7)
    g(0, type)
    g(8, kind)
    const aci = aciOf(color)
    if (aci !== 7) g(62, aci)
  }
  const grow = (x: number, y: number) => {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  let offset = 0
  for (const page of pages) {
    const X = (x: number) => offset + x * k
    const Y = (y: number) => y * k
    // A thin frame for the sheet edge, so pages stay apart and the scale can be checked.
    const sheet = 'PDF_HALAMAN'
    put('POLYLINE', sheet, [0, 0, 0])
    g(66, 1)
    g(10, 0)
    g(20, 0)
    g(30, 0)
    g(70, 1)
    for (const [x, y] of [
      [0, 0],
      [page.width, 0],
      [page.width, page.height],
      [0, page.height],
    ]) {
      g(0, 'VERTEX')
      g(8, sheet)
      g(10, X(x))
      g(20, Y(y))
      g(30, 0)
      grow(X(x), Y(y))
    }
    g(0, 'SEQEND')
    g(8, sheet)

    for (const p of page.paths) {
      if (p.fill && !opts.fills) continue
      const layer = p.fill ? 'PDF_ISIAN' : 'PDF_GARIS'
      const n = p.pts.length / 2
      if (n === 2 && !p.closed) {
        put('LINE', layer, p.color)
        g(10, X(p.pts[0]))
        g(20, Y(p.pts[1]))
        g(30, 0)
        g(11, X(p.pts[2]))
        g(21, Y(p.pts[3]))
        g(31, 0)
      } else {
        put('POLYLINE', layer, p.color)
        g(66, 1)
        g(10, 0)
        g(20, 0)
        g(30, 0)
        g(70, p.closed ? 1 : 0)
        for (let i = 0; i < p.pts.length; i += 2) {
          g(0, 'VERTEX')
          g(8, layer)
          g(10, X(p.pts[i]))
          g(20, Y(p.pts[i + 1]))
          g(30, 0)
        }
        g(0, 'SEQEND')
        g(8, layer)
      }
      for (let i = 0; i < p.pts.length; i += 2) grow(X(p.pts[i]), Y(p.pts[i + 1]))
      if (p.fill) counts.fills++
      else counts.lines++
    }

    for (const c of page.circles) {
      if (c.fill && !opts.fills) continue
      put('CIRCLE', c.fill ? 'PDF_ISIAN' : 'PDF_GARIS', c.color)
      g(10, X(c.x))
      g(20, Y(c.y))
      g(30, 0)
      g(40, c.r * k)
      grow(X(c.x - c.r), Y(c.y - c.r))
      grow(X(c.x + c.r), Y(c.y + c.r))
      counts.circles++
    }

    for (const t of page.texts) {
      // CAD text height is the capital height, about 70% of the font size.
      const h = t.size * 0.7 * k
      if (!(h > 0)) continue
      put('TEXT', 'PDF_TEKS', t.color)
      g(10, X(t.x))
      g(20, Y(t.y))
      g(30, 0)
      g(40, h)
      g(1, dxfText(t.text))
      const deg = (t.angle * 180) / Math.PI
      if (Math.abs(deg) > 0.01) g(50, deg)
      grow(X(t.x), Y(t.y))
      counts.texts++
    }
    offset += page.width * k + opts.gap
  }

  if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0
  const head: string[] = []
  const h = (code: number, value: string | number) => head.push(String(code), typeof value === 'number' ? num(value) : value)
  h(0, 'SECTION')
  h(2, 'HEADER')
  h(9, '$ACADVER')
  h(1, 'AC1009')
  h(9, '$DWGCODEPAGE')
  h(3, 'ANSI_1252')
  h(9, '$INSBASE')
  h(10, 0)
  h(20, 0)
  h(30, 0)
  h(9, '$EXTMIN')
  h(10, minX)
  h(20, minY)
  h(30, 0)
  h(9, '$EXTMAX')
  h(10, maxX)
  h(20, maxY)
  h(30, 0)
  h(9, '$LIMMIN')
  h(10, minX)
  h(20, minY)
  h(9, '$LIMMAX')
  h(10, maxX)
  h(20, maxY)
  h(0, 'ENDSEC')
  h(0, 'SECTION')
  h(2, 'TABLES')
  h(0, 'TABLE')
  h(2, 'LTYPE')
  h(70, 1)
  h(0, 'LTYPE')
  h(2, 'CONTINUOUS')
  h(70, 0)
  h(3, 'Solid line')
  h(72, 65)
  h(73, 0)
  h(40, 0)
  h(0, 'ENDTAB')
  h(0, 'TABLE')
  h(2, 'LAYER')
  h(70, layers.size + 1)
  for (const [name, color] of [['0', 7] as [string, number], ...layers]) {
    h(0, 'LAYER')
    h(2, name)
    h(70, 0)
    h(62, color)
    h(6, 'CONTINUOUS')
  }
  h(0, 'ENDTAB')
  h(0, 'TABLE')
  h(2, 'STYLE')
  h(70, 1)
  h(0, 'STYLE')
  h(2, 'STANDARD')
  h(70, 0)
  h(40, 0)
  h(41, 1)
  h(50, 0)
  h(71, 0)
  h(42, 2.5)
  h(3, 'txt')
  h(4, '')
  h(0, 'ENDTAB')
  h(0, 'ENDSEC')
  h(0, 'SECTION')
  h(2, 'ENTITIES')
  const tail = ['0', 'ENDSEC', '0', 'EOF']
  return { text: [...head, ...body, ...tail].join('\r\n') + '\r\n', counts }
}
