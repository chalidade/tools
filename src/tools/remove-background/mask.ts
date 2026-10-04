// Background removal without AI: the visitor picks what goes, and these
// functions edit a mask — one byte per pixel, 255 = keep, 0 = removed.
// Pure functions over typed arrays; nothing leaves the browser.

export type Action = 'erase' | 'restore'

/** Tolerance 0–100 → largest RGB distance that still counts as "the same colour". */
const threshold = (tolerance: number) => (tolerance / 100) * 255

/**
 * Pixels connected to (x, y) whose colour is within `tolerance` of the
 * clicked one — the "magic wand". Returns 1 for selected pixels.
 */
export function floodRegion(rgba: Uint8ClampedArray, W: number, H: number, x: number, y: number, tolerance: number) {
  const region = new Uint8Array(W * H)
  const seed = (y * W + x) * 4
  const [r0, g0, b0] = [rgba[seed], rgba[seed + 1], rgba[seed + 2]]
  const t2 = threshold(tolerance) ** 2
  const near = (i: number) => {
    const p = i * 4
    const dr = rgba[p] - r0
    const dg = rgba[p + 1] - g0
    const db = rgba[p + 2] - b0
    return dr * dr + dg * dg + db * db <= t2
  }
  // Scanline fill: fill a whole run left/right, then queue the rows above and below.
  const stack = [y * W + x]
  while (stack.length) {
    const start = stack.pop()!
    if (region[start]) continue
    const row = Math.floor(start / W) * W
    let l = start
    while (l > row && !region[l - 1] && near(l - 1)) l--
    let r = start
    while (r < row + W - 1 && !region[r + 1] && near(r + 1)) r++
    for (let i = l; i <= r; i++) region[i] = 1
    // One seed per run of matching pixels in the rows above and below, so the
    // stack stays small even on a 4000-pixel-wide background.
    for (const offset of [-W, W]) {
      if (row + offset < 0 || row + offset >= W * H) continue
      let inRun = false
      for (let i = l + offset; i <= r + offset; i++) {
        const open = !region[i] && near(i)
        if (open && !inRun) stack.push(i)
        inRun = open
      }
    }
  }
  return region
}

/** Every pixel in the image within `tolerance` of a colour, connected or not. */
export function colorRegion(rgba: Uint8ClampedArray, rgb: [number, number, number], tolerance: number) {
  const region = new Uint8Array(rgba.length / 4)
  const t2 = threshold(tolerance) ** 2
  for (let i = 0, p = 0; i < region.length; i++, p += 4) {
    const dr = rgba[p] - rgb[0]
    const dg = rgba[p + 1] - rgb[1]
    const db = rgba[p + 2] - rgb[2]
    if (dr * dr + dg * dg + db * db <= t2) region[i] = 1
  }
  return region
}

/** Removes or brings back the selected pixels of a 0/1 region. */
export function applyRegion(mask: Uint8Array, region: Uint8Array, action: Action) {
  const v = action === 'erase' ? 0 : 255
  for (let i = 0; i < mask.length; i++) if (region[i]) mask[i] = v
}

/**
 * Applies a drawn selection (lasso or box). `coverage` is 0–255 per pixel
 * (anti-aliased at the edge); `inside` picks whether the action hits the
 * selection or everything outside it.
 */
export function applyCoverage(mask: Uint8Array, coverage: Uint8Array, action: Action, inside: boolean) {
  for (let i = 0; i < mask.length; i++) {
    const c = (inside ? coverage[i] : 255 - coverage[i]) / 255
    if (!c) continue
    mask[i] = action === 'erase' ? Math.round(mask[i] * (1 - c)) : Math.round(mask[i] + (255 - mask[i]) * c)
  }
}

/**
 * One dab of a round brush at (x, y), radius r. Full strength inside
 * `hardness`·r, fading to nothing at r.
 */
export function stampBrush(mask: Uint8Array, W: number, H: number, x: number, y: number, r: number, hardness: number, action: Action) {
  const inner = r * hardness
  const x0 = Math.max(0, Math.floor(x - r))
  const x1 = Math.min(W - 1, Math.ceil(x + r))
  const y0 = Math.max(0, Math.floor(y - r))
  const y1 = Math.min(H - 1, Math.ceil(y + r))
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const d = Math.hypot(px + 0.5 - x, py + 0.5 - y)
      if (d >= r) continue
      const f = d <= inner ? 1 : (r - d) / (r - inner)
      const i = py * W + px
      mask[i] = action === 'erase' ? Math.min(mask[i], Math.round(255 * (1 - f))) : Math.max(mask[i], Math.round(255 * f))
    }
  }
}

