// AI upscaling in the browser: Real-ESRGAN's compact general model
// (realesr-general-x4v3, BSD-3-Clause, 4.8 MB) run with ONNX Runtime Web on
// WebGPU when the browser has it, WebAssembly otherwise. The model and the
// runtime are bundled with the site and fetched only when this tool runs.
// The image is processed in overlapping tiles so memory stays small and
// progress can be shown; nothing leaves the device.

import type { InferenceSession, Tensor } from 'onnxruntime-web'
import type { DecodedImage } from '@/lib/image'
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
      import('./realesr-general-x4v3.onnx?url'),
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

const MODEL_SCALE = 4
/** Pixels of context around each tile, so tile seams do not show. */
const PAD = 12

/** Largest input (in pixels) per scale: keeps the result canvas within what browsers can hold. */
export const MAX_INPUT_PIXELS: Record<2 | 4, number> = { 2: 4_000_000, 4: 2_000_000 }

export class CancelledError extends Error {}

export interface UpscaleOptions {
  scale: 2 | 4
  onProgress: (done: number, total: number) => void
  signal: { cancelled: boolean }
}

/**
 * Upscales `image` by 2× or 4×. The model always works at 4×; a 2× result is
 * that output reduced with high-quality smoothing, which is sharper than a
 * 2×-trained small model. Transparency is carried over by scaling the alpha
 * channel smoothly.
 */
export async function upscale(image: DecodedImage, opts: UpscaleOptions): Promise<HTMLCanvasElement> {
  const { session, Tensor, backend } = await loadEngine()
  const { width: w, height: h } = image
  const src = newCanvas(w, h)
  const sctx = src.getContext('2d', { willReadFrequently: true })!
  sctx.drawImage(image.source, 0, 0, w, h)
  const pixels = sctx.getImageData(0, 0, w, h).data
  let hasAlpha = false
  for (let i = 3; i < pixels.length; i += 4)
    if (pixels[i] < 255) {
      hasAlpha = true
      break
    }

  const out = newCanvas(w * MODEL_SCALE, h * MODEL_SCALE)
  const octx = out.getContext('2d')!
  // GPUs like bigger tiles; on the CPU smaller tiles keep the page responsive between them.
  const tile = backend === 'webgpu' ? 256 : 96
  const cols = Math.ceil(w / tile)
  const rows = Math.ceil(h / tile)
  const total = cols * rows
  let done = 0
  opts.onProgress(0, total)

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      if (opts.signal.cancelled) throw new CancelledError()
      const x0 = tx * tile
      const y0 = ty * tile
      const x1 = Math.min(w, x0 + tile)
      const y1 = Math.min(h, y0 + tile)
      // The tile plus its padding, clamped to the image.
      const px0 = Math.max(0, x0 - PAD)
      const py0 = Math.max(0, y0 - PAD)
      const px1 = Math.min(w, x1 + PAD)
      const py1 = Math.min(h, y1 + PAD)
      const tw = px1 - px0
      const th = py1 - py0
      const input = new Float32Array(3 * tw * th)
      const plane = tw * th
      for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
          const s = ((py0 + y) * w + (px0 + x)) * 4
          const d = y * tw + x
          input[d] = pixels[s] / 255
          input[plane + d] = pixels[s + 1] / 255
          input[2 * plane + d] = pixels[s + 2] / 255
        }
      }
      const feeds = { [session.inputNames[0]]: new Tensor('float32', input, [1, 3, th, tw]) }
      const results = await session.run(feeds)
      const result = results[session.outputNames[0]]
      const data = (await result.getData()) as Float32Array
      result.dispose()
      const ow = tw * MODEL_SCALE
      const oplane = ow * th * MODEL_SCALE
      // Keep only the tile's own area of the output, without the padding.
      const cx = (x0 - px0) * MODEL_SCALE
      const cy = (y0 - py0) * MODEL_SCALE
      const cw = (x1 - x0) * MODEL_SCALE
      const ch = (y1 - y0) * MODEL_SCALE
      const img = octx.createImageData(cw, ch)
      const o = img.data
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const s = (cy + y) * ow + (cx + x)
          const d = (y * cw + x) * 4
          o[d] = Math.max(0, Math.min(255, Math.round(data[s] * 255)))
          o[d + 1] = Math.max(0, Math.min(255, Math.round(data[oplane + s] * 255)))
          o[d + 2] = Math.max(0, Math.min(255, Math.round(data[2 * oplane + s] * 255)))
          o[d + 3] = 255
        }
      }
      octx.putImageData(img, x0 * MODEL_SCALE, y0 * MODEL_SCALE)
      done++
      opts.onProgress(done, total)
      // Let the page paint the progress bar.
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  if (hasAlpha) {
    octx.globalCompositeOperation = 'destination-in'
    octx.imageSmoothingQuality = 'high'
    octx.drawImage(src, 0, 0, out.width, out.height)
    octx.globalCompositeOperation = 'source-over'
  }
  src.width = src.height = 0
  if (opts.scale === MODEL_SCALE) return out

  const half = newCanvas(w * opts.scale, h * opts.scale)
  const hctx = half.getContext('2d')!
  hctx.imageSmoothingEnabled = true
  hctx.imageSmoothingQuality = 'high'
  hctx.drawImage(out, 0, 0, half.width, half.height)
  out.width = out.height = 0
  return half
}
