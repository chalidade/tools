// Colour conversions, contrast, scales, and palette extraction. Pure maths,
// sRGB in 0–255.

export interface RGB {
  r: number
  g: number
  b: number
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const round = (v: number, digits = 0) => {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

export const toHex = ({ r, g, b }: RGB) =>
  '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')

export function toHsl({ r, g, b }: RGB) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (!d) return { h: 0, s: 0, l: l * 100 }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s: s * 100, l: l * 100 }
}

export function fromHsl(h: number, s: number, l: number): RGB {
  const sn = clamp(s / 100)
  const ln = clamp(l / 100)
  const k = (n: number) => (n + h / 30) % 12
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 }
}

export function toHsv({ r, g, b }: RGB) {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const { h } = toHsl({ r, g, b })
  return { h, s: max ? ((max - min) / max) * 100 : 0, v: max * 100 }
}

export function toCmyk({ r, g, b }: RGB) {
  const k = 1 - Math.max(r, g, b) / 255
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 }
  const f = (v: number) => ((1 - v / 255 - k) / (1 - k)) * 100
  return { c: f(r), m: f(g), y: f(b), k: k * 100 }
}

// --- OKLab / OKLCH (https://bottosson.github.io/posts/oklab/) ---

const toLinear = (v: number) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const fromLinear = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

export function toOklch({ r, g, b }: RGB) {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.hypot(A, B)
  let H = (Math.atan2(B, A) * 180) / Math.PI
  if (H < 0) H += 360
  return { l: L, c: C, h: C < 1e-4 ? 0 : H }
}

/** OKLCH → sRGB, or null when the colour is outside sRGB. */
function oklchToRgb(L: number, C: number, H: number): RGB | null {
  const A = C * Math.cos((H * Math.PI) / 180)
  const B = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  if (lin.some((v) => v < -1e-4 || v > 1 + 1e-4)) return null
  const [r, g, b] = lin.map((v) => fromLinear(clamp(v)))
  return { r, g, b }
}

/** The closest in-sRGB colour at this lightness and hue: chroma is reduced until it fits. */
function oklchInGamut(L: number, C: number, H: number): RGB {
  const exact = oklchToRgb(L, C, H)
  if (exact) return exact
  let lo = 0
  let hi = C
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (oklchToRgb(L, mid, H)) lo = mid
    else hi = mid
  }
  return oklchToRgb(L, lo, H) ?? { r: L * 255, g: L * 255, b: L * 255 }
}

/** Tailwind-style 50…950 steps with the colour's hue and chroma, evenly spaced in perceived lightness. */
export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
const SCALE_LIGHTNESS = [0.975, 0.935, 0.875, 0.8, 0.71, 0.62, 0.53, 0.45, 0.38, 0.3, 0.22]

export function colorScale(rgb: RGB): RGB[] {
  const { c, h } = toOklch(rgb)
  return SCALE_LIGHTNESS.map((L, i) => {
    // Very light and very dark steps can hold less colour; taper chroma at the ends.
    const taper = i === 0 ? 0.3 : i === 1 ? 0.55 : i === SCALE_LIGHTNESS.length - 1 ? 0.75 : 1
    return oklchInGamut(L, c * taper, h)
  })
}

// --- Contrast (WCAG 2.x) ---

export function luminance({ r, g, b }: RGB) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function contrast(a: RGB, b: RGB) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// --- Formatting & parsing ---

