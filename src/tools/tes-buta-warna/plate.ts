// Procedurally drawn colour-vision plates. Not Ishihara plates: dot layout,
// digits and colours are generated here. Colours of figure and ground are picked
// along approximate confusion lines, then lightness is jittered per dot so
// brightness alone does not give the digit away.

/** Small seeded PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Dot {
  x: number
  y: number
  r: number
}

/** Pack non-overlapping circles inside a circle of radius `R` centred at (R, R). */
export function packDots(R: number, seed: number, rMin = 3.2, rMax = 8.5, tries = 26000): Dot[] {
  const rand = rng(seed)
  const cell = rMax * 2 + 1
  const n = Math.ceil((R * 2) / cell) + 1
  const grid: Dot[][] = Array.from({ length: n * n }, () => [])
  const dots: Dot[] = []
  for (let i = 0; i < tries; i++) {
    const r = rMin + (rMax - rMin) * Math.pow(rand(), 1.6)
    const ang = rand() * Math.PI * 2
    const d = Math.sqrt(rand()) * (R - r - 1)
    const x = R + Math.cos(ang) * d
    const y = R + Math.sin(ang) * d
    const cx = Math.floor(x / cell)
    const cy = Math.floor(y / cell)
    let ok = true
    for (let gy = Math.max(0, cy - 1); gy <= Math.min(n - 1, cy + 1) && ok; gy++) {
      for (let gx = Math.max(0, cx - 1); gx <= Math.min(n - 1, cx + 1); gx++) {
        for (const o of grid[gy * n + gx]) {
          const dx = o.x - x
          const dy = o.y - y
          const m = o.r + r + 0.8
          if (dx * dx + dy * dy < m * m) {
            ok = false
            break
          }
        }
        if (!ok) break
      }
    }
    if (ok) {
      const dot = { x, y, r }
      dots.push(dot)
      grid[cy * n + cx].push(dot)
    }
  }
  return dots
}

export type Axis = 'control' | 'rg' | 'by'

interface Palette {
  figure: [number, number][]
  ground: [number, number][]
}

// [hue°, saturation%]; lightness is shared (see `shade`) so only hue differs.
const PALETTES: Record<Axis, Palette> = {
  // Clearly visible to everyone: dark blue figure on pale yellow-orange.
  control: { figure: [[215, 70], [225, 60]], ground: [[40, 80], [32, 85], [48, 75]] },
  // Red-green (protan/deutan): olive-greens on oranges/rusts.
  rg: { figure: [[95, 45], [82, 50], [105, 40]], ground: [[28, 58], [16, 55], [38, 60], [8, 50]] },
  // Blue-yellow (tritan): violet/blue-greys on greens/teals.
  by: { figure: [[285, 35], [270, 38], [300, 30]], ground: [[160, 38], [175, 35], [145, 38]] },
}

/** CSS colour for a dot. */
export function dotColor(axis: Axis, inside: boolean, rand: () => number): string {
  const p = PALETTES[axis]
  const list = inside ? p.figure : p.ground
  const [h, s] = list[Math.floor(rand() * list.length)]
  const base = axis === 'control' ? (inside ? 32 : 70) : 58
  const l = base + (rand() - 0.5) * (axis === 'control' ? 14 : 22)
  return `hsl(${h} ${s}% ${l.toFixed(1)}%)`
}

export interface Plate {
  axis: Axis
  digit: number
  seed: number
}

/** Fixed test sequence: a control plate first, then red-green and blue-yellow. */
export function buildPlates(seed: number): Plate[] {
  const r = rng(seed)
  const pool = [2, 3, 4, 5, 6, 7, 8, 9]
  const take = () => pool.splice(Math.floor(r() * pool.length), 1)[0]
  const axes: Axis[] = ['control', 'rg', 'rg', 'by', 'rg', 'by', 'rg', 'by', 'rg', 'by']
  // Only 8 distinct digits: re-fill the pool when it runs out.
  return axes.map((axis) => {
    if (!pool.length) pool.push(2, 3, 4, 5, 6, 7, 8, 9)
    return { axis, digit: take(), seed: Math.floor(r() * 1e9) }
  })
}

export interface Verdict {
  rgScore: number
  rgTotal: number
  byScore: number
  byTotal: number
  controlOk: boolean
  rg: 'normal' | 'maybe' | 'unclear'
  by: 'normal' | 'maybe' | 'unclear'
}

function band(score: number, total: number): 'normal' | 'maybe' | 'unclear' {
  if (score >= total - 1) return 'normal'
  if (score <= Math.floor(total / 2) - 1 || score <= 1) return 'maybe'
  return 'unclear'
}

/** `answers[i]` is the digit picked for plate i, or null for "I see no number". */
export function score(plates: Plate[], answers: (number | null)[]): Verdict {
  let rgScore = 0
  let rgTotal = 0
  let byScore = 0
  let byTotal = 0
  let controlOk = true
  plates.forEach((p, i) => {
    const ok = answers[i] === p.digit
    if (p.axis === 'control') controlOk = ok
    else if (p.axis === 'rg') {
      rgTotal++
      if (ok) rgScore++
    } else {
      byTotal++
      if (ok) byScore++
    }
  })
  return { rgScore, rgTotal, byScore, byTotal, controlOk, rg: band(rgScore, rgTotal), by: band(byScore, byTotal) }
}
