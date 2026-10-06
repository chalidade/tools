import { CATEGORIES, TOOLS, type CategoryId, type Tool } from '@/tools/registry'

/*
 * The walkable home page is a set of scenes: a town with one house per
 * category, and the inside of each house, where every tool of that category
 * is a person the player can talk to. All of it is laid out from the registry.
 */

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

export type SceneId = 'town' | CategoryId

/** A tool, as a person standing in its house. */
export interface Keeper {
  tool: Tool
  /** Where its feet are; solid within KEEPER_R of it. */
  home: Point
  /** Where a click on it walks the player to. */
  front: Point
}

/** Walking through `at` in direction `dir` moves the player to `spawn` in scene `to`. */
export interface Door {
  at: Point
  dir: 'up' | 'down'
  to: SceneId
  spawn: Point
  label: string
}

interface SceneBase {
  id: SceneId
  width: number
  height: number
  spawn: Point
  rects: Rect[]
  circles: Circle[]
  keepers: Keeper[]
  doors: Door[]
}

export interface House {
  id: CategoryId
  title: string
  description: string
  rect: Rect
  roof: string
  door: Point
  tools: Tool[]
}

export interface Tree {
  x: number
  y: number
  size: number
  kind: 'tree' | 'bush' | 'flower'
}

export interface Town extends SceneBase {
  kind: 'town'
  houses: House[]
  paths: Rect[]
  plaza: Circle
  trees: Tree[]
}

export interface Room extends SceneBase {
  kind: 'room'
  house: House
  wall: number
  mat: Point
  plants: Circle[]
}

export type Scene = Town | Room

export const KEEPER_R = 17
export const HOUSE_W = 300
export const HOUSE_H = 240

const TOWN_W = 1900
const ROW_GAP = 520
const HOUSE_SPACING = 600

const ROOM_CELL_W = 210
const ROOM_CELL_H = 170
const ROOM_SIDE = 90
const ROOM_WALL = 150
const ROOM_BOTTOM = 150
const WALL_T = 24

/** Roof colour per category, in category order (wraps for more categories). */
const ROOFS = ['#e05a4f', '#3f7fd9', '#8b5cf6', '#e0599b', '#2f9e6b', '#e0a43a']

