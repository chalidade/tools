// Object removal in the browser: MI-GAN (MIT, Picsart AI Research), a small
// inpainting GAN trained on Places2 at 512 px, run with ONNX Runtime Web on
// WebGPU when the browser has it, WebAssembly otherwise. The model (26 MB)
// and the runtime are bundled with the site and fetched only when this tool
// runs; nothing leaves the device.
//
// The model sees a fixed 512×512 window. Each painted area gets its own
// window — the area plus surrounding context — resized to 512, filled, scaled
// back and blended into the photo only where it was painted, so the rest of
// the photo keeps its full resolution.

import type { InferenceSession, Tensor } from 'onnxruntime-web'
import { newCanvas } from '@/lib/image'

export type Backend = 'webgpu' | 'wasm'

interface Engine {
  session: InferenceSession
  Tensor: typeof Tensor
  backend: Backend
}

let engine: Promise<Engine> | null = null

async function hasWebGpu() {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
    return !!(gpu && (await gpu.requestAdapter()))
  } catch {
    return false
  }
}

/** Loads ONNX Runtime and the model once; later calls reuse the session. */
export function loadEngine(): Promise<Engine> {
  engine ??= (async () => {
    const [ort, wasm, model] = await Promise.all([
      import('onnxruntime-web/webgpu'),
      import('onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url'),
      import('./migan.onnx?url'),
    ])
    // Point the runtime at the bundled wasm; by default it may look next to the script or on a CDN.
    ort.env.wasm.wasmPaths = { wasm: wasm.default }
    ort.env.logLevel = 'error'
    const bytes = new Uint8Array(await (await fetch(model.default)).arrayBuffer())
    if (await hasWebGpu()) {
      try {
        const session = await ort.InferenceSession.create(bytes, { executionProviders: ['webgpu'], graphOptimizationLevel: 'all' })
        return { session, Tensor: ort.Tensor, backend: 'webgpu' as const }
      } catch {
        // Some GPUs/drivers fail to compile the shaders: fall back to the CPU.
      }
    }
    const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
    return { session, Tensor: ort.Tensor, backend: 'wasm' as const }
  })().catch((e) => {
    engine = null
    throw e
  })
  return engine
}

const SIZE = 512

export class CancelledError extends Error {}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** A changed area of the photo, with its pixels before and after (for undo/redo). */
export interface Patch {
  x: number
  y: number
  before: ImageData
  after: ImageData
}

export interface InpaintOptions {
  /** Receives each filled area as soon as it is written, so a cancelled run can still be undone. */
  patches: Patch[]
  onProgress: (done: number, total: number) => void
  signal: { cancelled: boolean }
}

