// Turns a parsed DWG/DXF (LibreDWG's DwgDatabase) into a flat list of 2D
// shapes in drawing units: strokes, fills and text. Blocks (INSERT) and
// dimensions are expanded with their full transform, colours and line weights
// are resolved (ByLayer / ByBlock), and frozen or hidden layers are left out.
// Both the preview canvas and the PDF writer draw from this one list.

import type {
  DwgArcEntity,
  DwgAttribEntity,
  DwgBlockRecordTableEntry,
  DwgCircleEntity,
  DwgDatabase,
  DwgDimensionEntity,
  DwgEllipseEntity,
  DwgEntity,
  DwgHatchEntity,
  DwgInsertEntity,
  DwgLayerTableEntry,
  DwgLeaderEntity,
  DwgLineEntity,
  DwgLWPolylineEntity,
  DwgMTextEntity,
  DwgPoint2D,
  DwgPoint3D,
  DwgPointEntity,
  DwgPolyline2dEntity,
  DwgPolyline3dEntity,
  DwgSolidEntity,
  DwgSplineEntity,
  DwgTextBase,
  DwgTextEntity,
} from '@mlightcad/libredwg-web'

export type RGB = [number, number, number]

export interface Stroke {
  kind: 'stroke'
  /** Flat x,y pairs in drawing units. */
  pts: number[]
  closed: boolean
  color: RGB
  /** Line weight in millimetres on paper; negative = that many drawing units (wide polylines). */
  weight: number
  /** Dash pattern in drawing units (dash, gap, …), or none for a solid line. */
  dash?: number[]
}

export interface Fill {
  kind: 'fill'
  /** One or more closed rings, filled with the even-odd rule. */
  rings: number[][]
  color: RGB
}

export interface Label {
  kind: 'text'
  /** Left end of the baseline. */
  x: number
  y: number
  /** Cap height in drawing units. */
  height: number
  /** Direction of the baseline, radians counter-clockwise. */
  angle: number
  text: string
  color: RGB
}

export type Shape = Stroke | Fill | Label

export interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface Drawing {
  shapes: Shape[]
  bounds: Box
  /** Shapes far outside the rest of the drawing, left out of `bounds` (they would shrink everything else to a dot). */
  strays: number
  /** Entity types that were in the file but cannot be drawn (3D solids, images…). */
  skipped: string[]
  layers: string[]
  /** Drawing units from $INSUNITS, as millimetres per unit (0 = unknown). */
  unitMm: number
}

/** Width of `text` at font size 1, for laying out MTEXT and alignments. */
export type Measure = (text: string) => number

// ---------------------------------------------------------------- geometry

/** 2D affine matrix: x' = a·x + c·y + e, y' = b·x + d·y + f. */
type M = [number, number, number, number, number, number]
const IDENTITY: M = [1, 0, 0, 1, 0, 0]

const mul = (p: M, q: M): M => [
  p[0] * q[0] + p[2] * q[1],
  p[1] * q[0] + p[3] * q[1],
  p[0] * q[2] + p[2] * q[3],
  p[1] * q[2] + p[3] * q[3],
  p[0] * q[4] + p[2] * q[5] + p[4],
  p[1] * q[4] + p[3] * q[5] + p[5],
]
const translate = (x: number, y: number): M => [1, 0, 0, 1, x, y]
const rotate = (a: number): M => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]
const scale = (sx: number, sy: number): M => [sx, 0, 0, sy, 0, 0]
const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
/** How much the matrix stretches lengths, on average. */
const stretch = (m: M) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]))

/**
 * 2D entities (arcs, circles, polylines, text, blocks, hatches) store points
 * in their object coordinate system; one drawn from below (extrusion z < 0)
 * is mirrored in X. Other OCS normals are rare in 2D drawings and ignored.
 */
const ocs = (n?: DwgPoint3D): M => (n && n.z < -0.5 ? scale(-1, 1) : IDENTITY)

const TAU = Math.PI * 2

/** Points along an ellipse (or circle) between two parameter angles. */
function ellipsePts(cx: number, cy: number, rx: number, ry: number, rot: number, a0: number, a1: number, full = false) {
  let sweep = full ? TAU : a1 - a0
  while (!full && sweep <= 0) sweep += TAU
  const n = Math.max(8, Math.ceil((sweep / TAU) * 96))
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  const pts: number[] = []
  for (let i = 0; i <= (full ? n - 1 : n); i++) {
    const t = a0 + (sweep * i) / n
    const x = rx * Math.cos(t)
    const y = ry * Math.sin(t)
    pts.push(cx + x * cos - y * sin, cy + x * sin + y * cos)
  }
  return pts
}

function reversePairs(pts: number[]) {
  const out: number[] = []
  for (let i = pts.length - 2; i >= 0; i -= 2) out.push(pts[i], pts[i + 1])
  return out
}

/** Points of a polyline with bulges (arc segments). */
function bulgePts(vs: { x: number; y: number; bulge?: number }[], closed: boolean) {
  const pts: number[] = []
  const n = vs.length
  for (let i = 0; i < n; i++) {
    const a = vs[i]
    pts.push(a.x, a.y)
    if (!closed && i === n - 1) break
    const b = vs[(i + 1) % n]
    const bulge = a.bulge ?? 0
    if (Math.abs(bulge) < 1e-9) continue
    const theta = 4 * Math.atan(bulge) // included angle, signed
    const dx = b.x - a.x
    const dy = b.y - a.y
    const chord = Math.hypot(dx, dy)
    if (chord < 1e-12) continue
    const r = chord / (2 * Math.sin(Math.abs(theta) / 2))
    // Centre lies off the chord's midpoint, to the left for a positive bulge.
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const h = r * Math.cos(Math.abs(theta) / 2) * Math.sign(bulge)
    const cx = mx - (dy / chord) * h
    const cy = my + (dx / chord) * h
    const start = Math.atan2(a.y - cy, a.x - cx)
    const steps = Math.max(2, Math.ceil((Math.abs(theta) / TAU) * 96))
    for (let s = 1; s < steps; s++) {
      const t = start + (theta * s) / steps
      pts.push(cx + r * Math.cos(t), cy + r * Math.sin(t))
    }
  }
  return pts
}

