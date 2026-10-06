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

/** A tool, standing in its district as a character the player can talk to. */
export interface Keeper {
  tool: Tool
  /** Where its feet are. It is solid within KEEPER_R of this point. */
  home: Point
  /** Where a click on it walks the player to. */
  front: Point
}

export interface Zone {
  id: CategoryId
  title: string
  description: string
  rect: Rect
  keepers: Keeper[]
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
  keepers: Keeper[]
  plaza: Rect
  monument: Circle
  spawn: Point
  trees: Tree[]
  circles: Circle[]
}

export const KEEPER_R = 18
/** One character's patch of ground: room for its name tag and to walk around it. */
const CELL_W = 150
const CELL_H = 120
const GAP_X = 30
const GAP_Y = 46
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
      w: cols * CELL_W + (cols - 1) * GAP_X + PAD * 2,
      h: HEADER + rows * CELL_H + (rows - 1) * GAP_Y + PAD,
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
    const keepers = s.tools.map((tool, i) => {
      const row = Math.floor(i / s.cols)
      const inRow = Math.min(s.cols, s.tools.length - row * s.cols)
      // A short last row is centred rather than left-aligned.
      const rowW = inRow * CELL_W + (inRow - 1) * GAP_X
      const x = rect.x + (rect.w - rowW) / 2 + (i % s.cols) * (CELL_W + GAP_X)
      const y = rect.y + HEADER + row * (CELL_H + GAP_Y)
      const home = { x: x + CELL_W / 2, y: y + CELL_H - 22 }
      return { tool, home, front: { x: home.x, y: home.y + 46 } }
    })
    return { id: s.id, title: s.title, description: s.description, rect, keepers }
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

  const keepers = zones.flatMap((z) => z.keepers)
  return {
    width,
    height,
    zones,
    keepers,
    plaza,
    monument,
    spawn,
    trees,
    circles: [
      monument,
      ...keepers.map((k) => ({ ...k.home, r: KEEPER_R })),
      ...trees.filter((t) => t.kind === 'tree').map((t) => ({ x: t.x, y: t.y, r: 13 * t.size })),
    ],
  }
}

/** Push a round body of radius `r` out of every solid and back inside the world. */
export function collide(p: Point, r: number, world: World) {
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
