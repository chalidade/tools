// One-tap background removal: U²-Net-P (Apache-2.0, 4.6 MB) run with ONNX
// Runtime Web — WebGPU when the browser has it, WebAssembly otherwise. Model
// and runtime are bundled with the site and fetched only when this mode runs;
// the photo never leaves the device. The model sees a 320×320 copy and returns
// a saliency map, which `saliencyToMask` scales back up to the photo's size.

import type { InferenceSession, Tensor } from 'onnxruntime-web'
import { newCanvas } from '@/lib/image'

export const MODEL_SIZE = 320
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]

interface Engine {
  session: InferenceSession
  Tensor: typeof Tensor
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
      import('./u2netp.onnx?url'),
    ])
    // Point the runtime at the bundled wasm; by default it may look next to the script or on a CDN.
    ort.env.wasm.wasmPaths = { wasm: wasm.default }
    ort.env.logLevel = 'error'
    const bytes = new Uint8Array(await (await fetch(model.default)).arrayBuffer())
    if (await hasWebGpu()) {
      try {
        const session = await ort.InferenceSession.create(bytes, { executionProviders: ['webgpu'] })
        return { session, Tensor: ort.Tensor }
      } catch {
        // Some GPUs/drivers fail to compile the shaders: fall back to the CPU.
      }
    }
    const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] })
    return { session, Tensor: ort.Tensor }
  })().catch((e) => {
    engine = null
    throw e
  })
  return engine
}

/** RGBA pixels (already scaled to MODEL_SIZE²) → the model's normalised CHW float input. */
export function toInput(rgba: Uint8ClampedArray) {
  const n = MODEL_SIZE * MODEL_SIZE
  let max = 1
  for (let p = 0; p < n * 4; p += 4) max = Math.max(max, rgba[p], rgba[p + 1], rgba[p + 2])
  const input = new Float32Array(3 * n)
  for (let i = 0, p = 0; i < n; i++, p += 4)
    for (let c = 0; c < 3; c++) input[c * n + i] = (rgba[p + c] / max - MEAN[c]) / STD[c]
  return input
}

/**
 * The model's MODEL_SIZE² map (0–1) → a W×H mask, 255 = keep. The map is
 * stretched to the full 0–1 range, scaled up bilinearly, then pushed through
 * a smooth step so the edge is firm but not jagged.
 */
export function saliencyToMask(map: Float32Array, W: number, H: number) {
  const S = MODEL_SIZE
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < S * S; i++) {
    lo = Math.min(lo, map[i])
    hi = Math.max(hi, map[i])
  }
  const span = hi - lo || 1
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    const fy = Math.min(S - 1, Math.max(0, ((y + 0.5) * S) / H - 0.5))
    const y0 = Math.floor(fy)
    const y1 = Math.min(S - 1, y0 + 1)
    const wy = fy - y0
    for (let x = 0; x < W; x++) {
      const fx = Math.min(S - 1, Math.max(0, ((x + 0.5) * S) / W - 0.5))
      const x0 = Math.floor(fx)
      const x1 = Math.min(S - 1, x0 + 1)
      const wx = fx - x0
      const top = map[y0 * S + x0] * (1 - wx) + map[y0 * S + x1] * wx
      const bottom = map[y1 * S + x0] * (1 - wx) + map[y1 * S + x1] * wx
      const p = ((top * (1 - wy) + bottom * wy) - lo) / span
      const k = Math.min(1, Math.max(0, (p - 0.25) / 0.5))
      out[y * W + x] = Math.round(k * k * (3 - 2 * k) * 255)
    }
  }
  return out
}

/** Runs the model on a photo and returns its keep-mask (255 = subject). */
export async function segment(rgba: Uint8ClampedArray, W: number, H: number) {
  const { session, Tensor } = await loadEngine()
  const full = newCanvas(W, H)
  full.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), W, H), 0, 0)
  const small = newCanvas(MODEL_SIZE, MODEL_SIZE)
  const sctx = small.getContext('2d', { willReadFrequently: true })!
  sctx.imageSmoothingQuality = 'high'
  sctx.drawImage(full, 0, 0, MODEL_SIZE, MODEL_SIZE)
  const input = toInput(sctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data)
  const results = await session.run({ [session.inputNames[0]]: new Tensor('float32', input, [1, 3, MODEL_SIZE, MODEL_SIZE]) })
  const first = results[session.outputNames[0]]
  const map = (await first.getData()) as Float32Array
  first.dispose()
  return saliencyToMask(map, W, H)
}