/** Grows a binary mask by `r` px (square structuring element, two 1-D passes). */
function dilate(mask: Uint8Array, w: number, h: number, r: number) {
  if (r <= 0) return mask
  const tmp = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = y * w
    let last = -Infinity
    // Distance to the nearest set pixel on the left, then on the right.
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

/** Box blur of a 0/1 mask into 0..1 weights, radius `r`, two 1-D passes. */
function feather(mask: Uint8Array, w: number, h: number, r: number) {
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

/** Bounding boxes of the painted areas (connected on a coarse grid), with the windows around them merged where they overlap. */
function windows(mask: Uint8Array, w: number, h: number): Rect[] {
  const cell = Math.max(4, Math.round(Math.max(w, h) / 256))
  const gw = Math.ceil(w / cell)
  const gh = Math.ceil(h / cell)
  const grid = new Uint8Array(gw * gh)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) grid[((y / cell) | 0) * gw + ((x / cell) | 0)] = 1

  const boxes: Rect[] = []
  const seen = new Uint8Array(gw * gh)
  const stack: number[] = []
  for (let start = 0; start < grid.length; start++) {
    if (!grid[start] || seen[start]) continue
    let x0 = gw, y0 = gh, x1 = 0, y1 = 0
    seen[start] = 1
    stack.push(start)
    while (stack.length) {
      const i = stack.pop()!
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

  // A window around each area: the area takes up a bit over half of it, so
  // the model has enough of the scene to continue; never below 512 px of
  // context unless the photo itself is smaller.
  let rects = boxes.map((b) => contextWindow(b, w, h))
  // Overlapping windows become one, so an area is never filled twice from half its context.
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

function contextWindow(b: Rect, w: number, h: number, isWindow = false): Rect {
  const side = isWindow ? Math.max(b.w, b.h) : Math.max(Math.round(Math.max(b.w, b.h) * 1.8), SIZE)
  const cw = Math.min(w, side)
  const ch = Math.min(h, side)
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const x = Math.round(Math.min(w - cw, Math.max(0, cx - cw / 2)))
  const y = Math.round(Math.min(h - ch, Math.max(0, cy - ch / 2)))
  return { x, y, w: cw, h: ch }
}

/**
 * Fills the painted pixels of `canvas` (mask: non-zero = remove, one byte per
 * pixel) and returns what changed so the caller can undo it.
 */
export async function inpaint(canvas: HTMLCanvasElement, paint: Uint8Array, opts: InpaintOptions): Promise<void> {
  const { session, Tensor } = await loadEngine()
  const { width: W, height: H } = canvas
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  // Cover the edge of what was painted (outlines, shadows, anti-aliasing) and blend softly.
  const grow = Math.max(2, Math.round(Math.max(W, H) / 400))
  const hole = dilate(paint, W, H, grow)
  const rects = windows(hole, W, H)
  const { patches } = opts
  opts.onProgress(0, rects.length)

  const small = newCanvas(SIZE, SIZE)
  const sctx = small.getContext('2d', { willReadFrequently: true })!
  sctx.imageSmoothingQuality = 'high'

  for (let n = 0; n < rects.length; n++) {
    if (opts.signal.cancelled) throw new CancelledError()
    const r = rects[n]
    const before = ctx.getImageData(r.x, r.y, r.w, r.h)

    // Image and hole at 512×512.
    sctx.clearRect(0, 0, SIZE, SIZE)
    sctx.drawImage(canvas, r.x, r.y, r.w, r.h, 0, 0, SIZE, SIZE)
    const px = sctx.getImageData(0, 0, SIZE, SIZE).data
    const holeCrop = new Uint8Array(r.w * r.h)
    for (let y = 0; y < r.h; y++) holeCrop.set(hole.subarray((r.y + y) * W + r.x, (r.y + y) * W + r.x + r.w), y * r.w)
    const m = new Uint8Array(SIZE * SIZE)
    // Nearest sampling of the hole, grown by one model pixel so downscaling never leaves a sliver of the object.
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
      input[plane + i] = known * ((px[i * 4] / 255) * 2 - 1)
      input[2 * plane + i] = known * ((px[i * 4 + 1] / 255) * 2 - 1)
      input[3 * plane + i] = known * ((px[i * 4 + 2] / 255) * 2 - 1)
    }
    const results = await session.run({ [session.inputNames[0]]: new Tensor('float32', input, [1, 4, SIZE, SIZE]) })
    const result = results[session.outputNames[0]]
    const data = (await result.getData()) as Float32Array
    result.dispose()

    const out = sctx.createImageData(SIZE, SIZE)
    const o = out.data
    for (let i = 0; i < plane; i++) {
      o[i * 4] = Math.max(0, Math.min(255, Math.round(data[i] * 127.5 + 127.5)))
      o[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(data[plane + i] * 127.5 + 127.5)))
      o[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(data[2 * plane + i] * 127.5 + 127.5)))
      o[i * 4 + 3] = 255
    }
    sctx.putImageData(out, 0, 0)
    // Back to the window's own size.
    const big = newCanvas(r.w, r.h)
    const bctx = big.getContext('2d', { willReadFrequently: true })!
    bctx.imageSmoothingQuality = 'high'
    bctx.drawImage(small, 0, 0, r.w, r.h)
    const filled = bctx.getImageData(0, 0, r.w, r.h).data
    big.width = big.height = 0

    // Blend: fully the fill inside what was painted, softening over the grown edge.
    const alpha = feather(holeCrop, r.w, r.h, Math.max(1, grow >> 1))
    const after = new ImageData(new Uint8ClampedArray(before.data), r.w, r.h)
    const a = after.data
    for (let i = 0; i < r.w * r.h; i++) {
      const k = paint[(r.y + ((i / r.w) | 0)) * W + r.x + (i % r.w)] ? 1 : alpha[i]
      if (!k) continue
      const j = i * 4
      a[j] += (filled[j] - a[j]) * k
      a[j + 1] += (filled[j + 1] - a[j + 1]) * k
      a[j + 2] += (filled[j + 2] - a[j + 2]) * k
    }
    ctx.putImageData(after, r.x, r.y)
    patches.push({ x: r.x, y: r.y, before, after })
    opts.onProgress(n + 1, rects.length)
    await new Promise((res) => setTimeout(res, 0))
  }
  small.width = small.height = 0
}
