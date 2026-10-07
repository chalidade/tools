import { getStroke } from 'perfect-freehand'

/*
 * The whiteboard is vector: every pen line, shape and note is an item in world
 * coordinates. That is what makes undo, moving, zooming without blur and sharp
 * exports possible. Items are immutable — an edit replaces the object — so a
 * WeakMap can cache each stroke's outline.
 */

export type Point = { x: number; y: number }

export type Surface = 'white' | 'black'
export type Pattern = 'plain' | 'grid' | 'lines' | 'dots'

export interface StrokeItem {
  kind: 'stroke'
  id: string
  color: string
  size: number
  /** x, y, pressure (0–1). */
  points: [number, number, number][]
  /** No real pressure (mouse, finger): let perfect-freehand fake it from speed. */
  simulate: boolean
  marker?: boolean
  /** Paints transparency: erases what was drawn before it, like a paint eraser. */
  erase?: boolean
}
export interface ShapeItem {
  kind: 'line' | 'arrow' | 'rect' | 'ellipse'
  id: string
  color: string
  size: number
  a: Point
  b: Point
}
export interface TextItem {
  kind: 'text'
  id: string
  color: string
  /** Font size in world px. */
  size: number
  at: Point
  text: string
}
export type Item = StrokeItem | ShapeItem | TextItem

export interface Page {
  id: string
  items: Item[]
}

export interface BoardDoc {
  surface: Surface
  pattern: Pattern
  pages: Page[]
}

/**
 * Colours are stored by name and resolved per surface, so a drawing stays readable when the board flips.
 * label is [Indonesian, English]; render it with t(...label).
 */
export const COLORS = [
  { id: 'ink', label: ['Tinta', 'Ink'], white: '#111827', black: '#f8fafc' },
  { id: 'red', label: ['Merah', 'Red'], white: '#dc2626', black: '#fca5a5' },
  { id: 'blue', label: ['Biru', 'Blue'], white: '#2563eb', black: '#93c5fd' },
  { id: 'green', label: ['Hijau', 'Green'], white: '#16a34a', black: '#86efac' },
  { id: 'orange', label: ['Oranye', 'Orange'], white: '#ea580c', black: '#fdba74' },
  { id: 'purple', label: ['Ungu', 'Purple'], white: '#7c3aed', black: '#c4b5fd' },
  { id: 'yellow', label: ['Kuning', 'Yellow'], white: '#ca8a04', black: '#fde047' },
  { id: 'pink', label: ['Merah muda', 'Pink'], white: '#db2777', black: '#f9a8d4' },
] as const

export const SURFACES: Record<Surface, { bg: string; line: string; label: string }> = {
  white: { bg: '#ffffff', line: 'rgba(15, 23, 42, 0.09)', label: 'Whiteboard' },
  black: { bg: '#1d2b24', line: 'rgba(255, 255, 255, 0.08)', label: 'Blackboard' },
}

export const FONT = 'Geist, ui-sans-serif, system-ui, sans-serif'
export const LINE_HEIGHT = 1.25
const SPACING = 32

export function colorOf(id: string, surface: Surface) {
  const c = COLORS.find((x) => x.id === id) ?? COLORS[0]
  return c[surface]
}

export const newId = () => Math.random().toString(36).slice(2, 10)

export function emptyDoc(): BoardDoc {
  return { surface: 'white', pattern: 'grid', pages: [{ id: newId(), items: [] }] }
}

// ---------------------------------------------------------------- rendering

const outlines = new WeakMap<StrokeItem, Path2D>()

function strokePath(item: StrokeItem) {
  let path = outlines.get(item)
  if (path) return path
  const outline = getStroke(item.points, {
    size: item.size,
    thinning: item.marker || item.erase ? 0 : 0.55,
    smoothing: 0.5,
    streamline: 0.45,
    simulatePressure: item.simulate,
    last: true,
  })
  path = new Path2D(svgPathFromOutline(outline))
  outlines.set(item, path)
  return path
}

/** perfect-freehand's outline polygon as a smooth SVG path (from its README). */
function svgPathFromOutline(points: number[][]) {
  if (!points.length) return ''
  const d: (string | number)[] = ['M', points[0][0], points[0][1], 'Q']
  points.forEach(([x0, y0], i) => {
    const [x1, y1] = points[(i + 1) % points.length]
    d.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  })
  d.push('Z')
  return d.join(' ')
}

/** Draws items onto a transparent layer. Erase strokes cut through whatever came before them. */
export function drawItems(ctx: CanvasRenderingContext2D, items: Item[], surface: Surface) {
  for (const item of items) drawItem(ctx, item, surface)
}