/** De Boor evaluation of a (rational) B-spline, sampled evenly over its knot span. */
function bsplinePts(ctrl: DwgPoint3D[], degree: number, knots: number[], weights?: number[]) {
  const n = ctrl.length
  if (n < 2) return []
  if (knots.length !== n + degree + 1) {
    // Missing or odd knot vector: fall back to a clamped uniform one.
    knots = []
    for (let i = 0; i <= n + degree; i++) knots.push(Math.min(Math.max(i - degree, 0), n - degree))
  }
  const w = weights && weights.length === n ? weights : null
  const lo = knots[degree]
  const hi = knots[n]
  const samples = Math.min(400, Math.max(24, (n - degree) * 16))
  const pts: number[] = []
  for (let s = 0; s <= samples; s++) {
    const u = s === samples ? hi - 1e-9 * (hi - lo) : lo + ((hi - lo) * s) / samples
    let k = degree
    while (k < n - 1 && u >= knots[k + 1]) k++
    const d: [number, number, number][] = []
    for (let j = 0; j <= degree; j++) {
      const p = ctrl[k - degree + j]
      const wj = w ? w[k - degree + j] : 1
      d.push([p.x * wj, p.y * wj, wj])
    }
    for (let r = 1; r <= degree; r++) {
      for (let j = degree; j >= r; j--) {
        const i = k - degree + j
        const denom = knots[i + degree - r + 1] - knots[i]
        const alpha = denom === 0 ? 0 : (u - knots[i]) / denom
        for (let c = 0; c < 3; c++) d[j][c] = (1 - alpha) * d[j - 1][c] + alpha * d[j][c]
      }
    }
    const [x, y, ww] = d[degree]
    pts.push(x / ww, y / ww)
  }
  return pts
}

/** A smooth curve through fit points (Catmull–Rom), for splines saved without control points. */
function throughPts(ps: DwgPoint2D[]) {
  if (ps.length < 3) return ps.flatMap((p) => [p.x, p.y])
  const pts: number[] = []
  for (let i = 0; i < ps.length - 1; i++) {
    const p0 = ps[Math.max(0, i - 1)]
    const p1 = ps[i]
    const p2 = ps[i + 1]
    const p3 = ps[Math.min(ps.length - 1, i + 2)]
    for (let s = 0; s < 12; s++) {
      const t = s / 12
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      pts.push(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y))
    }
  }
  const last = ps[ps.length - 1]
  pts.push(last.x, last.y)
  return pts
}

// ---------------------------------------------------------------- colours

