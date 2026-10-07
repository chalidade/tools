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

/** Each category gets its own kind of building, in category order (wrapping). */
export type BuildingStyle = 'shop' | 'library' | 'vault' | 'studio' | 'lab' | 'office'
const STYLE_ORDER: BuildingStyle[] = ['shop', 'library', 'vault', 'studio', 'lab', 'office']

/**
 * Size of each building, the height `base` from its top where the solid walls
 * begin (above that is roof the player can walk behind), and its name.
 */
export const BUILDINGS: Record<BuildingStyle, { w: number; h: number; base: number; place: string }> = {
  shop: { w: 300, h: 236, base: 104, place: 'Percetakan' },
  library: { w: 340, h: 256, base: 124, place: 'Perpustakaan' },
  vault: { w: 290, h: 236, base: 104, place: 'Brankas' },
  studio: { w: 320, h: 244, base: 118, place: 'Studio' },
  lab: { w: 340, h: 236, base: 84, place: 'Lab' },
  office: { w: 320, h: 250, base: 60, place: 'Kantor' },
}

export interface House {
  id: CategoryId
  title: string
  description: string
  style: BuildingStyle
  /** What kind of place it is: "Perpustakaan", "Lab"… */
  place: string
  rect: Rect
  /** The category's colour: roofs, awnings, trims, the room's banner. */
  accent: string
  door: Point
  tools: Tool[]
}

export interface Tree {
  x: number
  y: number
  size: number
  kind: 'tree' | 'pine' | 'bush' | 'flower'
}

export interface Ellipse {
  x: number
  y: number
  rx: number
  ry: number
}