export function drawItem(ctx: CanvasRenderingContext2D, item: Item, surface: Surface) {
  ctx.save()
  const color = colorOf(item.color, surface)
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  switch (item.kind) {
    case 'stroke':
      if (item.erase) {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = '#000'
      } else if (item.marker) ctx.globalAlpha = 0.38
      ctx.fill(strokePath(item))
      break
    case 'line':
    case 'arrow': {
      ctx.lineWidth = item.size
      ctx.beginPath()
      ctx.moveTo(item.a.x, item.a.y)
      ctx.lineTo(item.b.x, item.b.y)
      ctx.stroke()
      if (item.kind === 'arrow') {
        const angle = Math.atan2(item.b.y - item.a.y, item.b.x - item.a.x)
        const head = Math.max(12, item.size * 3.2)
        ctx.beginPath()
        ctx.moveTo(item.b.x - head * Math.cos(angle - 0.45), item.b.y - head * Math.sin(angle - 0.45))
        ctx.lineTo(item.b.x, item.b.y)
        ctx.lineTo(item.b.x - head * Math.cos(angle + 0.45), item.b.y - head * Math.sin(angle + 0.45))
        ctx.stroke()
      }
      break
    }
    case 'rect': {
      ctx.lineWidth = item.size
      const r = rectOf(item.a, item.b)
      ctx.beginPath()
      ctx.roundRect(r.x, r.y, r.w, r.h, Math.min(8, r.w / 4, r.h / 4))
      ctx.stroke()
      break
    }
    case 'ellipse': {
      ctx.lineWidth = item.size
      const r = rectOf(item.a, item.b)
      ctx.beginPath()
      ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'text': {
      ctx.font = `500 ${item.size}px ${FONT}`
      ctx.textBaseline = 'top'
      item.text.split('\n').forEach((line, i) => ctx.fillText(line, item.at.x, item.at.y + i * item.size * LINE_HEIGHT))
      break
    }
  }
  ctx.restore()
}

/** The board colour and its ruling, in screen space so the lines stay crisp at any zoom. */
export function drawSurface(
  ctx: CanvasRenderingContext2D,
  surface: Surface,
  pattern: Pattern,
  view: { x: number; y: number; zoom: number },
  width: number,
  height: number,
) {
  const s = SURFACES[surface]
  ctx.fillStyle = s.bg
  ctx.fillRect(0, 0, width, height)
  if (pattern === 'plain') return
  let step = SPACING * view.zoom
  while (step < 12) step *= 2
  const ox = -((view.x * view.zoom) % step)
  const oy = -((view.y * view.zoom) % step)
  ctx.fillStyle = s.line
  ctx.strokeStyle = s.line
  ctx.lineWidth = 1
  if (pattern === 'dots') {
    const r = Math.max(1, Math.min(2, view.zoom * 1.4))
    for (let x = ox; x < width; x += step)
      for (let y = oy; y < height; y += step) {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    return
  }
  ctx.beginPath()
  for (let y = oy; y < height; y += step) {
    ctx.moveTo(0, Math.round(y) + 0.5)
    ctx.lineTo(width, Math.round(y) + 0.5)
  }
  if (pattern === 'grid')
    for (let x = ox; x < width; x += step) {
      ctx.moveTo(Math.round(x) + 0.5, 0)
      ctx.lineTo(Math.round(x) + 0.5, height)
    }
  ctx.stroke()
}

// ---------------------------------------------------------------- geometry

export function rectOf(a: Point, b: Point) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
}

let measurer: CanvasRenderingContext2D | null = null
function textSize(item: TextItem) {
  measurer ??= document.createElement('canvas').getContext('2d')
  const lines = item.text.split('\n')
  if (!measurer) return { w: item.size * 0.6 * Math.max(...lines.map((l) => l.length)), h: lines.length * item.size * LINE_HEIGHT }
  measurer.font = `500 ${item.size}px ${FONT}`
  return {
    w: Math.max(4, ...lines.map((l) => measurer!.measureText(l).width)),
    h: lines.length * item.size * LINE_HEIGHT,
  }
}

export function boundsOf(item: Item) {
  switch (item.kind) {
    case 'stroke': {
      let x0 = Infinity
      let y0 = Infinity
      let x1 = -Infinity
      let y1 = -Infinity
      for (const [x, y] of item.points) {
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
      const pad = item.size / 2
      return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 }
    }
    case 'text': {
      const { w, h } = textSize(item)
      return { x: item.at.x, y: item.at.y, w, h }
    }
    default: {
      const r = rectOf(item.a, item.b)
      const pad = item.size / 2 + (item.kind === 'arrow' ? item.size * 3 : 0)
      return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }
    }
  }
}