/** AutoCAD Color Index → RGB (index 0 and 256 are ByBlock/ByLayer, never looked up). */
const ACI = [
  0x000000, 0xff0000, 0xffff00, 0x00ff00, 0x00ffff, 0x0000ff, 0xff00ff, 0xffffff, 0x808080, 0xc0c0c0, 0xff0000, 0xff7f7f, 0xcc0000, 0xcc6666,
  0x990000, 0x994c4c, 0x7f0000, 0x7f3f3f, 0x4c0000, 0x4c2626, 0xff3f00, 0xff9f7f, 0xcc3300, 0xcc7f66, 0x992600, 0x994c4c, 0x7f1f00, 0x7f4f3f,
  0x4c1300, 0x4c2f26, 0xff7f00, 0xffbf7f, 0xcc6600, 0xcc9966, 0x994c00, 0x99724c, 0x7f3f00, 0x7f5f3f, 0x4c2600, 0x4c3926, 0xffbf00, 0xffdf7f,
  0xcc9900, 0xccb266, 0x997200, 0x99854c, 0x7f5f00, 0x7f6f3f, 0x4c3900, 0x4c4226, 0xffff00, 0xffff7f, 0xcccc00, 0xcccc66, 0x989800, 0x98984c,
  0x7f7f00, 0x7f7f3f, 0x4c4c00, 0x4c4c26, 0xbfff00, 0xdfff7f, 0x99cc00, 0xb2cc66, 0x729800, 0x85984c, 0x5f7f00, 0x6f7f3f, 0x394c00, 0x424c26,
  0x7fff00, 0xbfff7f, 0x66cc00, 0x99cc66, 0x4c9800, 0x72984c, 0x3f7f00, 0x5f7f3f, 0x264c00, 0x394c26, 0x3fff00, 0x9fff7f, 0x33cc00, 0x7fcc66,
  0x269800, 0x5f984c, 0x1f7f00, 0x4f7f3f, 0x134c00, 0x2f4c26, 0x00ff00, 0x7fff7f, 0x00cc00, 0x66cc66, 0x009800, 0x4c984c, 0x007f00, 0x3f7f3f,
  0x004c00, 0x264c26, 0x00ff3f, 0x7fff9f, 0x00cc33, 0x66cc7f, 0x009826, 0x4c985f, 0x007f1f, 0x3f7f4f, 0x004c13, 0x264c2f, 0x00ff7f, 0x7fffbf,
  0x00cc66, 0x66cc99, 0x00984c, 0x4c9872, 0x007f3f, 0x3f7f5f, 0x004c26, 0x264c39, 0x00ffbf, 0x7fffdf, 0x00cc99, 0x66ccb2, 0x009872, 0x4c9885,
  0x007f5f, 0x3f7f6f, 0x004c39, 0x264c42, 0x00ffff, 0x7fffff, 0x00cccc, 0x66cccc, 0x009898, 0x4c9898, 0x007f7f, 0x3f7f7f, 0x004c4c, 0x264c4c,
  0x00bfff, 0x7fdfff, 0x0099cc, 0x66b2cc, 0x007298, 0x4c8598, 0x005f7f, 0x3f6f7f, 0x00394c, 0x26424c, 0x007fff, 0x7fbfff, 0x0066cc, 0x6699cc,
  0x004c98, 0x4c7298, 0x003f7f, 0x3f5f7f, 0x00264c, 0x26394c, 0x003fff, 0x7f9fff, 0x0033cc, 0x667fcc, 0x002698, 0x4c5f98, 0x001f7f, 0x3f4f7f,
  0x00134c, 0x262f4c, 0x0000ff, 0x7f7fff, 0x0000cc, 0x6666cc, 0x000098, 0x4c4c98, 0x00007f, 0x3f3f7f, 0x00004c, 0x26264c, 0x3f00ff, 0x9f7fff,
  0x3300cc, 0x7f66cc, 0x260098, 0x5f4c98, 0x1f007f, 0x4f3f7f, 0x13004c, 0x2f264c, 0x7f00ff, 0xbf7fff, 0x6600cc, 0x9966cc, 0x4c0098, 0x724c98,
  0x3f007f, 0x5f3f7f, 0x26004c, 0x39264c, 0xbf00ff, 0xdf7fff, 0x9900cc, 0xb266cc, 0x720098, 0x854c98, 0x5f007f, 0x6f3f7f, 0x39004c, 0x42264c,
  0xff00ff, 0xff7fff, 0xcc00cc, 0xcc66cc, 0x980098, 0x984c98, 0x7f007f, 0x7f3f7f, 0x4c004c, 0x4c264c, 0xff00bf, 0xff7fdf, 0xcc0099, 0xcc66b2,
  0x980072, 0x984c85, 0x7f005f, 0x7f3f6f, 0x4c0039, 0x4c2642, 0xff007f, 0xff7fbf, 0xcc0066, 0xcc6699, 0x98004c, 0x984c72, 0x7f003f, 0x7f3f5f,
  0x4c0026, 0x4c2639, 0xff003f, 0xff7f9f, 0xcc0033, 0xcc667f, 0x980026, 0x984c5f, 0x7f001f, 0x7f3f4f, 0x4c0013, 0x4c262f, 0x333333, 0x5b5b5b,
  0x848484, 0xadadad, 0xd6d6d6, 0xffffff,
]

const rgb = (v: number): RGB => [(v >> 16) & 255, (v >> 8) & 255, v & 255]
/** ACI 7 ("white/black") follows the background: black on paper. */
const BLACK: RGB = [0, 0, 0]
const aciColor = (i: number): RGB => (i === 7 || i < 1 || i > 255 ? BLACK : rgb(ACI[i]))

/** Encoded DWG line weights (index → 1/100 mm); 29 ByLayer, 30 ByBlock, 31 Default. */
const LWEIGHTS = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211]
const DEFAULT_WEIGHT = 0.25

/** $INSUNITS → millimetres per drawing unit. */
const UNIT_MM: Record<number, number> = { 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000, 7: 1e6, 8: 0.0000254, 9: 0.0254, 10: 914.4, 14: 100, 15: 10000 }

// ---------------------------------------------------------------- text

/** AutoCAD %% codes and MTEXT formatting → plain text lines. */
function plainText(s: string) {
  return s
    .replace(/%%[dD]/g, '°')
    .replace(/%%[pP]/g, '±')
    .replace(/%%[cC]/g, 'Ø')
    .replace(/%%[uUoOkK]/g, '')
    .replace(/%%%/g, '%')
    .replace(/%%(\d{3})/g, (_, n) => String.fromCharCode(Number(n)))
}