/** Small deterministic PRNG, so the trees grow in the same place every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

const inRect = (p: Point, r: Rect, pad = 0) =>
  p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad

export function buildScenes(): Record<SceneId, Scene> {
  const groups = CATEGORIES.map((c) => ({ ...c, tools: TOOLS.filter((t) => t.category === c.id) })).filter(
    (g) => g.tools.length > 0,
  )

  // --- Town: houses in rows of three, the plaza between the first two rows.
  const rows: (typeof groups)[] = []
  for (let i = 0; i < groups.length; i += 3) rows.push(groups.slice(i, i + 3))
  const rowY = (r: number) => 150 + r * (HOUSE_H + ROW_GAP)
  const height = rowY(rows.length - 1) + HOUSE_H + 220
  const plaza = { x: TOWN_W / 2, y: rowY(0) + HOUSE_H + ROW_GAP / 2, r: 150 }

  const houses: House[] = rows.flatMap((row, r) =>
    row.map((g, i) => {
      const cx = TOWN_W / 2 + (i - (row.length - 1) / 2) * HOUSE_SPACING
      const rect = { x: cx - HOUSE_W / 2, y: rowY(r), w: HOUSE_W, h: HOUSE_H }
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        rect,
        roof: ROOFS[groups.indexOf(g) % ROOFS.length],
        door: { x: cx, y: rect.y + rect.h + 14 },
        tools: g.tools,
      }
    }),
  )

  // Sand paths: one from each door to the plaza's row, and the row itself.
  const paths: Rect[] = houses.map((h) => {
    const top = Math.min(h.door.y - 20, plaza.y)
    const bottom = Math.max(h.door.y - 20, plaza.y)
    return { x: h.door.x - 34, y: top, w: 68, h: bottom - top }
  })
  const xs = houses.map((h) => h.door.x)
  paths.push({ x: Math.min(...xs) - 34, y: plaza.y - 34, w: Math.max(...xs) - Math.min(...xs) + 68, h: 68 })

  const random = rng(20261007)
  const trees: Tree[] = []
  for (let n = 0; n < 1500 && trees.length < 80; n++) {
    const p = { x: 30 + random() * (TOWN_W - 60), y: 50 + random() * (height - 80) }
    if (houses.some((h) => inRect(p, h.rect, 50) || Math.hypot(p.x - h.door.x, p.y - h.door.y) < 110)) continue
    if (paths.some((r) => inRect(p, r, 34))) continue
    if (Math.hypot(p.x - plaza.x, p.y - plaza.y) < plaza.r + 100) continue
    if (trees.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 66)) continue
    const roll = random()
    trees.push({ ...p, kind: roll < 0.5 ? 'tree' : roll < 0.75 ? 'bush' : 'flower', size: 0.8 + random() * 0.5 })
  }

  const fountain = { x: plaza.x, y: plaza.y - 10, r: 58 }
  const town: Town = {
    kind: 'town',
    id: 'town',
    width: TOWN_W,
    height,
    spawn: { x: plaza.x, y: plaza.y + 70 },
    houses,
    paths,
    plaza,
    trees,
    // The roof's top edge is behind the house: the player can walk up to it.
    rects: houses.map((h) => ({ x: h.rect.x + 8, y: h.rect.y + 90, w: h.rect.w - 16, h: h.rect.h - 90 })),
    circles: [fountain, ...trees.filter((t) => t.kind === 'tree').map((t) => ({ x: t.x, y: t.y, r: 13 * t.size }))],
    keepers: [],
    doors: [],
  }

  // --- One room per house.
  const scenes = { town } as Record<SceneId, Scene>
  for (const house of houses) {
    const n = house.tools.length
    const cols = Math.min(3, Math.max(2, n))
    const rowCount = Math.ceil(n / cols)
    const width = cols * ROOM_CELL_W + ROOM_SIDE * 2
    const roomH = ROOM_WALL + rowCount * ROOM_CELL_H + ROOM_BOTTOM
    const keepers = house.tools.map((tool, i) => {
      const row = Math.floor(i / cols)
      const inRow = Math.min(cols, n - row * cols)
      const x = width / 2 + ((i % cols) - (inRow - 1) / 2) * ROOM_CELL_W
      const y = ROOM_WALL + 70 + row * ROOM_CELL_H + 40
      return { tool, home: { x, y }, front: { x, y: y + 48 } }
    })
    const mat = { x: width / 2, y: roomH - WALL_T - 26 }
    const plants = [
      { x: 56, y: ROOM_WALL + 30, r: 18 },
      { x: width - 56, y: ROOM_WALL + 30, r: 18 },
      { x: 56, y: roomH - 70, r: 18 },
      { x: width - 56, y: roomH - 70, r: 18 },
    ]
    scenes[house.id] = {
      kind: 'room',
      id: house.id,
      width,
      height: roomH,
      house,
      wall: ROOM_WALL,
      mat,
      plants,
      spawn: { x: mat.x, y: mat.y - 40 },
      rects: [
        { x: 0, y: 0, w: width, h: ROOM_WALL },
        { x: 0, y: 0, w: WALL_T, h: roomH },
        { x: width - WALL_T, y: 0, w: WALL_T, h: roomH },
        { x: 0, y: roomH - WALL_T, w: width, h: WALL_T },
      ],
      circles: [...plants, ...keepers.map((k) => ({ ...k.home, r: KEEPER_R }))],
      keepers,
      doors: [{ at: mat, dir: 'down', to: 'town', spawn: { x: house.door.x, y: house.door.y + 40 }, label: 'Keluar' }],
    }
    town.doors.push({
      at: house.door,
      dir: 'up',
      to: house.id,
      spawn: { x: mat.x, y: mat.y - 40 },
      label: `Masuk Rumah ${house.title}`,
    })
  }
  return scenes
}

/** Push a round body of radius `r` out of every solid and back inside the scene. */
export function collide(p: Point, r: number, scene: Scene) {
  for (const s of scene.rects) {
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
  for (const c of scene.circles) {
    const dx = p.x - c.x
    const dy = p.y - c.y
    const d = Math.hypot(dx, dy) || 0.001
    if (d < r + c.r) {
      p.x = c.x + (dx / d) * (r + c.r)
      p.y = c.y + (dy / d) * (r + c.r)
    }
  }
  p.x = Math.min(Math.max(p.x, r + 10), scene.width - r - 10)
  p.y = Math.min(Math.max(p.y, r + 30), scene.height - r - 10)
}

const CELL = 20
const grids = new WeakMap<Scene, Uint8Array>()

/** Whether a body of radius `r` centred at `p` would overlap a solid. */
function blocked(p: Point, r: number, scene: Scene) {
  if (p.x < r + 10 || p.y < r + 30 || p.x > scene.width - r - 10 || p.y > scene.height - r - 10) return true
  for (const s of scene.rects) {
    const dx = p.x - Math.min(Math.max(p.x, s.x), s.x + s.w)
    const dy = p.y - Math.min(Math.max(p.y, s.y), s.y + s.h)
    if (dx * dx + dy * dy < r * r) return true
  }
  return scene.circles.some((c) => Math.hypot(p.x - c.x, p.y - c.y) < r + c.r)
}

/**
 * A walkable route from `from` to `to` for a body of radius `r`, as waypoints
 * (A* on a 20px grid, then straightened). Ends at the nearest reachable spot
 * when `to` itself is inside something. Null when there is no way through.
 */
export function findPath(scene: Scene, from: Point, to: Point, r: number): Point[] | null {
  const cols = Math.ceil(scene.width / CELL)
  const rows = Math.ceil(scene.height / CELL)
  let grid = grids.get(scene)
  if (!grid) {
    grid = new Uint8Array(cols * rows)
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) grid[y * cols + x] = blocked({ x: (x + 0.5) * CELL, y: (y + 0.5) * CELL }, r + 2, scene) ? 1 : 0
    grids.set(scene, grid)
  }
  const g = grid
  const cellOf = (p: Point) =>
    Math.min(rows - 1, Math.max(0, Math.floor(p.y / CELL))) * cols + Math.min(cols - 1, Math.max(0, Math.floor(p.x / CELL)))
  const center = (i: number) => ({ x: ((i % cols) + 0.5) * CELL, y: (Math.floor(i / cols) + 0.5) * CELL })

  // Snap blocked endpoints to the nearest open cell.
  const nearestOpen = (i: number) => {
    if (!g[i]) return i
    const c = center(i)
    let best = -1
    let bestD = Infinity
    for (let j = 0; j < g.length; j++) {
      if (g[j]) continue
      const p = center(j)
      const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2
      if (d < bestD) {
        bestD = d
        best = j
      }
    }
    return best
  }
  const start = nearestOpen(cellOf(from))
  const goal = nearestOpen(cellOf(to))
  if (start < 0 || goal < 0) return null

  const cost = new Float32Array(g.length).fill(Infinity)
  const prev = new Int32Array(g.length).fill(-1)
  const open: number[] = [start]
  const score = new Float32Array(g.length).fill(Infinity)
  const gx = goal % cols
  const gy = Math.floor(goal / cols)
  const h = (i: number) => Math.hypot((i % cols) - gx, Math.floor(i / cols) - gy)
  cost[start] = 0
  score[start] = h(start)
  while (open.length) {
    let bi = 0
    for (let i = 1; i < open.length; i++) if (score[open[i]] < score[open[bi]]) bi = i
    const cur = open[bi]
    open[bi] = open[open.length - 1]
    open.pop()
    if (cur === goal) break
    const cx = cur % cols
    const cy = Math.floor(cur / cols)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        const n = ny * cols + nx
        // No squeezing diagonally between two blocked cells.
        if (g[n] || (dx && dy && (g[cy * cols + nx] || g[ny * cols + cx]))) continue
        const c = cost[cur] + (dx && dy ? Math.SQRT2 : 1)
        if (c < cost[n]) {
          if (cost[n] === Infinity) open.push(n)
          cost[n] = c
          prev[n] = cur
          score[n] = c + h(n)
        }
      }
  }
  if (cost[goal] === Infinity) return null

  const cells: Point[] = []
  for (let i = goal; i !== -1; i = prev[i]) cells.unshift(center(i))
  cells[cells.length - 1] = g[cellOf(to)] ? cells[cells.length - 1] : { ...to }

  // Straighten: skip every waypoint the body can walk past in a straight line.
  const clear = (a: Point, b: Point) => {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8)
    for (let s = 1; s < steps; s++)
      if (blocked({ x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps }, r, scene)) return false
    return true
  }
  const path: Point[] = []
  let at = from
  let i = 0
  while (i < cells.length) {
    let j = cells.length - 1
    while (j > i && !clear(at, cells[j])) j--
    path.push(cells[j])
    at = cells[j]
    i = j + 1
  }
  return path
}
