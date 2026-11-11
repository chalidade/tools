// RNNoise (https://jmvalin.ca/demo/rnnoise/) — a small recurrent network that
// removes steady background noise (hum, hiss, fans, traffic) from speech.
// Jitsi's wasm build: ~110 KB, served from this site, loaded only when needed.

/** RNNoise works on 10 ms frames of 48 kHz mono audio. */
export const RATE = 48_000
export const FRAME = 480

interface RnnoiseModule {
  HEAPF32: Float32Array
  _malloc(bytes: number): number
  _free(ptr: number): void
  _rnnoise_create(model?: number): number
  _rnnoise_destroy(state: number): void
  _rnnoise_process_frame(state: number, out: number, input: number): number
}

let loading: Promise<RnnoiseModule> | null = null

export function loadRnnoise(): Promise<RnnoiseModule> {
  loading ??= Promise.all([
    import('@jitsi/rnnoise-wasm/dist/rnnoise.js'),
    import('@jitsi/rnnoise-wasm/dist/rnnoise.wasm?url'),
  ]).then(([{ default: create }, { default: wasmUrl }]) => create({ locateFile: () => wasmUrl }) as Promise<RnnoiseModule>)
  loading.catch(() => (loading = null))
  return loading
}

/** One RNNoise state per channel; `process` denoises a frame in place. Call `destroy` when done. */
export function rnnoiseChannels(mod: RnnoiseModule, channels: number) {
  const bytes = FRAME * 4
  const buf = mod._malloc(bytes * 2)
  const states = Array.from({ length: channels }, () => mod._rnnoise_create())
  return {
    process(channel: number, frame: Float32Array) {
      // Read HEAPF32 each time: it is replaced when wasm memory grows.
      const heap = mod.HEAPF32
      const inAt = buf / 4
      const outAt = inAt + FRAME
      // RNNoise expects 16-bit sample values, not -1..1.
      for (let i = 0; i < FRAME; i++) heap[inAt + i] = frame[i] * 32768
      mod._rnnoise_process_frame(states[channel], buf + bytes, buf)
      for (let i = 0; i < FRAME; i++) frame[i] = heap[outAt + i] / 32768
    },
    destroy() {
      states.forEach((s) => mod._rnnoise_destroy(s))
      mod._free(buf)
    },
  }
}

/**
 * Streams audio through a frame denoiser (FRAME samples a call, in place).
 * The model's own latency (`delay` samples) is dropped here, so output sample
 * n lines up with input sample n and a video keeps its lip sync. `mix` (0–1)
 * blends the cleaned signal with the original, for a gentler result.
 *
 * `keepHighs`: RNNoise dulls speech above ~6 kHz (measured −4 to −9 dB on a
 * voice-over), so only the band below SPLIT comes from it. The band above is
 * the original's, scaled each frame by how much the model kept: full during
 * speech, down with it in pauses — sibilance and air survive, hiss still goes.
 */
const SPLIT = 6000

/** 2nd-order Butterworth low-pass; `x - lowpass(x)` is the exactly complementary high band. */
class Lowpass {
  private b0: number
  private a1: number
  private a2: number
  private x1 = 0
  private x2 = 0
  private y1 = 0
  private y2 = 0

  constructor(fc: number, rate: number) {
    const k = Math.tan((Math.PI * fc) / rate)
    const norm = 1 / (1 + Math.SQRT2 * k + k * k)
    this.b0 = k * k * norm
    this.a1 = 2 * (k * k - 1) * norm
    this.a2 = (1 - Math.SQRT2 * k + k * k) * norm
  }

  run(x: number) {
    const y = this.b0 * (x + 2 * this.x1 + this.x2) - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1
    this.x1 = x
    this.y2 = this.y1
    this.y1 = y
    return y
  }
}

export interface DenoiserOptions {
  /** 0–1, see above. */
  mix: number
  /** The model's latency in samples. */
  delay: number
  keepHighs: boolean
}

