// Vectorizing with VTracer (visioncortex, MIT) compiled to wasm by the
// `vtracer-wasm` package (MIT). Its wasm is bundled by Vite (`?url`) and
// handed to the worker, so nothing is fetched from anywhere else.
//
// This build passes its options straight into VTracer's internal
// `ConverterConfig`, not the friendlier `Config` of the VTracer app, so:
// - `cornerThreshold` and `spliceThreshold` are radians, not degrees;
// - `colorPrecision` is the number of bits *dropped* per channel (0–7; 8
//   panics), so a lower number keeps more colours;
// - `filterSpeckle` is an area in pixels (the app squares its slider value).
// A panic leaves the wasm instance unusable, so every trace gets a fresh
// worker that is thrown away afterwards.
import wasmUrl from 'vtracer-wasm/vtracer.wasm?url'

export type TraceMode = 'color' | 'bw'
export type TraceShape = 'spline' | 'polygon' | 'pixel'

export interface TraceOptions {
  mode: TraceMode
  /** Black-and-white: pixels darker than this (0–255) become the shape. */
  threshold: number
  /** Black-and-white: trace the light parts instead. */
  invert: boolean
  /** Colour: 1 (few colours) … 7 (every shade kept). */
  detail: number
  /** Colour: how different (0–255) two layers must be to stay separate. */
  merge: number
  /** Drop specks smaller than this side length in pixels (1–12). */
  speckle: number
  shape: TraceShape
  /** Angles sharper than this many degrees stay corners; the rest become curves. */
  corner: number
}

export const DEFAULTS: TraceOptions = {
  mode: 'color',
  threshold: 128,
  invert: false,
  detail: 5,
  merge: 16,
  speckle: 4,
  shape: 'spline',
  corner: 60,
}

/** What the worker receives. */
export interface TraceJob {
  wasmUrl: string
  pixels: ArrayBuffer
  width: number
  height: number
  options: TraceOptions
}

export type TraceReply = { ok: true; svg: string } | { ok: false; error: string }

const rad = (deg: number) => (deg * Math.PI) / 180

/** VTracer's options for one trace; see the notes at the top of this file. */
export function vtracerConfig(o: TraceOptions) {
  return {
    binary: o.mode === 'bw',
    mode: o.shape,
    hierarchical: 'stacked',
    cornerThreshold: rad(o.corner),
    lengthThreshold: 4,
    maxIterations: 10,
    spliceThreshold: rad(45),
    filterSpeckle: Math.max(1, Math.round(o.speckle * o.speckle)),
    colorPrecision: Math.min(7, Math.max(0, 8 - Math.round(o.detail) - 1)),
    layerDifference: Math.round(o.merge),
    pathPrecision: 2,
  }
}

/**
 * Black-and-white input for VTracer's binary mode, which takes dark pixels as
 * the shape: transparent areas count as white paper, then every pixel becomes
 * pure black or white at the threshold.
 */
export function binarize(px: Uint8Array, threshold: number, invert: boolean) {
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3] / 255
    const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) * a + 255 * (1 - a)
    const ink = invert ? lum >= threshold : lum < threshold
    const v = ink ? 0 : 255
    px[i] = px[i + 1] = px[i + 2] = v
    px[i + 3] = 255
  }
}

export class TraceTimeout extends Error {}
export class TraceFailed extends Error {}

const TIME_LIMIT = 90_000

/**
 * Traces RGBA pixels into an SVG in a throwaway worker. Aborting (a newer
 * setting, leaving the page) terminates the worker at once.
 */
export function traceImage(pixels: Uint8ClampedArray, width: number, height: number, options: TraceOptions, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    const stop = () => {
      clearTimeout(timer)
      worker.terminate()
      signal.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      stop()
      reject(new DOMException('aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      stop()
      reject(new TraceTimeout())
    }, TIME_LIMIT)
    signal.addEventListener('abort', onAbort)
    worker.onmessage = (e: MessageEvent<TraceReply>) => {
      stop()
      if (e.data.ok) resolve(e.data.svg)
      else reject(new TraceFailed(e.data.error))
    }
    worker.onerror = (e) => {
      stop()
      reject(new TraceFailed(e.message))
    }
    const copy = new Uint8Array(pixels).buffer
    const job: TraceJob = { wasmUrl, pixels: copy, width, height, options }
    worker.postMessage(job, [copy])
  })
}

/**
 * Makes VTracer's SVG scale (adds a viewBox), recolours a black-and-white
 * trace, and counts its shapes.
 */
export function finishSvg(svg: string, width: number, height: number, fill: string | null) {
  let out = svg.replace(/<svg ([^>]*?)width="(\d+)" height="(\d+)">/, (_m, attrs: string, w: string, h: string) => {
    return `<svg ${attrs}width="${w}" height="${h}" viewBox="0 0 ${w || width} ${h || height}">`
  })
  if (fill) out = out.replaceAll('fill="#000000"', `fill="${fill}"`)
  const shapes = out.match(/<path/g)?.length ?? 0
  return { svg: out, shapes }
}
