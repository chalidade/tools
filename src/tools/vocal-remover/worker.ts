// Runs SCNet off the main thread: loads ONNX Runtime and the bundled model
// (WebGPU when the browser has a real GPU adapter, WebAssembly otherwise),
// separates the song and sends the stems back.

import type { InferenceSession, Tensor } from 'onnxruntime-web'
import { separate, type Source } from './separate'

export type Backend = 'webgpu' | 'wasm'

export type Request = { type: 'run'; left: Float32Array; right: Float32Array; overlap: number; sources: Source[] }

export type Reply =
  | { type: 'loading'; loaded: number; total: number }
  | { type: 'progress'; done: number; total: number; backend: Backend }
  | { type: 'done'; stems: Partial<Record<Source | 'instrumental', [Float32Array, Float32Array]>> }
  | { type: 'error'; message: string }

const post = (r: Reply, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(r, transfer)

interface Engine {
  session: InferenceSession
  Tensor: typeof Tensor
  backend: Backend
}

async function gpuAdapter() {
  try {
    type Adapter = { info?: { isFallbackAdapter?: boolean; architecture?: string } }
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<Adapter | null> } }).gpu
    const adapter = gpu && (await gpu.requestAdapter())
    // A software adapter (SwiftShader: WebGPU on the CPU) is far slower than wasm.
    return !!adapter && !adapter.info?.isFallbackAdapter && adapter.info?.architecture !== 'swiftshader'
  } catch {
    return false
  }
}

async function fetchModel(url: string) {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`model: ${res.status}`)
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    post({ type: 'loading', loaded, total })
  }
  const bytes = new Uint8Array(loaded)
  let o = 0
  for (const c of chunks) {
    bytes.set(c, o)
    o += c.length
  }
  return bytes
}

let engine: Promise<Engine> | null = null
function loadEngine() {
  engine ??= (async () => {
    const [ort, wasm, model] = await Promise.all([
      import('onnxruntime-web/webgpu'),
      import('onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url'),
      import('./scnet.fp16.onnx?url'),
    ])
    // The bundled wasm, never a CDN.
    ort.env.wasm.wasmPaths = { wasm: wasm.default }
    ort.env.logLevel = 'error'
    const bytes = await fetchModel(model.default)
    if (await gpuAdapter()) {
      try {
        const session = await ort.InferenceSession.create(bytes, { executionProviders: ['webgpu'], graphOptimizationLevel: 'all' })
        return { session, Tensor: ort.Tensor, backend: 'webgpu' as const }
      } catch {
        // A GPU or driver that cannot build the shaders: the CPU instead.
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

self.onmessage = async (e: MessageEvent<Request>) => {
  const msg = e.data
  try {
    const { session, Tensor, backend } = await loadEngine()
    post({ type: 'progress', done: 0, total: 1, backend })
    const stems = await separate(
      msg.left,
      msg.right,
      async (spec, dims) => {
        const result = (await session.run({ mix_spec: new Tensor('float32', spec, dims) })).stems_spec
        const data = (await result.getData()) as Float32Array
        result.dispose()
        return data
      },
      { overlap: msg.overlap, sources: msg.sources, onProgress: (done, total) => post({ type: 'progress', done, total, backend }) },
    )
    const out: Partial<Record<Source | 'instrumental', [Float32Array, Float32Array]>> = { ...stems }
    // The instrumental is the song less its vocals: whatever the model did not call vocals stays in it.
    if (stems.vocals) {
      const [vl, vr] = stems.vocals
      const il = new Float32Array(vl.length)
      const ir = new Float32Array(vr.length)
      for (let i = 0; i < vl.length; i++) {
        il[i] = msg.left[i] - vl[i]
        ir[i] = msg.right[i] - vr[i]
      }
      out.instrumental = [il, ir]
    }
    post(
      { type: 'done', stems: out },
      Object.values(out).flatMap((p) => p.map((c) => c.buffer)),
    )
  } catch (err) {
    post({ type: 'error', message: String((err as Error)?.message ?? err) })
  }
}
