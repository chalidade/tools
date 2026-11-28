// Runs Whisper off the main thread. The model (Whisper base, quantized, from
// Xenova/whisper-base: MIT weights by OpenAI, Apache-2.0 conversion) and the
// ONNX Runtime wasm are bundled with the site and fetched only when this tool
// runs; the service worker keeps them after the first use.

import type { Segment } from './whisper'
import { MODEL_BYTES } from './transcript'

export type Request = { type: 'run'; audio: Float32Array; language: string }
export type Reply =
  | { type: 'download'; loaded: number; total: number }
  | { type: 'loading' }
  | { type: 'language'; code: string }
  | { type: 'progress'; done: number; segments: Segment[] }
  | { type: 'done'; segments: Segment[] }
  | { type: 'error'; message: string }

const post = (r: Reply) => self.postMessage(r)

let engine: Promise<import('./whisper').Whisper> | null = null

async function fetchAll(urls: string[]) {
  let loaded = 0
  const total = MODEL_BYTES
  return Promise.all(
    urls.map(async (url) => {
      const res = await fetch(url)
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const chunks: Uint8Array[] = []
      const reader = res.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        loaded += value.length
        post({ type: 'download', loaded: Math.min(loaded, total), total })
      }
      const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
      let o = 0
      for (const c of chunks) {
        out.set(c, o)
        o += c.length
      }
      return out
    }),
  )
}

function load() {
  engine ??= (async () => {
    const [ort, wasm, enc, dec, vocab, w] = await Promise.all([
      import('onnxruntime-web/wasm'),
      import('onnxruntime-web/ort-wasm-simd-threaded.wasm?url'),
      import('./model/encoder_model_quantized.onnx?url'),
      import('./model/decoder_model_merged_quantized.onnx?url'),
      import('./model/vocab.json?url'),
      import('./whisper'),
    ])
    // The bundled wasm, never a CDN. One thread: the page is not cross-origin isolated.
    ort.env.wasm.wasmPaths = { wasm: wasm.default }
    ort.env.wasm.numThreads = 1
    ort.env.logLevel = 'error'
    const [encoder, decoder, vocabBytes] = await fetchAll([enc.default, dec.default, vocab.default])
    post({ type: 'loading' })
    return w.Whisper.create(ort, encoder, decoder, JSON.parse(new TextDecoder().decode(vocabBytes)), w.SPECS.base)
  })().catch((e) => {
    engine = null
    throw e
  })
  return engine
}

self.onmessage = async (e: MessageEvent<Request>) => {
  const msg = e.data
  if (msg.type !== 'run') return
  try {
    const whisper = await load()
    const segments = await whisper.transcribe(msg.audio, {
      language: msg.language,
      onLanguage: (code) => post({ type: 'language', code }),
      onProgress: (done, segs) => post({ type: 'progress', done, segments: segs }),
    })
    post({ type: 'done', segments })
  } catch (err) {
    post({ type: 'error', message: String((err as Error)?.message ?? err) })
  }
}
