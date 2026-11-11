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
 * Streams audio through a frame denoiser. RNNoise outputs each frame one frame
 * late; that delay is dropped here, so output sample n lines up with input
 * sample n and a video keeps its lip sync. `mix` (0–1) blends the cleaned
 * signal with the original, for a gentler result.
 */
export class Denoiser {
  private pending: Float32Array[]
  private dry: Float32Array[]
  private fill = 0
  private frames = 0
  private taken = 0
  private given = 0

  private channels: number
  private denoise: (channel: number, frame: Float32Array) => void
  private mix: number

  constructor(channels: number, denoise: (channel: number, frame: Float32Array) => void, mix: number) {
    this.channels = channels
    this.denoise = denoise
    this.mix = mix
    this.pending = Array.from({ length: channels }, () => new Float32Array(FRAME))
    this.dry = Array.from({ length: channels }, () => new Float32Array(FRAME))
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
    // Pad the partial frame, then one silent frame to push out the delayed one.
    for (let k = 0; k < 2 && this.given < this.taken; k++) {
      for (const p of this.pending) p.fill(0, this.fill)
      this.fill = FRAME
      this.runFrame(out)
    }
    return this.join(out)
  }

  private runFrame(out: Float32Array[][]) {
    const want = this.taken - this.given
    for (let c = 0; c < this.channels; c++) {
      const wet = this.pending[c].slice()
      this.denoise(c, wet)
      if (this.mix < 1) for (let i = 0; i < FRAME; i++) wet[i] = wet[i] * this.mix + this.dry[c][i] * (1 - this.mix)
      // Keep this frame's input to blend with its output, which arrives next frame.
      this.dry[c].set(this.pending[c])
      // Frame 0's output is the delay (silence); never emit past the input length.
      if (this.frames > 0) out[c].push(wet.subarray(0, Math.min(FRAME, want)))
    }
    if (this.frames > 0) this.given += Math.min(FRAME, want)
    this.frames++
    this.fill = 0
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