/** Bounds of everything visible on a page (erase strokes don't count), or null when it's blank. */
export function contentBounds(items: Item[]) {
  const visible = items.filter((i) => !(i.kind === 'stroke' && i.erase))
  if (!visible.length) return null
  const all = visible.map(boundsOf)
  const x = Math.min(...all.map((b) => b.x))
  const y = Math.min(...all.map((b) => b.y))
  return {
    x,
    y,
    w: Math.max(...all.map((b) => b.x + b.w)) - x,
    h: Math.max(...all.map((b) => b.y + b.h)) - y,
  }
}

function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/**
 * Whether `p` touches the item, within `tolerance` world px. With `inside`,
 * the interior of shapes and text counts too (for picking); without it only
 * the ink does (for the object eraser).
 */
export function hits(item: Item, p: Point, tolerance: number, inside: boolean) {
  switch (item.kind) {
    case 'stroke': {
      if (item.erase) return false
      const reach = item.size / 2 + tolerance
      const pts = item.points
      if (pts.length === 1) return Math.hypot(p.x - pts[0][0], p.y - pts[0][1]) < reach
      for (let i = 1; i < pts.length; i++)
        if (segmentDistance(p, { x: pts[i - 1][0], y: pts[i - 1][1] }, { x: pts[i][0], y: pts[i][1] }) < reach)
          return true
      return false
    }
    case 'line':
    case 'arrow':
      return segmentDistance(p, item.a, item.b) < item.size / 2 + tolerance
    case 'rect': {
      const r = rectOf(item.a, item.b)
      const reach = item.size / 2 + tolerance
      if (inside && p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) return true
      const corners = [
        { x: r.x, y: r.y },
        { x: r.x + r.w, y: r.y },
        { x: r.x + r.w, y: r.y + r.h },
        { x: r.x, y: r.y + r.h },
      ]
      return corners.some((c, i) => segmentDistance(p, c, corners[(i + 1) % 4]) < reach)
    }
    case 'ellipse': {
      const r = rectOf(item.a, item.b)
      const rx = Math.max(1, r.w / 2)
      const ry = Math.max(1, r.h / 2)
      const d = Math.hypot((p.x - r.x - rx) / rx, (p.y - r.y - ry) / ry)
      if (inside && d < 1) return true
      return Math.abs(d - 1) * Math.min(rx, ry) < item.size / 2 + tolerance
    }
    case 'text': {
      const b = boundsOf(item)
      return p.x > b.x - tolerance && p.x < b.x + b.w + tolerance && p.y > b.y - tolerance && p.y < b.y + b.h + tolerance
    }
  }
}

export function moved(item: Item, dx: number, dy: number): Item {
  switch (item.kind) {
    case 'stroke':
      return { ...item, points: item.points.map(([x, y, p]) => [x + dx, y + dy, p]) }
    case 'text':
      return { ...item, at: { x: item.at.x + dx, y: item.at.y + dy } }
    default:
      return { ...item, a: { x: item.a.x + dx, y: item.a.y + dy }, b: { x: item.b.x + dx, y: item.b.y + dy } }
  }
}

// ---------------------------------------------------------------- export

/** A page rendered as an image: the board colour and ruling, then the ink. Null for a blank page. */
export function renderPage(page: Page, doc: BoardDoc, scale = 2, padding = 48) {
  const b = contentBounds(page.items)
  if (!b) return null
  const w = Math.ceil((b.w + padding * 2) * scale)
  const h = Math.ceil((b.h + padding * 2) * scale)
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')!
  const view = { x: b.x - padding, y: b.y - padding, zoom: scale }
  drawSurface(ctx, doc.surface, doc.pattern, view, w, h)

  // Ink goes on its own layer, so erase strokes cut the ink and never the board.
  const ink = document.createElement('canvas')
  ink.width = w
  ink.height = h
  const ictx = ink.getContext('2d')!
  ictx.setTransform(scale, 0, 0, scale, -view.x * scale, -view.y * scale)
  drawItems(ictx, page.items, doc.surface)
  ctx.drawImage(ink, 0, 0)
  return out
}

/** Loose check for a board file opened from disk. */
export function isBoardDoc(value: unknown): value is BoardDoc {
  const v = value as BoardDoc
  return (
    !!v &&
    (v.surface === 'white' || v.surface === 'black') &&
    Array.isArray(v.pages) &&
    v.pages.length > 0 &&
    v.pages.every((p) => p && Array.isArray(p.items))
  )
}
