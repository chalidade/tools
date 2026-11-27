// One VTracer trace in a throwaway worker thread: a wasm panic leaves the
// instance unusable, so nothing is reused between traces.
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { parentPort, workerData } from 'node:worker_threads'
import init, { to_svg } from 'vtracer-wasm'

const require = createRequire(import.meta.url)
const { pixels, width, height, config } = workerData
try {
  const wasm = await readFile(require.resolve('vtracer-wasm/vtracer.wasm'))
  await init({ module_or_path: wasm })
  parentPort.postMessage({ ok: true, svg: to_svg(new Uint8Array(pixels), width, height, config) })
} catch (e) {
  parentPort.postMessage({ ok: false, error: String(e?.message ?? e) })
}