function mtextLines(s: string) {
  return plainText(
    s
      .replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\S([^;]*?)[\^#/]([^;]*?);/g, '$1/$2') // stacked fractions
      .replace(/\\[Pp]/g, '\n')
      .replace(/\\~/g, ' ')
      .replace(/\\\\/g, '\uE001')
      .replace(/\\\{/g, '\uE002')
      .replace(/\\\}/g, '\uE003')
      .replace(/\\[FfCcHhWwTtQqAap][^;]*;/g, '')
      .replace(/\\[LlOoKkNX]/g, '')
      .replace(/[{}]/g, '')
      .replace(/\uE001/g, '\\')
      .replace(/\uE002/g, '{')
      .replace(/\uE003/g, '}'),
  ).split('\n')
}

// ---------------------------------------------------------------- reader

interface Ctx {
  m: M
  /** Colour and weight that ByBlock children take. */
  color: RGB
  weight: number
  /** Layer that children on layer "0" take. */
  layer: string
  depth: number
}

export interface BuildOptions {
  measure: Measure
  /** The file was a DXF (line weights are stored differently). */
  dxf?: boolean
  /** Layers to leave out (by name), in addition to frozen/off ones. */
  hidden?: Set<string>
}

/** Builds the model-space drawing. */
export function buildDrawing(db: DwgDatabase, opts: BuildOptions): Drawing {
  const shapes: Shape[] = []
  const skipped = new Set<string>()
  const layers = new Map<string, DwgLayerTableEntry>()
  for (const l of db.tables.LAYER?.entries ?? []) layers.set(l.name, l)
  const blocks = new Map<string, DwgBlockRecordTableEntry>()
  for (const b of db.tables.BLOCK_RECORD?.entries ?? []) blocks.set(b.name, b)
  const ltypes = new Map<string, number[]>()
  for (const lt of db.tables.LTYPE?.entries ?? []) {
    const dash = (lt.pattern ?? []).map((p) => p.elementLength)
    if (dash.length >= 2 && dash.some((d) => d < 0)) ltypes.set(lt.name.toUpperCase(), dash)
  }
  const ltscale = db.header?.LTSCALE && db.header.LTSCALE > 0 ? db.header.LTSCALE : 1
  const { measure } = opts
  const hidden = opts.hidden ?? new Set<string>()
  // Rays and construction lines are infinite: drawn last, clipped to the rest.
  const infinite: { x: number; y: number; dx: number; dy: number; both: boolean; color: RGB; weight: number }[] = []

  const layerOf = (e: DwgEntity, ctx: Ctx) => (e.layer === '0' && ctx.depth > 0 ? ctx.layer : e.layer || '0')
  const visible = (name: string) => {
    const l = layers.get(name)
    return !hidden.has(name) && !(l && (l.frozen || l.off || l.colorIndex < 0))
  }
  function colorOf(e: DwgEntity, ctx: Ctx): RGB {
    const ci = e.colorIndex ?? 256
    if (e.color != null && ci !== 0 && ci !== 256) return rgb(e.color)
    if (ci === 0) return ctx.color
    if (ci === 256) {
      const l = layers.get(layerOf(e, ctx))
      if (!l) return BLACK
      // libredwg reports a layer's true colour in `color`, but fills it with white for plain ACI layers.
      return aciColor(Math.abs(l.colorIndex))
    }
    return aciColor(ci)
  }
  // DWG stores line weights as an index (29 ByLayer, 30 ByBlock, 31 Default);
  // a DXF read keeps the DXF value in 1/100 mm (-1/-2/-3, or 255/254/253 as a byte).
  const BYLAYER = opts.dxf ? [-1, 255] : [29]
  const BYBLOCK = opts.dxf ? [-2, 254] : [30]
  const weightMm = (w: number) =>
    opts.dxf ? (w > 0 && w <= 211 ? w / 100 : DEFAULT_WEIGHT) : w >= 0 && w < LWEIGHTS.length ? LWEIGHTS[w] / 100 : DEFAULT_WEIGHT
  function weightOf(e: DwgEntity, ctx: Ctx): number {
    const w = e.lineweight ?? BYLAYER[0]
    if (BYBLOCK.includes(w)) return ctx.weight
    if (BYLAYER.includes(w)) return weightMm(layers.get(layerOf(e, ctx))?.lineweight ?? -3)
    return weightMm(w)
  }
  function dashOf(e: DwgEntity, ctx: Ctx): number[] | undefined {
    let name = (e.lineType || 'BYLAYER').toUpperCase()
    if (name === 'BYLAYER') name = (layers.get(layerOf(e, ctx))?.lineType || '').toUpperCase()
    const dash = ltypes.get(name)
    if (!dash) return undefined
    const s = ltscale * (e.lineTypeScale || 1) * stretch(ctx.m)
    // Dots (0) become short dashes so they still print.
    const out = dash.map((d) => Math.max(Math.abs(d) * s, Math.abs(d) === 0 ? 0.3 * s : 0))
    return out.every((d) => d > 0) ? out : undefined
  }

  const tx = (m: M, flat: number[]) => {
    const out: number[] = Array.from({ length: flat.length })
    for (let i = 0; i < flat.length; i += 2) {
      const [x, y] = apply(m, flat[i], flat[i + 1])
      out[i] = x
      out[i + 1] = y
    }
    return out
  }
  const stroke = (e: DwgEntity, ctx: Ctx, m: M, pts: number[], closed = false) => {
    if (pts.length < 4 || pts.some((v) => !Number.isFinite(v))) return
    shapes.push({ kind: 'stroke', pts: tx(m, pts), closed, color: colorOf(e, ctx), weight: weightOf(e, ctx), dash: dashOf(e, ctx) })
  }
  const fill = (e: DwgEntity, ctx: Ctx, m: M, rings: number[][]) => {
    const ok = rings.filter((r) => r.length >= 6 && r.every(Number.isFinite))
    if (ok.length) shapes.push({ kind: 'fill', rings: ok.map((r) => tx(m, r)), color: colorOf(e, ctx) })
  }
  /** Places a single line of text, `ax`/`ay` = 0..1 of its width / cap height from the anchor. */
  const text = (e: DwgEntity, ctx: Ctx, m: M, str: string, x: number, y: number, h: number, angle: number, ax: number, ay: number, widthFactor = 1) => {
    if (!str.trim() || !(h > 0)) return
    const w = measure(str) * h * (1 / 0.72) * widthFactor
    // Shift the anchor to the baseline's left end, in the entity's own frame.
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const lx = x - ax * w * cos + ay * h * sin
    const ly = y - ax * w * sin - ay * h * cos
    const [px, py] = apply(m, lx, ly)
    const [qx, qy] = apply(m, lx + cos, ly + sin)
    const [ux, uy] = apply(m, lx - sin, ly + cos)
    shapes.push({
      kind: 'text',
      x: px,
      y: py,
      height: h * Math.hypot(ux - px, uy - py),
      angle: Math.atan2(qy - py, qx - px),
      text: str,
      color: colorOf(e, ctx),
    })
  }

  function textBase(e: DwgEntity, ctx: Ctx, t: DwgTextBase) {
    const m = mul(ctx.m, ocs(t.extrusionDirection))
    const str = plainText(t.text ?? '')
    const h = t.textHeight
    const hal = t.halign ?? 0
    const val = t.valign ?? 0
    const aligned = hal === 3 || hal === 5
    const useEnd = !aligned && (hal !== 0 || val !== 0)
    const p = useEnd ? t.endPoint : t.startPoint
    const ax = useEnd ? (hal === 1 || hal === 4 ? 0.5 : hal === 2 ? 1 : 0) : 0
    const ay = hal === 4 ? 0.5 : val === 3 ? 1 : val === 2 ? 0.5 : val === 1 ? -0.25 : 0
    let angle = t.rotation ?? 0
    let wf = t.xScale || 1
    if (aligned && t.endPoint && (t.endPoint.x !== 0 || t.endPoint.y !== 0)) {
      const dx = t.endPoint.x - t.startPoint.x
      const dy = t.endPoint.y - t.startPoint.y
      angle = Math.atan2(dy, dx)
      const natural = measure(str) * (h / 0.72)
      if (natural > 0) wf = Math.hypot(dx, dy) / natural
    }
    text(e, ctx, m, str, p.x, p.y, h, angle, ax, ay, wf)
  }

  function mtext(e: DwgMTextEntity, ctx: Ctx) {
    const h = e.textHeight
    if (!(h > 0)) return
    const font = h / 0.72
    const maxW = e.rectWidth > 0 ? e.rectWidth : Infinity
    const lines: string[] = []
    for (const para of mtextLines(e.text ?? '')) {
      const words = para.split(/(\s+)/)
      let line = ''
      for (const w of words) {
        const next = line + w
        if (line.trim() && measure(next.trimEnd()) * font > maxW * 1.02) {
          lines.push(line.trimEnd())
          line = w.trimStart()
        } else line = next
      }
      lines.push(line.trimEnd())
    }
    const gap = h * (5 / 3) * (e.lineSpacing || 1)
    // The direction is a unit vector; DXF files from AutoCAD 2018+ carry an
    // "embedded object" whose group 11 the importer can mistake for it.
    const dl = e.direction ? Math.hypot(e.direction.x, e.direction.y) : 0
    const angle = Math.abs(dl - 1) < 0.01 ? Math.atan2(e.direction.y, e.direction.x) : e.rotation || 0
    const ap = e.attachmentPoint || 1
    const col = (ap - 1) % 3 // 0 left, 1 centre, 2 right
    const row = Math.floor((ap - 1) / 3) // 0 top, 1 middle, 2 bottom
    const block = h + gap * (lines.length - 1)
    const top = row === 0 ? 0 : row === 1 ? block / 2 : block
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    lines.forEach((line, i) => {
      // Offset of this line's baseline below the anchor, in the text frame.
      const down = top - h - i * gap
      const bx = e.insertionPoint.x - sin * down
      const by = e.insertionPoint.y + cos * down
      text(e, ctx, ctx.m, line, bx, by, h, angle, col / 2, 0)
    })
  }

  function hatch(e: DwgHatchEntity, ctx: Ctx) {
    const m = mul(ctx.m, ocs(e.extrusionDirection))
    const rings: number[][] = []
    for (const path of e.boundaryPaths ?? []) {
      if ('vertices' in path && path.vertices) {
        rings.push(bulgePts(path.vertices, true))
        continue
      }
      if (!('edges' in path) || !path.edges) continue
      const ring: number[] = []
      for (const edge of path.edges) {
        let pts: number[] = []
        if (edge.type === 1 && 'start' in edge && 'end' in edge && !('lengthOfMinorAxis' in edge)) pts = [edge.start.x, edge.start.y, edge.end.x, edge.end.y]
        else if (edge.type === 2 && 'radius' in edge) {
          // Clockwise edges store mirrored angles: draw counter-clockwise, then reverse.
          pts =
            edge.isCCW !== false
              ? ellipsePts(edge.center.x, edge.center.y, edge.radius, edge.radius, 0, edge.startAngle, edge.endAngle)
              : reversePairs(ellipsePts(edge.center.x, edge.center.y, edge.radius, edge.radius, 0, -edge.endAngle, -edge.startAngle))
        } else if (edge.type === 3 && 'lengthOfMinorAxis' in edge) {
          const rx = Math.hypot(edge.end.x, edge.end.y)
          const rot = Math.atan2(edge.end.y, edge.end.x)
          const ry = edge.lengthOfMinorAxis * (edge.lengthOfMinorAxis <= 1 ? rx : 1)
          const ccw = edge.isCCW !== false
          pts = ccw
            ? ellipsePts(edge.center.x, edge.center.y, rx, ry, rot, edge.startAngle, edge.endAngle)
            : reversePairs(ellipsePts(edge.center.x, edge.center.y, rx, ry, rot, -edge.endAngle, -edge.startAngle))
        } else if (edge.type === 4 && 'controlPoints' in edge) {
          pts = edge.controlPoints?.length
            ? bsplinePts(edge.controlPoints.map((p) => ({ ...p, z: 0 })), edge.degree, edge.knots ?? [], edge.controlPoints.map((p) => p.weight ?? 1))
            : throughPts(edge.fitDatum ?? [])
        }
        ring.push(...pts)
      }
      if (ring.length >= 6) rings.push(ring)
    }
    if (!rings.length) return
    if (e.solidFill === 1 || e.patternName?.toUpperCase() === 'SOLID') {
      fill(e, ctx, m, rings)
      return
    }
    // Pattern hatch: draw its line families clipped to the boundary (even-odd).
    const lines = e.definitionLines ?? []
    if (!lines.length) {
      for (const r of rings) stroke(e, ctx, m, r, true)
      return
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const r of rings)
      for (let i = 0; i < r.length; i += 2) {
        minX = Math.min(minX, r[i])
        maxX = Math.max(maxX, r[i])
        minY = Math.min(minY, r[i + 1])
        maxY = Math.max(maxY, r[i + 1])
      }
    const diag = Math.hypot(maxX - minX, maxY - minY)
    let budget = 6000
    const segs: number[][] = []
    for (const def of lines) {
      const dir = { x: Math.cos(def.angle), y: Math.sin(def.angle) }
      const nrm = { x: -dir.y, y: dir.x }
      // Distance between parallel lines, measured across them.
      const step = def.offset.x * nrm.x + def.offset.y * nrm.y
      const shift = def.offset.x * dir.x + def.offset.y * dir.y
      if (Math.abs(step) < diag / 2000) continue
      const s0 = def.base.x * nrm.x + def.base.y * nrm.y
      const corners = [minX * nrm.x + minY * nrm.y, maxX * nrm.x + minY * nrm.y, minX * nrm.x + maxY * nrm.y, maxX * nrm.x + maxY * nrm.y]
      const k0 = Math.floor((Math.min(...corners) - s0) / step)
      const k1 = Math.ceil((Math.max(...corners) - s0) / step)
      const [ka, kb] = k0 <= k1 ? [k0, k1] : [k1, k0]
      const dashes = def.dashLengths ?? []
      const period = dashes.reduce((a, d) => a + Math.abs(d), 0)
      for (let k = ka; k <= kb && budget > 0; k++) {
        const ox = def.base.x + def.offset.x * k
        const oy = def.base.y + def.offset.y * k
        // Intersect the infinite line through (ox, oy) along dir with every ring edge.
        const ts: number[] = []
        for (const r of rings) {
          for (let i = 0; i < r.length; i += 2) {
            const ax = r[i]
            const ay = r[i + 1]
            const bx = r[(i + 2) % r.length]
            const by = r[(i + 3) % r.length]
            const ex = bx - ax
            const ey = by - ay
            const den = dir.x * ey - dir.y * ex
            if (Math.abs(den) < 1e-12) continue
            const u = ((ax - ox) * dir.y - (ay - oy) * dir.x) / den
            if (u < 0 || u >= 1) continue
            ts.push(((ax - ox) * ey - (ay - oy) * ex) / den)
          }
        }
        ts.sort((a, b) => a - b)
        for (let i = 0; i + 1 < ts.length && budget > 0; i += 2) {
          const ta = ts[i]
          const tb = ts[i + 1]
          if (!dashes.length || period <= 0) {
            segs.push([ox + dir.x * ta, oy + dir.y * ta, ox + dir.x * tb, oy + dir.y * tb])
            budget--
            continue
          }
          // Walk the dash pattern, phase-aligned to the line's origin.
          const phase0 = (((ta - shift * k) % period) + period) % period
          let t = ta - phase0
          let idx = 0
          while (t < tb && budget > 0) {
            const d = dashes[idx % dashes.length]
            const len = Math.abs(d) || period / 200
            if (d >= 0) {
              const a = Math.max(t, ta)
              const b = Math.min(t + len, tb)
              if (b > a) {
                segs.push([ox + dir.x * a, oy + dir.y * a, ox + dir.x * b, oy + dir.y * b])
                budget--
              }
            }
            t += len
            idx++
          }
        }
      }
    }
    if (budget <= 0) {
      // Too dense to draw line by line: a light tint reads the same on paper.
      const c = colorOf(e, ctx)
      shapes.push({ kind: 'fill', rings: rings.map((r) => tx(m, r)), color: c.map((v) => Math.round(v + (255 - v) * 0.75)) as RGB })
    } else for (const s of segs) stroke(e, ctx, m, s)
    for (const r of rings) stroke(e, ctx, m, r, true)
  }

  function insert(e: DwgInsertEntity, ctx: Ctx, blockName: string, base: M) {
    const block = blocks.get(blockName)
    if (!block || ctx.depth > 12) return
    const child: Ctx = { m: base, color: colorOf(e, ctx), weight: weightOf(e, ctx), layer: layerOf(e, ctx), depth: ctx.depth + 1 }
    for (const be of block.entities ?? []) entity(be, child)
  }

  function entity(e: DwgEntity, ctx: Ctx) {
    if (e.isVisible === false || e.isInPaperSpace) return
    if (!visible(layerOf(e, ctx))) return
    const m = ctx.m
    switch (e.type) {
      case 'LINE': {
        const l = e as DwgLineEntity
        stroke(e, ctx, m, [l.startPoint.x, l.startPoint.y, l.endPoint.x, l.endPoint.y])
        break
      }
      case 'CIRCLE': {
        const c = e as DwgCircleEntity
        stroke(e, ctx, mul(m, ocs(c.extrusionDirection)), ellipsePts(c.center.x, c.center.y, c.radius, c.radius, 0, 0, TAU, true), true)
        break
      }
      case 'ARC': {
        const a = e as DwgArcEntity
        stroke(e, ctx, mul(m, ocs(a.extrusionDirection)), ellipsePts(a.center.x, a.center.y, a.radius, a.radius, 0, a.startAngle, a.endAngle))
        break
      }
      case 'ELLIPSE': {
        const el = e as DwgEllipseEntity
        const rx = Math.hypot(el.majorAxisEndPoint.x, el.majorAxisEndPoint.y)
        const rot = Math.atan2(el.majorAxisEndPoint.y, el.majorAxisEndPoint.x)
        const full = Math.abs(el.endAngle - el.startAngle) < 1e-9 || Math.abs(Math.abs(el.endAngle - el.startAngle) - TAU) < 1e-6
        // Points are in world coordinates; seen from below the parameter runs the other way.
        const ry = rx * el.axisRatio * (el.extrusionDirection && el.extrusionDirection.z < -0.5 ? -1 : 1)
        stroke(e, ctx, m, ellipsePts(el.center.x, el.center.y, rx, ry, rot, el.startAngle, el.endAngle, full), full)
        break
      }
      case 'LWPOLYLINE': {
        const p = e as DwgLWPolylineEntity
        const closed = (p.flag & 0x200) !== 0 || (p.flag & 1) !== 0
        const pm = mul(m, ocs(p.extrusionDirection))
        const pts = bulgePts(p.vertices ?? [], closed)
        if (p.constantWidth && p.constantWidth > 0) {
          const s = shapes.length
          stroke(e, ctx, pm, pts, closed)
          // A wide polyline: thicken by its width, as it prints.
          const sh = shapes[s]
          if (sh && sh.kind === 'stroke') sh.weight = Math.max(sh.weight, -p.constantWidth * stretch(pm)) // negative = drawing units
        } else stroke(e, ctx, pm, pts, closed)
        break
      }
      case 'POLYLINE2D': {
        const p = e as DwgPolyline2dEntity
        const closed = (p.flag & 1) !== 0
        const vs = (p.vertices ?? []).filter((v) => !(v.flag & 16)) // skip spline frame control points
        stroke(e, ctx, mul(m, ocs(p.extrusionDirection)), bulgePts(vs, closed), closed)
        break
      }
      case 'POLYLINE3D': {
        const p = e as DwgPolyline3dEntity
        const closed = (p.flag & 1) !== 0
        stroke(e, ctx, m, (p.vertices ?? []).filter((v) => !(v.flag & 16)).flatMap((v) => [v.x, v.y]), closed)
        break
      }
      case 'SPLINE': {
        const s = e as DwgSplineEntity
        const pts = s.controlPoints?.length ? bsplinePts(s.controlPoints, s.degree, s.knots ?? [], s.weights) : throughPts(s.fitPoints ?? [])
        stroke(e, ctx, m, pts, (s.flag & 1) !== 0)
        break
      }
      case 'POINT': {
        const p = e as DwgPointEntity
        const [x, y] = apply(m, p.position.x, p.position.y)
        shapes.push({ kind: 'stroke', pts: [x, y, x, y], closed: false, color: colorOf(e, ctx), weight: Math.max(weightOf(e, ctx), 0.5) })
        break
      }
      case 'SOLID':
      case 'TRACE': {
        const s = e as DwgSolidEntity
        const c4 = s.corner4 ?? s.corner3
        // SOLID corners go 1-2-4-3 around the outline.
        fill(e, ctx, mul(m, ocs(s.extrusionDirection)), [[s.corner1.x, s.corner1.y, s.corner2.x, s.corner2.y, c4.x, c4.y, s.corner3.x, s.corner3.y]])
        break
      }
      case '3DFACE': {
        const f = e as DwgSolidEntity
        const c4 = f.corner4 ?? f.corner3
        const flags = (e as unknown as { flag: number }).flag ?? 0
        const cs = [f.corner1, f.corner2, f.corner3, c4]
        for (let i = 0; i < 4; i++) {
          if (flags & (1 << i)) continue // invisible edge
          const a = cs[i]
          const b = cs[(i + 1) % 4]
          if (a.x !== b.x || a.y !== b.y) stroke(e, ctx, m, [a.x, a.y, b.x, b.y])
        }
        break
      }
      case 'TEXT':
        textBase(e, ctx, e as DwgTextEntity)
        break
      case 'ATTRIB': {
        const a = e as DwgAttribEntity
        if (a.flags & 1) break // invisible attribute
        if (a.text) textBase(e, ctx, { ...a.text, endPoint: a.alignmentPoint ?? a.text.endPoint })
        break
      }
      case 'ATTDEF':
        break // the template; the values come from ATTRIBs
      case 'MTEXT':
        mtext(e as DwgMTextEntity, ctx)
        break
      case 'HATCH':
        hatch(e as DwgHatchEntity, ctx)
        break
      case 'LEADER': {
        const l = e as DwgLeaderEntity
        const vs = l.vertices ?? []
        stroke(e, ctx, m, vs.flatMap((v) => [v.x, v.y]))
        if (l.isArrowheadEnabled !== false && vs.length >= 2) {
          const [a, b] = vs
          const len = Math.hypot(b.x - a.x, b.y - a.y)
          if (len > 0) {
            const size = Math.min(len / 3, (l.textHeight || len / 6) * 1)
            const ux = (b.x - a.x) / len
            const uy = (b.y - a.y) / len
            fill(e, ctx, m, [[a.x, a.y, a.x + ux * size - uy * size * 0.25, a.y + uy * size + ux * size * 0.25, a.x + ux * size + uy * size * 0.25, a.y + uy * size - ux * size * 0.25]])
          }
        }
        break
      }
      case 'INSERT': {
        const ins = e as DwgInsertEntity
        const block = blocks.get(ins.name)
        const bp = block?.basePoint ?? { x: 0, y: 0, z: 0 }
        const cols = Math.max(1, ins.columnCount || 1)
        const rows = Math.max(1, ins.rowCount || 1)
        const own = mul(ctx.m, ocs(ins.extrusionDirection))
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) {
            const local = mul(
              mul(mul(translate(ins.insertionPoint.x, ins.insertionPoint.y), rotate(ins.rotation || 0)), translate(c * (ins.columnSpacing || 0), r * (ins.rowSpacing || 0))),
              mul(scale(ins.xScale || 1, ins.yScale || 1), translate(-bp.x, -bp.y)),
            )
            insert(ins, ctx, ins.name, mul(own, local))
          }
        for (const a of ins.attribs ?? []) entity(a, ctx)
        break
      }
      case 'DIMENSION': {
        // A dimension's look is stored as an anonymous block, already in world coordinates.
        const d = e as DwgDimensionEntity
        if (d.name && blocks.has(d.name)) insert(e as unknown as DwgInsertEntity, ctx, d.name, ctx.m)
        else skipped.add(e.type)
        break
      }
      case 'RAY':
      case 'XLINE': {
        const r = e as unknown as { firstPoint: DwgPoint3D; unitDirection: DwgPoint3D }
        const [x, y] = apply(m, r.firstPoint.x, r.firstPoint.y)
        const [x2, y2] = apply(m, r.firstPoint.x + r.unitDirection.x, r.firstPoint.y + r.unitDirection.y)
        infinite.push({ x, y, dx: x2 - x, dy: y2 - y, both: e.type === 'XLINE', color: colorOf(e, ctx), weight: weightOf(e, ctx) })
        break
      }
      case 'VIEWPORT':
      case 'WIPEOUT':
        break
      default:
        skipped.add(e.type)
    }
  }

  const root: Ctx = { m: IDENTITY, color: BLACK, weight: DEFAULT_WEIGHT, layer: '0', depth: 0 }
  for (const e of db.entities ?? []) {
    if (e.isInPaperSpace) continue
    entity(e, root)
  }

  const { bounds, strays } = extentsOf(shapes)
  if (infinite.length && Number.isFinite(bounds.minX)) {
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 2 || 1
    for (const r of infinite) {
      const len = Math.hypot(r.dx, r.dy) || 1
      const ux = (r.dx / len) * span
      const uy = (r.dy / len) * span
      const pts = r.both ? [r.x - ux, r.y - uy, r.x + ux, r.y + uy] : [r.x, r.y, r.x + ux, r.y + uy]
      shapes.push({ kind: 'stroke', pts, closed: false, color: r.color, weight: r.weight })
    }
  }

  const used = new Set<string>()
  for (const e of db.entities ?? []) used.add(e.layer || '0')
  return {
    shapes,
    bounds,
    skipped: [...skipped],
    strays,
    layers: [...layers.keys()].filter((l) => used.has(l) || l === '0').sort((a, b) => a.localeCompare(b)),
    unitMm: UNIT_MM[db.header?.INSUNITS ?? 0] ?? 0,
  }
}

