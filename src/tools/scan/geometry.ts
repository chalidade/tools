// Document scanning maths, no DOM and no OpenCV: finding the paper in a photo,
// straightening it with a homography, and cleaning it up. Everything works on
// plain RGBA buffers so it can be checked with node.

export interface Pt {
  x: number
  y: number
}
/** Corners in the order top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Pt, Pt, Pt, Pt]
export interface Rgba {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** Solves A·x = b by Gauss–Jordan elimination with partial pivoting. */
export function solveLinear(a: number[][], b: number[]): number[] {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r
    if (Math.abs(m[p][c]) < 1e-12) throw new Error('singular')
    ;[m[c], m[p]] = [m[p], m[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = m[r][c] / m[c][c]
      if (f) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]
    }
  }
  return m.map((row, i) => row[n] / row[i])
}

/** The 3×3 homography (h33 = 1, row-major) that sends each `from[i]` to `to[i]`. */
export function homography(from: Pt[], to: Pt[]): number[] {
  const a: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i]
    const { x: u, y: v } = to[i]
    a.push([x, y, 1, 0, 0, 0, -x * u, -y * u])
    b.push(u)
    a.push([0, 0, 0, x, y, 1, -x * v, -y * v])
    b.push(v)
  }
  return [...solveLinear(a, b), 1]
}

export function applyH(h: number[], p: Pt): Pt {
  const w = h[6] * p.x + h[7] * p.y + h[8]
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w }
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

/** Output size for a straightened quad: average opposite sides, longest side capped at `maxSide`. */
export function outputSize(q: Quad, maxSide: number) {
  let w = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2
  let h = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2
  const k = Math.min(1, maxSide / Math.max(w, h, 1))
  w *= k
  h *= k
  return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) }
}

/** Resamples the quad of `src` into a `width`×`height` rectangle (bilinear). */
export function warpQuad(src: Rgba, q: Quad, width: number, height: number): Rgba {
  // Map output pixels back to the source, so every output pixel gets a value.
  const rect: Pt[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
  const h = homography(rect, q)
  const out = new Uint8ClampedArray(width * height * 4)
  const { data, width: sw, height: sh } = src
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = applyH(h, { x: x + 0.5, y: y + 0.5 })
      const fx = Math.min(Math.max(p.x - 0.5, 0), sw - 1)
      const fy = Math.min(Math.max(p.y - 0.5, 0), sh - 1)
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const x1 = Math.min(x0 + 1, sw - 1)
      const y1 = Math.min(y0 + 1, sh - 1)
      const tx = fx - x0
      const ty = fy - y0
      const i00 = (y0 * sw + x0) * 4
      const i10 = (y0 * sw + x1) * 4
      const i01 = (y1 * sw + x0) * 4
      const i11 = (y1 * sw + x1) * 4
      const o = (y * width + x) * 4
      for (let c = 0; c < 4; c++) {
        const top = data[i00 + c] * (1 - tx) + data[i10 + c] * tx
        const bottom = data[i01 + c] * (1 - tx) + data[i11 + c] * tx
        out[o + c] = top * (1 - ty) + bottom * ty
      }
    }
  }
  return { data: out, width, height }
}

export const defaultQuad = (w: number, h: number, inset = 0.06): Quad => [
  { x: w * inset, y: h * inset },
  { x: w * (1 - inset), y: h * inset },
  { x: w * (1 - inset), y: h * (1 - inset) },
  { x: w * inset, y: h * (1 - inset) },
]

/** Quad area (shoelace). */
export function quadArea(q: Quad) {
  let s = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    s += a.x * b.y - b.x * a.y
  }
  return Math.abs(s) / 2
}

/** True when the four points form a convex quad (so the warp is well defined). */
export function isConvex(q: Quad) {
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    const c = q[(i + 2) % 4]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(cross) < 1e-9) return false
    const s = Math.sign(cross)
    if (sign && s !== sign) return false
    sign = s
  }
  return true
}

function luma(src: Rgba): Uint8Array {
  const g = new Uint8Array(src.width * src.height)
  for (let i = 0, j = 0; i < g.length; i++, j += 4)
    g[i] = (src.data[j] * 77 + src.data[j + 1] * 150 + src.data[j + 2] * 29) >> 8
  return g
}

function boxBlur(g: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Float32Array(w * h)
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    let sum = 0
    for (let x = -r; x <= r; x++) sum += g[y * w + Math.min(Math.max(x, 0), w - 1)]
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / (2 * r + 1)
      sum += g[y * w + Math.min(x + r + 1, w - 1)] - g[y * w + Math.max(x - r, 0)]
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(Math.max(y, 0), h - 1) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / (2 * r + 1)
      sum += tmp[Math.min(y + r + 1, h - 1) * w + x] - tmp[Math.max(y - r, 0) * w + x]
    }
  }
  return out
}

function otsu(g: Uint8Array): number {
  const hist = Array.from({ length: 256 }, () => 0)
  for (const v of g) hist[v]++
  const total = g.length
  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * hist[i]
  let wB = 0
  let sumB = 0
  let best = 0
  let bestT = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = total - wB
    if (!wF) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sumAll - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > best) {
      best = between
      bestT = t
    }
  }
  return bestT
}

/** Largest 4-connected component of `mask` (iterative flood fill), as its pixel indices. */
function largestComponent(mask: Uint8Array, w: number, h: number): number[] {
  const seen = new Uint8Array(w * h)
  let best: number[] = []
  const stack: number[] = []
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || seen[s]) continue
    const comp: number[] = []
    stack.push(s)
    seen[s] = 1
    while (stack.length) {
      const i = stack.pop()!
      comp.push(i)
      const x = i % w
      const y = (i / w) | 0
      const visit = (n: number) => {
        if (mask[n] && !seen[n]) {
          seen[n] = 1
          stack.push(n)
        }
      }
      if (x > 0) visit(i - 1)
      if (x < w - 1) visit(i + 1)
      if (y > 0) visit(i - w)
      if (y < h - 1) visit(i + w)
    }
    if (comp.length > best.length) best = comp
  }
  return best
}

