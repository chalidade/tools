// Object removal with MI-GAN (MIT, Picsart AI Research), the same model and
// method as toowl.my.id/tools/remove-object (src/tools/remove-object/inpaint.ts),
// ported from canvas to sharp: each masked area gets its own window (the area
// plus context) resized to 512×512, filled by the model, scaled back and
// blended in only where it was masked, so the rest keeps full resolution.

import fs from 'node:fs/promises'
import path from 'node:path'
import * as ort from 'onnxruntime-node'
import sharp from 'sharp'

const MODEL = process.env.TOOWL_MIGAN_MODEL ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), '../model/migan.onnx')
const SIZE = 512

let session
export function loadModel() {
  session ??= fs.readFile(MODEL).then((bytes) => ort.InferenceSession.create(bytes, { graphOptimizationLevel: 'all' }))
  return session
}

/** Grows a binary mask by `r` px (square structuring element, two 1-D passes). */
function dilate(mask, w, h, r) {
  if (r <= 0) return mask
  const tmp = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = y * w
    let last = -Infinity
    for (let x = 0; x < w; x++) {
      if (mask[row + x]) last = x
      if (x - last <= r) tmp[row + x] = 1
    }
    last = Infinity
    for (let x = w - 1; x >= 0; x--) {
      if (mask[row + x]) last = x
      if (last - x <= r) tmp[row + x] = 1
    }
  }
  const out = new Uint8Array(w * h)
  for (let x = 0; x < w; x++) {
    let last = -Infinity
    for (let y = 0; y < h; y++) {
      if (tmp[y * w + x]) last = y
      if (y - last <= r) out[y * w + x] = 1
    }
    last = Infinity
    for (let y = h - 1; y >= 0; y--) {
      if (tmp[y * w + x]) last = y
      if (last - y <= r) out[y * w + x] = 1
    }
  }
  return out
}

/** Box blur of a 0/1 mask into 0..1 weights. */
function feather(mask, w, h, r) {
  const a = new Float32Array(w * h)
  for (let i = 0; i < a.length; i++) a[i] = mask[i]
  if (r <= 0) return a
  const b = new Float32Array(w * h)
  const n = 2 * r + 1
  for (let y = 0; y < h; y++) {
    const row = y * w
    let sum = 0
    for (let x = -r; x <= r; x++) sum += a[row + Math.min(w - 1, Math.max(0, x))]
    for (let x = 0; x < w; x++) {
      b[row + x] = sum / n
      sum += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let y = -r; y <= r; y++) sum += b[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) {
      a[y * w + x] = sum / n
      sum += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]
    }
  }
  return a
}

function contextWindow(b, w, h, isWindow = false) {
  const side = isWindow ? Math.max(b.w, b.h) : Math.max(Math.round(Math.max(b.w, b.h) * 1.8), SIZE)
  const cw = Math.min(w, side)
  const ch = Math.min(h, side)
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const x = Math.round(Math.min(w - cw, Math.max(0, cx - cw / 2)))
  const y = Math.round(Math.min(h - ch, Math.max(0, cy - ch / 2)))
  return { x, y, w: cw, h: ch }
}

/** Windows around the masked areas (connected on a coarse grid), merged where they overlap. */
function windows(mask, w, h) {
  const cell = Math.max(4, Math.round(Math.max(w, h) / 256))
  const gw = Math.ceil(w / cell)
  const gh = Math.ceil(h / cell)
  const grid = new Uint8Array(gw * gh)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) grid[((y / cell) | 0) * gw + ((x / cell) | 0)] = 1
  const boxes = []
  const seen = new Uint8Array(gw * gh)
  const stack = []
  for (let start = 0; start < grid.length; start++) {
    if (!grid[start] || seen[start]) continue
    let x0 = gw, y0 = gh, x1 = 0, y1 = 0
    seen[start] = 1
    stack.push(start)
    while (stack.length) {
      const i = stack.pop()
      const gx = i % gw
      const gy = (i / gw) | 0
      x0 = Math.min(x0, gx); y0 = Math.min(y0, gy); x1 = Math.max(x1, gx); y1 = Math.max(y1, gy)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx
          const ny = gy + dy
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
          const j = ny * gw + nx
          if (grid[j] && !seen[j]) {
            seen[j] = 1
            stack.push(j)
          }
        }
    }
    boxes.push({ x: x0 * cell, y: y0 * cell, w: (x1 - x0 + 1) * cell, h: (y1 - y0 + 1) * cell })
  }
  let rects = boxes.map((b) => contextWindow(b, w, h))
  for (let merged = true; merged; ) {
    merged = false
    outer: for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]
        const b = rects[j]
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
          const x = Math.min(a.x, b.x)
          const y = Math.min(a.y, b.y)
          const u = { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
          rects = rects.filter((_, k) => k !== i && k !== j)
          rects.push(contextWindow(u, w, h, true))
          merged = true
          break outer
        }
      }
  }
  return rects
}

const crop = (rgb, W, r) => {
  const out = Buffer.alloc(r.w * r.h * 3)
  for (let y = 0; y < r.h; y++) rgb.copy(out, y * r.w * 3, ((r.y + y) * W + r.x) * 3, ((r.y + y) * W + r.x + r.w) * 3)
  return out
}