export interface Town extends SceneBase {
  kind: 'town'
  houses: House[]
  /** Dirt paths as SVG path data, drawn with a round stroke. */
  paths: string[]
  plaza: Ellipse
  pond: Ellipse
  /** Tall grass patches, aligned to GRASS_TILE. */
  grass: Rect[]
  benches: Rect[]
  lamps: Point[]
  signs: { at: Point; house: House }[]
  beds: Rect[]
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
export const GRASS_TILE = 26
export const PATH_WIDTH = 58

const TOWN_W = 2000
const ROW_H = 260
const ROW_GAP = 540
const HOUSE_SPACING = 600

const ROOM_CELL_W = 210
const ROOM_CELL_H = 170
const ROOM_SIDE = 90
const ROOM_WALL = 150
const ROOM_BOTTOM = 150
const WALL_T = 24

/** Category colours, in category order (wraps for more categories). */
const ACCENTS = ['#e05a4f', '#3f7fd9', '#7c5cd6', '#e0599b', '#2f9e6b', '#e0a43a']

/** Small deterministic PRNG, so the town grows the same way every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

const inRect = (p: Point, r: Rect, pad = 0) =>
  p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad
const inEllipse = (p: Point, e: Ellipse, pad = 0) =>
  ((p.x - e.x) / (e.rx + pad)) ** 2 + ((p.y - e.y) / (e.ry + pad)) ** 2 < 1

/**
 * A smooth curve through `points` (Catmull-Rom as cubic Béziers): the SVG path
 * data, plus points sampled along it so nothing gets planted on the path.
 */
function curve(points: Point[]) {
  let d = `M${points[0].x} ${points[0].y}`
  const samples: Point[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`
    for (let t = 0; t <= 1; t += 0.05) {
      const u = 1 - t
      samples.push({
        x: u ** 3 * p1.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * p2.x,
        y: u ** 3 * p1.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t ** 3 * p2.y,
      })
    }
  }
  return { d, samples }
}

export function buildScenes(): Record<SceneId, Scene> {
  const groups = CATEGORIES.map((c) => ({ ...c, tools: TOOLS.filter((t) => t.category === c.id) })).filter(
    (g) => g.tools.length > 0,
  )
  const random = rng(20261007)
  const jitter = (n: number) => (random() - 0.5) * n

  // --- Buildings in rows of three, bottom-aligned so their doors line up; the plaza between the first two rows.
  const rows: (typeof groups)[] = []
  for (let i = 0; i < groups.length; i += 3) rows.push(groups.slice(i, i + 3))
  const rowY = (r: number) => 190 + r * (ROW_H + ROW_GAP)
  const height = rowY(rows.length - 1) + ROW_H + 250
  const plaza = { x: TOWN_W / 2, y: rowY(0) + ROW_H + ROW_GAP / 2, rx: 175, ry: 125 }

  const houses: House[] = rows.flatMap((row, r) =>
    row.map((g, i) => {
      const index = groups.indexOf(g)
      const style = STYLE_ORDER[index % STYLE_ORDER.length]
      const { w, h, place } = BUILDINGS[style]
      const cx = TOWN_W / 2 + (i - (row.length - 1) / 2) * HOUSE_SPACING
      const rect = { x: cx - w / 2, y: rowY(r) + ROW_H - h, w, h }
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        style,
        place,
        rect,
        accent: ACCENTS[index % ACCENTS.length],
        door: { x: cx, y: rect.y + rect.h + 14 },
        tools: g.tools,
      }
    }),
  )

  // --- Dirt paths, winding from every door to the plaza.
  const onPlaza = (toward: Point, shrink = 0.86) => {
    const a = Math.atan2(toward.y - plaza.y, toward.x - plaza.x)
    return { x: plaza.x + Math.cos(a) * plaza.rx * shrink, y: plaza.y + Math.sin(a) * plaza.ry * shrink }
  }
  // The road out of town runs south from the plaza, unless a building sits right below it.
  const southRoad = !houses.some((h) => h.door.y > plaza.y && Math.abs(h.door.x - plaza.x) < h.rect.w)
  const curves = houses.map((h) => {
    const { door, rect } = h
    if (door.y < plaza.y) {
      const end = onPlaza(door)
      return curve([
        door,
        { x: door.x + jitter(20), y: door.y + 70 },
        { x: (door.x + end.x) / 2 + jitter(60), y: (door.y + end.y) / 2 + 30 + jitter(30) },
        end,
      ])
    }
    // Doors face down, away from the plaza.
    const side = Math.sign(plaza.x - door.x) || 1
    if (southRoad)
      // Wind over to the road south and join it.
      return curve([
        door,
        { x: door.x + side * 16 + jitter(10), y: door.y + 56 },
        { x: (door.x + plaza.x) / 2 + jitter(30), y: door.y + 74 + jitter(16) },
        { x: plaza.x - side * 6, y: door.y + 40 },
      ])
    // No road south (a building stands in its way): loop round the building's inner side up to the plaza.
    const gx = door.x + side * (rect.w / 2 + 60)
    const end = onPlaza({ x: gx, y: rect.y })
    return curve([
      door,
      { x: door.x + side * 24, y: door.y + 54 },
      { x: gx + jitter(12), y: door.y + 24 },
      { x: gx + jitter(16), y: (rect.y + door.y) / 2 },
      { x: gx - side * 16 + jitter(16), y: rect.y - 24 },
      end,
    ])
  })

  const pond = { x: 260, y: plaza.y + 40, rx: 130, ry: 72 }
  curves.push(
    curve([onPlaza({ x: 0, y: plaza.y + 60 }), { x: plaza.x - 420, y: plaza.y + 70 }, { x: pond.x + pond.rx + 10, y: pond.y }]),
  )
  if (southRoad)
    curves.push(
      curve([onPlaza({ x: plaza.x, y: height }), { x: plaza.x + 30, y: plaza.y + 330 }, { x: plaza.x - 10, y: height + 40 }]),
    )
  const pathSamples = curves.flatMap((c) => c.samples)
  const nearPath = (p: Point, pad: number) => pathSamples.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < PATH_WIDTH / 2 + pad)

  const blockedAt = (p: Point, pad: number) =>
    houses.some((h) => inRect(p, h.rect, pad) || Math.hypot(p.x - h.door.x, p.y - h.door.y) < 70 + pad) ||
    nearPath(p, pad) ||
    inEllipse(p, plaza, pad + 55) ||
    inEllipse(p, pond, pad + 10)

  // --- Plaza furniture: benches and lamp posts on its rim, wherever no path arrives.
  const benches: Rect[] = []
  for (const deg of [200, -20, 160, 20, 250, -70]) {
    if (benches.length === 2) break
    const a = (deg * Math.PI) / 180
    const c = { x: plaza.x + Math.cos(a) * (plaza.rx + 52), y: plaza.y + Math.sin(a) * (plaza.ry + 40) }
    if (nearPath(c, 30)) continue
    benches.push({ x: c.x - 32, y: c.y - 10, w: 64, h: 20 })
  }
  const lamps: Point[] = []
  for (let deg = 0; deg < 360; deg += 30) {
    if (lamps.length === 4) break
    const a = ((deg + 15) * Math.PI) / 180
    const c = { x: plaza.x + Math.cos(a) * (plaza.rx + 24), y: plaza.y + Math.sin(a) * (plaza.ry + 18) }
    if (nearPath(c, 14) || benches.some((b) => inRect(c, b, 40)) || lamps.some((l) => Math.hypot(l.x - c.x, l.y - c.y) < 160))
      continue
    lamps.push(c)
  }

  // --- A signpost by every door, and flower beds against the walls.
  const signs = houses.map((h) => ({ at: { x: h.rect.x + h.rect.w + 34, y: h.door.y - 4 }, house: h }))
  const beds: Rect[] = houses.flatMap((h) => [
    { x: h.rect.x + 14, y: h.rect.y + h.rect.h - 4, w: 64, h: 18 },
    { x: h.rect.x + h.rect.w - 78, y: h.rect.y + h.rect.h - 4, w: 64, h: 18 },
  ])

  // --- Tall grass, the kind you rustle through.
  const grass: Rect[] = []
  const T = GRASS_TILE
  for (const c of [
    { x: TOWN_W - 360, y: plaza.y - 90, w: 9, h: 6 },
    { x: plaza.x + 110, y: height - 250, w: 7, h: 5 },
    { x: 120, y: rowY(0) + ROW_H + 30, w: 7, h: 4 },
    { x: plaza.x - 300, y: height - 220, w: 6, h: 4 },
    { x: TOWN_W - 300, y: height - 240, w: 7, h: 5 },
  ]) {
    const r = { x: Math.round(c.x / T) * T, y: Math.round(c.y / T) * T, w: c.w * T, h: c.h * T }
    const corners = [
      { x: r.x, y: r.y },
      { x: r.x + r.w, y: r.y },
      { x: r.x, y: r.y + r.h },
      { x: r.x + r.w, y: r.y + r.h },
      { x: r.x + r.w / 2, y: r.y + r.h / 2 },
    ]
    if (r.x < 60 || r.y < 80 || r.x + r.w > TOWN_W - 60 || r.y + r.h > height - 60) continue
    if (corners.some((p) => blockedAt(p, 6))) continue
    if (pathSamples.some((s) => inRect(s, r, PATH_WIDTH / 2))) continue
    grass.push(r)
  }

  // --- Trees: a dense border around town, then scattered woods, bushes and flowers.
  const trees: Tree[] = []
  const occupied = (p: Point, pad: number) =>
    blockedAt(p, pad) ||
    grass.some((g) => inRect(p, g, 24)) ||
    // Canopies are tall: keep trees well clear of what they could hide.
    benches.some((b) => inRect(p, b, 70)) ||
    lamps.some((l) => Math.hypot(l.x - p.x, l.y - p.y) < 70) ||
    signs.some((s) => Math.hypot(s.at.x - p.x, s.at.y - p.y) < 80)
  const plant = (p: Point, kind: Tree['kind'], size: number, gap: number) => {
    if (occupied(p, kind === 'flower' ? 8 : 26)) return
    if (trees.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < gap)) return
    trees.push({ ...p, kind, size })
  }
  for (let x = 30; x < TOWN_W; x += 62) {
    plant({ x: x + jitter(14), y: 60 + jitter(16) }, random() < 0.4 ? 'pine' : 'tree', 1 + random() * 0.3, 50)
    plant({ x: x + jitter(14), y: height - 26 + jitter(10) }, random() < 0.4 ? 'pine' : 'tree', 1 + random() * 0.3, 50)
  }
  for (let y = 120; y < height - 60; y += 62) {
    plant({ x: 34 + jitter(12), y: y + jitter(14) }, random() < 0.4 ? 'pine' : 'tree', 1 + random() * 0.3, 50)
    plant({ x: TOWN_W - 34 + jitter(12), y: y + jitter(14) }, random() < 0.4 ? 'pine' : 'tree', 1 + random() * 0.3, 50)
  }
  for (let n = 0; n < 2500 && trees.length < 230; n++) {
    const p = { x: 90 + random() * (TOWN_W - 180), y: 130 + random() * (height - 220) }
    const roll = random()
    const kind = roll < 0.3 ? 'tree' : roll < 0.45 ? 'pine' : roll < 0.65 ? 'bush' : 'flower'
    plant(p, kind, 0.8 + random() * 0.5, kind === 'flower' ? 40 : 70)
  }

  const fountain = { x: plaza.x, y: plaza.y - 10, r: 58 }
  const town: Town = {
    kind: 'town',
    id: 'town',
    width: TOWN_W,
    height,
    spawn: { x: plaza.x, y: plaza.y + 70 },
    houses,
    paths: curves.map((c) => c.d),
    plaza,
    pond,
    grass,
    benches,
    lamps,
    signs,
    beds,
    trees,
    // The roof is behind the building: the player can walk up to the walls.
    rects: [
      ...houses.map((h) => {
        const base = BUILDINGS[h.style].base
        return { x: h.rect.x + 8, y: h.rect.y + base, w: h.rect.w - 16, h: h.rect.h - base }
      }),
      ...benches,
    ],
    circles: [
      fountain,
      // The pond as a row of overlapping circles.
      ...[-0.55, -0.2, 0.2, 0.55].map((f) => ({ x: pond.x + f * pond.rx * 1.2, y: pond.y, r: pond.ry * (1 - Math.abs(f) * 0.6) })),
      ...lamps.map((l) => ({ ...l, r: 8 })),
      ...signs.map((s) => ({ ...s.at, r: 8 })),
      ...trees
        .filter((t) => t.kind === 'tree' || t.kind === 'pine')
        .map((t) => ({ x: t.x, y: t.y, r: 13 * t.size })),
    ],
    keepers: [],
    doors: [],
  }

  // --- One room per building.
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
      label: `Masuk ${house.place} · ${house.title}`,
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