/**
 * Extents for the page. Stray objects far from everything else (a stray
 * point at 1e6, a text scaled by mistake) are common in real drawings and
 * would shrink the drawing to a dot, so shapes reaching beyond the central
 * 99% of the drawing, widened by half its size, do not count.
 */
function extentsOf(shapes: Shape[]): { bounds: Box; strays: number } {
  const all = boundsOf(shapes)
  if (shapes.length < 20) return { bounds: all, strays: 0 }
  const boxes = shapes.map((s) => boundsOf([s]))
  const xs = boxes.map((b) => (b.minX + b.maxX) / 2).sort((a, b) => a - b)
  const ys = boxes.map((b) => (b.minY + b.maxY) / 2).sort((a, b) => a - b)
  const q = (arr: number[], f: number) => arr[Math.min(arr.length - 1, Math.max(0, Math.round(f * (arr.length - 1))))]
  const x0 = q(xs, 0.005)
  const x1 = q(xs, 0.995)
  const y0 = q(ys, 0.005)
  const y1 = q(ys, 0.995)
  const pad = Math.max(x1 - x0, y1 - y0) * 0.5 || 1
  const keep: Shape[] = []
  let strays = 0
  boxes.forEach((b, i) => {
    if (b.minX < x0 - pad || b.maxX > x1 + pad || b.minY < y0 - pad || b.maxY > y1 + pad) strays++
    else keep.push(shapes[i])
  })
  return { bounds: strays ? boundsOf(keep) : all, strays }
}

/** Extents of the shapes; text counts by its anchor and a rough width. */
export function boundsOf(shapes: Shape[]): Box {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const add = (x: number, y: number) => {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  for (const s of shapes) {
    if (s.kind === 'stroke') for (let i = 0; i < s.pts.length; i += 2) add(s.pts[i], s.pts[i + 1])
    else if (s.kind === 'fill') for (const r of s.rings) for (let i = 0; i < r.length; i += 2) add(r[i], r[i + 1])
    else {
      add(s.x, s.y)
      add(s.x + Math.cos(s.angle) * s.height * s.text.length * 0.6, s.y + Math.sin(s.angle) * s.height * s.text.length * 0.6)
    }
  }
  return { minX, minY, maxX, maxY }
}