/** Fills holes inside the mask (text on the paper is darker than the paper). */
function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array {
  const outside = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (i: number) => {
    if (!mask[i] && !outside[i]) {
      outside[i] = 1
      stack.push(i)
    }
  }
  for (let x = 0; x < w; x++) {
    push(x)
    push((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    push(y * w)
    push(y * w + w - 1)
  }
  while (stack.length) {
    const i = stack.pop()!
    const x = i % w
    const y = (i / w) | 0
    if (x > 0) push(i - 1)
    if (x < w - 1) push(i + 1)
    if (y > 0) push(i - w)
    if (y < h - 1) push(i + w)
  }
  const filled = new Uint8Array(w * h)
  for (let i = 0; i < filled.length; i++) filled[i] = outside[i] ? 0 : 1
  return filled
}

/**
 * A first guess at where the paper is: the largest blob that is lighter (or,
 * failing that, darker) than its surroundings, reduced to its four extreme
 * corners. Returns null when nothing paper-like stands out, and the caller
 * falls back to a slightly inset rectangle. Corners are in `src` pixels.
 */
export function detectDocument(src: Rgba): Quad | null {
  const scale = Math.min(1, 320 / Math.max(src.width, src.height))
  const w = Math.max(8, Math.round(src.width * scale))
  const h = Math.max(8, Math.round(src.height * scale))
  // Nearest-neighbour shrink is enough for a coarse mask.
  const small = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = ((Math.min(src.height - 1, Math.floor(y / scale)) * src.width) + Math.min(src.width - 1, Math.floor(x / scale))) * 4
      small.set(src.data.subarray(s, s + 4), (y * w + x) * 4)
    }
  const g = boxBlur(luma({ data: small, width: w, height: h }), w, h, 2)
  const t = otsu(g)
  for (const bright of [true, false]) {
    const mask = new Uint8Array(w * h)
    for (let i = 0; i < mask.length; i++) mask[i] = (bright ? g[i] > t : g[i] <= t) ? 1 : 0
    const comp = largestComponent(mask, w, h)
    const frac = comp.length / (w * h)
    if (frac < 0.15 || frac > 0.97) continue
    const compMask = new Uint8Array(w * h)
    for (const i of comp) compMask[i] = 1
    const solid = fillHoles(compMask, w, h)
    let tl = Infinity, br = -Infinity, tr = -Infinity, bl = Infinity
    let pTl = 0, pBr = 0, pTr = 0, pBl = 0
    let area = 0
    for (let i = 0; i < solid.length; i++) {
      if (!solid[i]) continue
      area++
      const x = i % w
      const y = (i / w) | 0
      const sum = x + y
      const diff = x - y
      if (sum < tl) {
        tl = sum
        pTl = i
      }
      if (sum > br) {
        br = sum
        pBr = i
      }
      if (diff > tr) {
        tr = diff
        pTr = i
      }
      if (diff < bl) {
        bl = diff
        pBl = i
      }
    }
    const pt = (i: number): Pt => ({ x: ((i % w) + 0.5) / scale, y: (((i / w) | 0) + 0.5) / scale })
    const q: Quad = [pt(pTl), pt(pTr), pt(pBr), pt(pBl)]
    // A paper-like blob fills most of its own quad; a ragged shape does not.
    if (!isConvex(q) || area / (quadArea(q) * scale * scale) < 0.8) continue
    return q
  }
  return null
}

export type ScanMode = 'color' | 'gray' | 'bw'

/** Applies a scan look in place: stretched colours, grey, or crisp black-and-white. */
export function applyScanMode(img: Rgba, mode: ScanMode): void {
  const { data, width: w, height: h } = img
  if (mode === 'color') {
    // Auto-levels on luma: clip 1 % at each end, stretch the rest.
    const hist = Array.from({ length: 256 }, () => 0)
    for (let i = 0; i < data.length; i += 4) hist[(data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8]++
    const n = w * h
    let lo = 0, hi = 255, acc = 0
    while (lo < 255 && (acc += hist[lo]) < n * 0.01) lo++
    acc = 0
    while (hi > 0 && (acc += hist[hi]) < n * 0.01) hi--
    if (hi - lo < 16) return
    const k = 255 / (hi - lo)
    for (let i = 0; i < data.length; i += 4)
      for (let c = 0; c < 3; c++) data[i + c] = (data[i + c] - lo) * k
    return
  }
  const g = luma(img)
  if (mode === 'gray') {
    // Flatten uneven lighting by dividing by a heavily blurred copy.
    const bg = boxBlur(g, w, h, Math.max(8, Math.round(Math.max(w, h) / 40)))
    for (let i = 0, j = 0; i < g.length; i++, j += 4) {
      const v = Math.min(255, (g[i] / Math.max(bg[i], 1)) * 235)
      data[j] = data[j + 1] = data[j + 2] = v
    }
    return
  }
  // bw: adaptive threshold against the local mean (integral image).
  const r = Math.max(8, Math.round(Math.max(w, h) / 40))
  const bg = boxBlur(g, w, h, r)
  for (let i = 0, j = 0; i < g.length; i++, j += 4) {
    const v = g[i] < bg[i] * 0.88 ? 0 : 255
    data[j] = data[j + 1] = data[j + 2] = v
  }
}