/**
 * Fills the masked pixels of an RGB image in place.
 * @param {Buffer} rgb  W×H×3
 * @param {Uint8Array} paint  W×H, non-zero = remove
 * @returns {number} areas filled
 */
export async function inpaint(rgb, W, H, paint) {
  const s = await loadModel()
  const grow = Math.max(2, Math.round(Math.max(W, H) / 400))
  const hole = dilate(paint, W, H, grow)
  const rects = windows(hole, W, H)
  for (const r of rects) {
    const before = crop(rgb, W, r)
    const px = await sharp(before, { raw: { width: r.w, height: r.h, channels: 3 } })
      .resize(SIZE, SIZE, { fit: 'fill', kernel: 'lanczos3' })
      .raw()
      .toBuffer()
    const holeCrop = new Uint8Array(r.w * r.h)
    for (let y = 0; y < r.h; y++) holeCrop.set(hole.subarray((r.y + y) * W + r.x, (r.y + y) * W + r.x + r.w), y * r.w)
    const m = new Uint8Array(SIZE * SIZE)
    for (let y = 0; y < SIZE; y++) {
      const sy = Math.min(r.h - 1, Math.floor(((y + 0.5) * r.h) / SIZE))
      for (let x = 0; x < SIZE; x++) {
        const sx = Math.min(r.w - 1, Math.floor(((x + 0.5) * r.w) / SIZE))
        m[y * SIZE + x] = holeCrop[sy * r.w + sx]
      }
    }
    const m512 = dilate(m, SIZE, SIZE, Math.ceil(r.w / SIZE))
    const plane = SIZE * SIZE
    const input = new Float32Array(4 * plane)
    for (let i = 0; i < plane; i++) {
      const known = m512[i] ? 0 : 1
      input[i] = known - 0.5
      input[plane + i] = known * ((px[i * 3] / 255) * 2 - 1)
      input[2 * plane + i] = known * ((px[i * 3 + 1] / 255) * 2 - 1)
      input[3 * plane + i] = known * ((px[i * 3 + 2] / 255) * 2 - 1)
    }
    const res = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', input, [1, 4, SIZE, SIZE]) })
    const data = res[s.outputNames[0]].data
    const out = Buffer.alloc(plane * 3)
    for (let i = 0; i < plane; i++)
      for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.max(0, Math.min(255, Math.round(data[c * plane + i] * 127.5 + 127.5)))
    const filled = await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 3 } })
      .resize(r.w, r.h, { fit: 'fill', kernel: 'lanczos3' })
      .raw()
      .toBuffer()
    const alpha = feather(holeCrop, r.w, r.h, Math.max(1, grow >> 1))
    for (let i = 0; i < r.w * r.h; i++) {
      const gx = r.x + (i % r.w)
      const gy = r.y + ((i / r.w) | 0)
      const k = paint[gy * W + gx] ? 1 : alpha[i]
      if (!k) continue
      const j = (gy * W + gx) * 3
      for (let c = 0; c < 3; c++) rgb[j + c] = Math.round(rgb[j + c] + (filled[i * 3 + c] - rgb[j + c]) * k)
    }
  }
  return rects.length
}

/** Mask image (white/opaque = remove) → W×H bytes. Its size may differ: it is stretched to the photo. */
export async function maskFromImage(bytes, W, H) {
  const { data, info } = await sharp(bytes, { failOn: 'none' })
    .rotate()
    .resize(W, H, { fit: 'fill', kernel: 'nearest' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const mask = new Uint8Array(W * H)
  // White on black, or an opaque stroke on a transparent layer, both count.
  let transparentLayer = false
  for (let i = 0; i < W * H && !transparentLayer; i++) if (data[i * info.channels + 3] < 128) transparentLayer = true
  for (let i = 0; i < W * H; i++) {
    const o = i * info.channels
    const lum = (data[o] + data[o + 1] + data[o + 2]) / 3
    mask[i] = transparentLayer ? (data[o + 3] >= 128 ? 1 : 0) : lum >= 128 ? 1 : 0
  }
  return mask
}

/** Boxes {x, y, width, height} in px, or in % of the photo when `unit` is "percent". */
export function maskFromBoxes(boxes, W, H, unit = 'px') {
  const mask = new Uint8Array(W * H)
  for (const b of boxes) {
    const k = unit === 'percent' ? [W / 100, H / 100] : [1, 1]
    const x0 = Math.max(0, Math.floor(Number(b.x) * k[0]))
    const y0 = Math.max(0, Math.floor(Number(b.y) * k[1]))
    const x1 = Math.min(W, Math.ceil((Number(b.x) + Number(b.width ?? b.w)) * k[0]))
    const y1 = Math.min(H, Math.ceil((Number(b.y) + Number(b.height ?? b.h)) * k[1]))
    if (!(x1 > x0 && y1 > y0)) throw new Error(`Bad box ${JSON.stringify(b)}: needs x, y, width, height inside the photo.`)
    for (let y = y0; y < y1; y++) mask.fill(1, y * W + x0, y * W + x1)
  }
  return mask
}