/** A brush stroke from one point to the next, dabbed often enough to look continuous. */
export function strokeBrush(
  mask: Uint8Array,
  W: number,
  H: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  r: number,
  hardness: number,
  action: Action,
) {
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(1, Math.ceil(dist / Math.max(1, r / 4)))
  for (let s = 1; s <= steps; s++) {
    const t = s / steps
    stampBrush(mask, W, H, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, r, hardness, action)
  }
}

export function invert(mask: Uint8Array) {
  for (let i = 0; i < mask.length; i++) mask[i] = 255 - mask[i]
}

/**
 * Grey-level erosion (each pixel takes the smallest value within `radius`
 * px): pulls the edge in. Separable — a row pass then a column pass.
 */
function erode(src: Uint8Array, W: number, H: number, radius: number) {
  const tmp = new Uint8Array(src.length)
  const out = new Uint8Array(src.length)
  for (let y = 0; y < H; y++) {
    const row = y * W
    for (let x = 0; x < W; x++) {
      let m = 255
      const end = Math.min(W - 1, x + radius)
      for (let k = Math.max(0, x - radius); k <= end; k++) if (src[row + k] < m) m = src[row + k]
      tmp[row + x] = m
    }
  }
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - radius)
    const y1 = Math.min(H - 1, y + radius)
    for (let x = 0; x < W; x++) {
      let m = 255
      for (let k = y0; k <= y1; k++) if (tmp[k * W + x] < m) m = tmp[k * W + x]
      out[y * W + x] = m
    }
  }
  return out
}

/** Box blur, horizontal then vertical, run twice (close to a Gaussian). */
function blur(src: Uint8Array, W: number, H: number, radius: number) {
  // Horizontal reads a → b, vertical reads b → a, so the result ends in a.
  const a = new Float32Array(src.length)
  for (let i = 0; i < src.length; i++) a[i] = src[i]
  const b = new Float32Array(src.length)
  const sums = new Float32Array(W)
  const size = radius * 2 + 1
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < H; y++) {
      const row = y * W
      let sum = 0
      for (let x = -radius; x <= radius; x++) sum += a[row + Math.min(W - 1, Math.max(0, x))]
      for (let x = 0; x < W; x++) {
        b[row + x] = sum / size
        sum += a[row + Math.min(W - 1, x + radius + 1)] - a[row + Math.max(0, x - radius)]
      }
    }
    // Vertical: one running sum per column, walking rows in order (cache-friendly).
    sums.fill(0)
    for (let y = -radius; y <= radius; y++) {
      const row = Math.min(H - 1, Math.max(0, y)) * W
      for (let x = 0; x < W; x++) sums[x] += b[row + x]
    }
    for (let y = 0; y < H; y++) {
      const row = y * W
      const add = Math.min(H - 1, y + radius + 1) * W
      const sub = Math.max(0, y - radius) * W
      for (let x = 0; x < W; x++) {
        a[row + x] = sums[x] / size
        sums[x] += b[add + x] - b[sub + x]
      }
    }
  }
  const out = new Uint8Array(src.length)
  for (let i = 0; i < out.length; i++) out[i] = Math.round(a[i])
  return out
}

/** Edge clean-up for the final result: shrink the edge (drops coloured halos), then soften it. */
export function refine(mask: Uint8Array, W: number, H: number, shrink: number, feather: number) {
  let out = mask
  if (shrink > 0) out = erode(out, W, H, shrink)
  if (feather > 0) out = blur(out, W, H, feather)
  return out
}

/**
 * The picture to show or save. 'result' applies the alpha; 'overlay' keeps
 * removed parts faintly visible in red, to see what a brush would restore.
 */
export function compose(rgba: Uint8ClampedArray, alpha: Uint8Array, view: 'result' | 'overlay') {
  const out = new Uint8ClampedArray(rgba.length)
  for (let i = 0, p = 0; i < alpha.length; i++, p += 4) {
    const a = alpha[i]
    if (view === 'overlay' && a < 255) {
      const k = 1 - a / 255
      out[p] = rgba[p] + (230 - rgba[p]) * k * 0.5
      out[p + 1] = rgba[p + 1] * (1 - k * 0.5)
      out[p + 2] = rgba[p + 2] * (1 - k * 0.5)
      out[p + 3] = Math.max(a, 110) * (rgba[p + 3] / 255)
    } else {
      out[p] = rgba[p]
      out[p + 1] = rgba[p + 1]
      out[p + 2] = rgba[p + 2]
      out[p + 3] = (a * rgba[p + 3]) / 255
    }
  }
  return out
}