export function formats(rgb: RGB) {
  const hsl = toHsl(rgb)
  const hsv = toHsv(rgb)
  const cmyk = toCmyk(rgb)
  const lch = toOklch(rgb)
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => Math.round(v))
  return [
    { label: 'HEX', value: toHex(rgb).toUpperCase() },
    { label: 'RGB', value: `rgb(${r} ${g} ${b})` },
    { label: 'HSL', value: `hsl(${round(hsl.h)} ${round(hsl.s)}% ${round(hsl.l)}%)` },
    { label: 'OKLCH', value: `oklch(${round(lch.l * 100, 1)}% ${round(lch.c, 3)} ${round(lch.h, 1)})` },
    { label: 'HSV', value: `${round(hsv.h)}°, ${round(hsv.s)}%, ${round(hsv.v)}%` },
    { label: 'CMYK', value: `${round(cmyk.c)}%, ${round(cmyk.m)}%, ${round(cmyk.y)}%, ${round(cmyk.k)}%` },
    { label: 'Flutter', value: `0xFF${toHex(rgb).slice(1).toUpperCase()}` },
  ]
}

/** Numbers in a CSS colour function, accepting commas or spaces and an optional "/ alpha". */
function numbers(body: string) {
  return body
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map((p) => ({ n: parseFloat(p), pct: p.endsWith('%') }))
}

/** Reads HEX (#rgb, #rrggbb, with or without #, alpha ignored), rgb(), hsl(), oklch(), or "r, g, b". */
export function parseColor(input: string): RGB | null {
  const text = input.trim().toLowerCase()
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text)
  if (hex) {
    let h = hex[1]
    if (h.length <= 4) h = [...h].map((c) => c + c).join('')
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
  }
  const fn = /^(rgba?|hsla?|oklch)\((.*)\)$/.exec(text)
  const parts = numbers(fn ? fn[2] : text)
  if (parts.length < 3 || parts.slice(0, 3).some((p) => Number.isNaN(p.n))) return null
  const [a, b, c] = parts
  if (!fn || fn[1].startsWith('rgb')) {
    const v = (p: { n: number; pct: boolean }) => clamp(p.pct ? (p.n / 100) * 255 : p.n, 0, 255)
    return { r: v(a), g: v(b), b: v(c) }
  }
  if (fn[1].startsWith('hsl')) return fromHsl(((a.n % 360) + 360) % 360, b.n, c.n)
  return oklchInGamut(a.pct ? a.n / 100 : a.n, c.pct ? (b.n / 100) * 0.4 : b.n, c.n)
}

// --- Palette ---

/**
 * The main colours of an image: split the pixel box along its widest channel
 * until there are `count` boxes, then average each. Biggest groups first.
 */
export function extractPalette(data: Uint8ClampedArray, count = 8): RGB[] {
  const pixels: number[][] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue // skip transparent
    pixels.push([data[i], data[i + 1], data[i + 2]])
  }
  if (!pixels.length) return []
  let boxes = [pixels]
  while (boxes.length < count) {
    // Split the box with the widest range (weighted by size) next.
    let best = -1
    let bestScore = 0
    let bestChannel = 0
    boxes.forEach((box, i) => {
      if (box.length < 2) return
      for (let ch = 0; ch < 3; ch++) {
        let lo = 255
        let hi = 0
        for (const p of box) {
          if (p[ch] < lo) lo = p[ch]
          if (p[ch] > hi) hi = p[ch]
        }
        const score = (hi - lo) * Math.sqrt(box.length)
        if (score > bestScore) [best, bestScore, bestChannel] = [i, score, ch]
      }
    })
    if (best < 0) break
    // Cut at the mean, not the median: a small cluster of a distinct colour
    // stays together instead of being averaged into its neighbour.
    const box = boxes[best].sort((p, q) => p[bestChannel] - q[bestChannel])
    const mean = box.reduce((s, p) => s + p[bestChannel], 0) / box.length
    const cut = box.findIndex((p) => p[bestChannel] > mean)
    const mid = Math.min(box.length - 1, Math.max(1, cut < 0 ? box.length >> 1 : cut))
    boxes = [...boxes.slice(0, best), box.slice(0, mid), box.slice(mid), ...boxes.slice(best + 1)]
  }
  return boxes
    .sort((a, b) => b.length - a.length)
    .map((box) => {
      const sum = box.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0])
      return { r: sum[0] / box.length, g: sum[1] / box.length, b: sum[2] / box.length }
    })
}