export class Denoiser {
  private pending: Float32Array[]
  /** The last `delay` input samples per channel, to line the original up with the output. */
  private history: Float32Array[]
  private lowWet: Lowpass[]
  private lowDry: Lowpass[]
  private gain: number[]
  private fill = 0
  private skip: number
  private taken = 0
  private given = 0

  private channels: number
  private denoise: (channel: number, frame: Float32Array) => void
  private opts: DenoiserOptions

  constructor(channels: number, denoise: (channel: number, frame: Float32Array) => void, opts: DenoiserOptions) {
    this.channels = channels
    this.denoise = denoise
    this.opts = opts
    this.skip = opts.delay
    this.pending = Array.from({ length: channels }, () => new Float32Array(FRAME))
    this.history = Array.from({ length: channels }, () => new Float32Array(opts.delay))
    this.lowWet = Array.from({ length: channels }, () => new Lowpass(SPLIT, RATE))
    this.lowDry = Array.from({ length: channels }, () => new Lowpass(SPLIT, RATE))
    this.gain = Array.from({ length: channels }, () => 1)
  }

  /** Planar input chunk → planar output chunk (lengths differ; the total does not). */
  push(planes: Float32Array[]): Float32Array[] {
    const out: Float32Array[][] = Array.from({ length: this.channels }, () => [])
    const n = planes[0].length
    this.taken += n
    for (let i = 0; i < n; ) {
      const step = Math.min(n - i, FRAME - this.fill)
      for (let c = 0; c < this.channels; c++) this.pending[c].set(planes[c].subarray(i, i + step), this.fill)
      this.fill += step
      i += step
      if (this.fill === FRAME) this.runFrame(out)
    }
    return this.join(out)
  }

  /** The audio still held back: call once after the last chunk. */
  flush(): Float32Array[] {
    const out: Float32Array[][] = Array.from({ length: this.channels }, () => [])
    // Pad the partial frame, then silent frames until the delayed output is all out.
    while (this.given < this.taken) {
      for (const p of this.pending) p.fill(0, this.fill)
      this.fill = FRAME
      this.runFrame(out)
    }
    return this.join(out)
  }

  private runFrame(out: Float32Array[][]) {
    const { mix, delay, keepHighs } = this.opts
    const from = Math.min(this.skip, FRAME)
    const count = Math.min(FRAME - from, this.taken - this.given)
    for (let c = 0; c < this.channels; c++) {
      const input = this.pending[c]
      // The original as it was `delay` samples ago: history, then this frame.
      const line = new Float32Array(delay + FRAME)
      line.set(this.history[c])
      line.set(input, delay)
      const dry = line.subarray(0, FRAME)
      this.history[c] = line.slice(FRAME)
      const wet = input.slice()
      this.denoise(c, wet)
      if (keepHighs) this.restoreHighs(c, wet, dry)
      if (mix < 1) for (let i = 0; i < FRAME; i++) wet[i] = wet[i] * mix + dry[i] * (1 - mix)
      if (count > 0) out[c].push(wet.subarray(from, from + count))
    }
    this.skip -= from
    this.given += Math.max(0, count)
    this.fill = 0
  }

  private restoreHighs(c: number, wet: Float32Array, dry: Float32Array) {
    let ew = 0
    let ed = 0
    for (let i = 0; i < FRAME; i++) {
      ew += wet[i] * wet[i]
      ed += dry[i] * dry[i]
    }
    // How much the model kept; rises at once, falls over ~20 ms so the highs do not click.
    const target = ed > 0 ? Math.sqrt(Math.min(1, ew / ed)) : 1
    const from = this.gain[c]
    const to = target > from ? target : from * 0.6 + target * 0.4
    this.gain[c] = to
    for (let i = 0; i < FRAME; i++) {
      const g = from + ((to - from) * (i + 1)) / FRAME
      wet[i] = this.lowWet[c].run(wet[i]) + (dry[i] - this.lowDry[c].run(dry[i])) * g
    }
  }

  private join(out: Float32Array[][]) {
    return out.map((parts) => {
      const all = new Float32Array(parts.reduce((s, p) => s + p.length, 0))
      let at = 0
      for (const p of parts) all.set(p, (at += p.length) - p.length)
      return all
    })
  }
}
