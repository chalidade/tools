import { CATEGORIES, TOOLS, type CategoryId, type Tool } from '@/tools/registry'

export interface Point {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface Circle {
  x: number
  y: number
  r: number
}

export interface Kiosk {
  tool: Tool
  /** What is drawn: the stall standing up, seen from the front. */
  rect: Rect
  /** What blocks walking: the bottom strip the stall stands on. */
  footprint: Rect
  /** Where a click on the stall walks the player to. */
  front: Point
}

export interface Zone {
  id: CategoryId
  title: string
  description: string
  rect: Rect
  kiosks: Kiosk[]
}

export interface Tree {
  x: number
  y: number
  size: number
  kind: 'tree' | 'bush' | 'flower'
}

export interface World {
  width: number
  height: number
  zones: Zone[]
  kiosks: Kiosk[]
  plaza: Rect
  monument: Circle
  spawn: Point
  trees: Tree[]
  rects: Rect[]
  circles: Circle[]
}

export const KIOSK_W = 156
export const KIOSK_H = 124
const GAP_X = 36
const GAP_Y = 70
const PAD = 44
const HEADER = 76
const ROAD = 170
const MARGIN = 150
const PLAZA_W = 560
const PLAZA_H = 460
const MAX_COLS = 3

/**
 * Grid cells the districts fill, in category order. The middle of the top row
 * is the plaza, so the player spawns surrounded by every district.
 */
const CELLS: [row: number, col: number][] = [
  [0, 0],
  [0, 2],
  [1, 0],
  [1, 1],
  [1, 2],
  [2, 0],
  [2, 1],
  [2, 2],
]

/** Small deterministic PRNG, so the trees grow in the same place every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

const inside = (p: Point, r: Rect, pad = 0) =>
  p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad

export function buildWorld(): World {
  const groups = CATEGORIES.map((c) => ({ ...c, tools: TOOLS.filter((t) => t.category === c.id) })).filter(
    (g) => g.tools.length > 0,
  )

  // Size every district by how many stalls it holds.
  const sized = groups.map((g, i) => {
    const cols = Math.min(MAX_COLS, Math.max(2, g.tools.length))
    const rows = Math.ceil(g.tools.length / cols)
    const [row, col] = CELLS[i % CELLS.length]
    return {
      ...g,
      cols,
      row,
      col,
      w: cols * KIOSK_W + (cols - 1) * GAP_X + PAD * 2,
      h: HEADER + rows * KIOSK_H + (rows - 1) * GAP_Y + PAD,
    }
  })

  const rowCount = Math.max(...sized.map((s) => s.row)) + 1
  const colW = [0, 1, 2].map((c) => Math.max(c === 1 ? PLAZA_W : 0, ...sized.filter((s) => s.col === c).map((s) => s.w)))
  const rowH = Array.from({ length: rowCount }, (_, r) =>
    Math.max(r === 0 ? PLAZA_H : 0, ...sized.filter((s) => s.row === r).map((s) => s.h)),
  )
  const colX = colW.map((_, c) => MARGIN + colW.slice(0, c).reduce((a, b) => a + b + ROAD, 0))
  const rowY = rowH.map((_, r) => MARGIN + rowH.slice(0, r).reduce((a, b) => a + b + ROAD, 0))

  const zones: Zone[] = sized.map((s) => {
    const rect = { x: colX[s.col] + (colW[s.col] - s.w) / 2, y: rowY[s.row], w: s.w, h: s.h }
    const kiosks = s.tools.map((tool, i) => {
      const row = Math.floor(i / s.cols)
      const inRow = Math.min(s.cols, s.tools.length - row * s.cols)
      // A short last row is centred rather than left-aligned.
      const rowW = inRow * KIOSK_W + (inRow - 1) * GAP_X
      const x = rect.x + (rect.w - rowW) / 2 + (i % s.cols) * (KIOSK_W + GAP_X)
      const y = rect.y + HEADER + row * (KIOSK_H + GAP_Y)
      return {
        tool,
        rect: { x, y, w: KIOSK_W, h: KIOSK_H },
        footprint: { x: x + 6, y: y + KIOSK_H - 46, w: KIOSK_W - 12, h: 44 },
        front: { x: x + KIOSK_W / 2, y: y + KIOSK_H + 28 },
      }
    })
    return { id: s.id, title: s.title, description: s.description, rect, kiosks }
  })

  const width = colX[2] + colW[2] + MARGIN
  const height = rowY[rowCount - 1] + rowH[rowCount - 1] + MARGIN
  const plaza = { x: colX[1] + (colW[1] - PLAZA_W) / 2, y: rowY[0], w: PLAZA_W, h: PLAZA_H }
  const monument = { x: plaza.x + plaza.w / 2, y: plaza.y + plaza.h * 0.42, r: 54 }
  const spawn = { x: monument.x, y: monument.y + monument.r + 90 }

  // Scatter greenery over the roads and margins, never on a district or the plaza.
  const random = rng(20261007)
  const trees: Tree[] = []
  for (let n = 0; n < 900 && trees.length < 70; n++) {
    const p = { x: 30 + random() * (width - 60), y: 40 + random() * (height - 70) }
    if (zones.some((z) => inside(p, z.rect, 46)) || inside(p, plaza, 40)) continue
    if (trees.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 64)) continue
    const roll = random()
    trees.push({
      ...p,
      kind: roll < 0.45 ? 'tree' : roll < 0.75 ? 'bush' : 'flower',
      size: 0.8 + random() * 0.5,
    })
  }

  const kiosks = zones.flatMap((z) => z.kiosks)
  return {
    width,
    height,
    zones,
    kiosks,
    plaza,
    monument,
    spawn,
    trees,
    rects: kiosks.map((k) => k.footprint),
    circles: [monument, ...trees.filter((t) => t.kind === 'tree').map((t) => ({ x: t.x, y: t.y, r: 13 * t.size }))],
  }
}

/** Distance from a point to the nearest edge of a rectangle (0 inside it). */
export function distToRect(p: Point, r: Rect) {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w))
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h))
  return Math.hypot(dx, dy)
}

/** Push a round body of radius `r` out of every solid and back inside the world. */
export function collide(p: Point, r: number, world: World) {
  for (const s of world.rects) {
    const cx = Math.min(Math.max(p.x, s.x), s.x + s.w)
    const cy = Math.min(Math.max(p.y, s.y), s.y + s.h)
    const dx = p.x - cx
    const dy = p.y - cy
    const d = Math.hypot(dx, dy)
    if (d >= r) continue
    if (d > 0) {
      p.x += (dx / d) * (r - d)
      p.y += (dy / d) * (r - d)
    } else {
      // Centre is inside the rectangle: leave by the shortest side.
      const out = [p.x - s.x, s.x + s.w - p.x, p.y - s.y, s.y + s.h - p.y]
      const i = out.indexOf(Math.min(...out))
      if (i === 0) p.x = s.x - r
      else if (i === 1) p.x = s.x + s.w + r
      else if (i === 2) p.y = s.y - r
      else p.y = s.y + s.h + r
    }
  }
  for (const c of world.circles) {
    const dx = p.x - c.x
    const dy = p.y - c.y
    const d = Math.hypot(dx, dy) || 0.001
    if (d < r + c.r) {
      p.x = c.x + (dx / d) * (r + c.r)
      p.y = c.y + (dy / d) * (r + c.r)
    }
  }
  p.x = Math.min(Math.max(p.x, r + 10), world.width - r - 10)
  p.y = Math.min(Math.max(p.y, r + 30), world.height - r - 10)
}
