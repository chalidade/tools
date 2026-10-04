// Audio speed change on raw samples, streamed chunk by chunk so long files
// never sit in memory whole. Planar float32: one array per channel.

/** Changes speed by any factor; implementations keep their own state between chunks. */
export interface SpeedProcessor {
  push(planes: Float32Array[]): Float32Array[]
  /** Whatever is still buffered, once the input has ended. */
  flush(): Float32Array[]
}

/**
 * Time-stretch that keeps the pitch: WSOLA (waveform-similarity overlap-add).
 * Output is built from Hann-windowed frames at a fixed hop; each frame is
 * taken from the input near where the speed says it should be, nudged to
 * where the waveform best continues the previous frame, so no clicks or
 * phasing appear where frames overlap.
 */
export class TimeStretch implements SpeedProcessor {
  private readonly hop: number // output hop (half a frame)
  private readonly size: number // frame length
  private readonly window: Float32Array
  private readonly delta: number // how far a frame may move to line up
  private buf: Float32Array[]
  private bufLen = 0
  private bufStart = 0 // absolute input index of buf[*][0]
  private ended = false
  private frame = 0
  private prevPos = 0
  private tail: Float32Array[]
  private readonly channels: number
  private readonly speed: number

  constructor(channels: number, sampleRate: number, speed: number) {
    this.channels = channels
    this.speed = speed
    this.hop = Math.round(sampleRate * 0.025)
    this.size = this.hop * 2
    this.delta = Math.round(sampleRate * 0.01)
    this.window = new Float32Array(this.size)
    for (let i = 0; i < this.size; i++) this.window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / this.size)
    this.buf = Array.from({ length: channels }, () => new Float32Array(sampleRate))
    this.tail = Array.from({ length: channels }, () => new Float32Array(this.hop))
  }

  push(planes: Float32Array[]) {
    this.append(planes)
    return this.run()
  }

  flush() {
    this.ended = true
    const body = this.run()
    // The last frame's second half is all that is left.
    return body.map((plane, c) => concat(plane, this.tail[c]))
  }

  private append(planes: Float32Array[]) {
    const n = planes[0].length
    if (this.bufLen + n > this.buf[0].length) {
      const grown = Math.max(this.buf[0].length * 2, this.bufLen + n)
      this.buf = this.buf.map((b) => {
        const next = new Float32Array(grown)
        next.set(b.subarray(0, this.bufLen))
        return next
      })
    }
    for (let c = 0; c < this.channels; c++) this.buf[c].set(planes[Math.min(c, planes.length - 1)], this.bufLen)
    this.bufLen += n
  }

  /** Input sample at absolute index i, all channels mixed (for matching); 0 outside the buffer. */
  private mono(i: number) {
    const j = i - this.bufStart
    if (j < 0 || j >= this.bufLen) return 0
    let s = 0
    for (let c = 0; c < this.channels; c++) s += this.buf[c][j]
    return s
  }

  /** Where frame k starts in the input: near k·hop·speed, where it best continues the previous frame. */
  private bestPosition(k: number) {
    const target = Math.round(k * this.hop * this.speed)
    if (k === 0) return 0
    const natural = this.prevPos + this.hop
    const lo = Math.max(0, target - this.delta)
    const hi = target + this.delta
    const step = 4 // compare every 4th sample: plenty for matching, 4× faster
    const score = (p: number) => {
      let dot = 0
      let energy = 1e-9
      for (let i = 0; i < this.hop; i += step) {
        const a = this.mono(natural + i)
        const b = this.mono(p + i)
        dot += a * b
        energy += b * b
      }
      return dot / Math.sqrt(energy)
    }
    // Coarse search, then refine around the winner.
    let best = target
    let bestScore = -Infinity
    for (let p = lo; p <= hi; p += 4) {
      const s = score(p)
      if (s > bestScore) [best, bestScore] = [p, s]
    }
    for (let p = Math.max(lo, best - 3); p <= Math.min(hi, best + 3); p++) {
      const s = score(p)
      if (s > bestScore) [best, bestScore] = [p, s]
    }
    return best
  }

  private run() {
    const out: Float32Array[][] = Array.from({ length: this.channels }, () => [])
    const end = this.bufStart + this.bufLen
    for (;;) {
      const target = Math.round(this.frame * this.hop * this.speed)
      if (this.ended ? target >= end : target + this.delta + this.size > end) break
      const pos = this.bestPosition(this.frame)
      for (let c = 0; c < this.channels; c++) {
        const chunk = new Float32Array(this.hop)
        const src = this.buf[c]
        const at = (i: number) => {
          const j = pos + i - this.bufStart
          return j >= 0 && j < this.bufLen ? src[j] : 0
        }
        for (let i = 0; i < this.hop; i++) {
          // The very first frame starts at full volume instead of fading in.
          const w = this.frame === 0 ? 1 : this.window[i]
          chunk[i] = this.tail[c][i] + at(i) * w
        }
        for (let i = 0; i < this.hop; i++) this.tail[c][i] = at(this.hop + i) * this.window[this.hop + i]
        out[c].push(chunk)
      }
      this.prevPos = pos
      this.frame++
    }
    this.compact()
    return out.map((chunks) => concat(...chunks))
  }

  /** Drops input that no future frame can reach. */
  private compact() {
    const nextTarget = Math.round(this.frame * this.hop * this.speed)
    const keepFrom = Math.max(0, Math.min(this.prevPos + this.hop, nextTarget - this.delta) - 8)
    const drop = Math.min(this.bufLen, keepFrom - this.bufStart)
    if (drop <= 0) return
    for (const b of this.buf) b.copyWithin(0, drop, this.bufLen)
    this.bufLen -= drop
    this.bufStart += drop
  }
}

/** Speed change like a tape or record: pitch rises and falls with the speed. Linear interpolation. */
export class Resample implements SpeedProcessor {
  private pos = 0 // read position, relative to `prev`
  private prev: Float32Array[] // the last input sample of the previous chunk
  private readonly channels: number
  private readonly speed: number

  constructor(channels: number, speed: number) {
    this.channels = channels
    this.speed = speed
    this.prev = Array.from({ length: channels }, () => new Float32Array(1))
  }

  push(planes: Float32Array[]) {
    const n = planes[0].length
    // Index 0 is the previous chunk's last sample, then this chunk.
    // Every output position before n can be interpolated now (it needs index ≤ n).
    const count = Math.max(0, Math.ceil((n - this.pos) / this.speed))
    const out = Array.from({ length: this.channels }, (_, c) => {
      const src = planes[Math.min(c, planes.length - 1)]
      const at = (i: number) => (i === 0 ? this.prev[c][0] : src[i - 1])
      const o = new Float32Array(count)
      for (let j = 0; j < count; j++) {
        const x = this.pos + j * this.speed
        const i = Math.floor(x)
        const f = x - i
        o[j] = at(i) * (1 - f) + at(Math.min(n, i + 1)) * f
      }
      this.prev[c][0] = src[n - 1]
      return o
    })
    this.pos = this.pos + count * this.speed - n
    return out
  }

  flush() {
    return Array.from({ length: this.channels }, () => new Float32Array(0))
  }
}

function concat(...parts: Float32Array[]) {
  if (parts.length === 1) return parts[0]
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}
