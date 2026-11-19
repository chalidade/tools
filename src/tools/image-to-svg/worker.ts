// Runs one VTracer trace off the main thread; see trace.ts.
import init, { to_svg } from 'vtracer-wasm'
import { binarize, vtracerConfig, type TraceJob, type TraceReply } from './trace'

self.onmessage = async (e: MessageEvent<TraceJob>) => {
  const { wasmUrl, pixels, width, height, options } = e.data
  let reply: TraceReply
  try {
    await init({ module_or_path: wasmUrl })
    const px = new Uint8Array(pixels)
    if (options.mode === 'bw') binarize(px, options.threshold, options.invert)
    reply = { ok: true, svg: to_svg(px, width, height, vtracerConfig(options)) }
  } catch (err) {
    reply = { ok: false, error: String(err) }
  }
  self.postMessage(reply)
}
