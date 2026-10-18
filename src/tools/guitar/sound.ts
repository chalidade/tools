import { midiToFreq } from '@/lib/music'

/*
 * A plucked-string guitar on Web Audio. Each note is a Karplus–Strong string
 * rendered once into an AudioBuffer and cached:
 *  - a first-order all-pass supplies the fractional part of the delay, so
 *    high frets stay in tune (an integer delay alone is ~7 cents off at E5);
 *  - the excitation is notched at the pick position, which is what makes a
 *    pluck near the bridge sound bright and one over the neck sound round;
 *  - the loop gain is set per note from a target ring time.
 * The tone stage after it (acoustic body, clean or overdriven amp) is a
 * small node graph that can be swapped while playing.
 */

export type Tone = 'acoustic' | 'clean' | 'drive'

const RATE_RING = { acoustic: 5.5, clean: 7, drive: 9 } // seconds to fall 60 dB on the low E

export function renderString(rate: number, freq: number, tone: Tone, out?: Float32Array): Float32Array {
  const ring = RATE_RING[tone] * Math.max(0.35, Math.min(1, 82.4 / freq) ** 0.45)
  const seconds = Math.min(ring * 0.75, 6)
  const len = Math.floor(rate * seconds)
  const data = out ?? new Float32Array(len)

  const period = rate / freq
  let delay = Math.floor(period - 0.5)
  let frac = period - 0.5 - delay
  if (frac < 0.1) {
    delay -= 1
    frac += 1
  }
  const c = (1 - frac) / (1 + frac)
  // Loop gain per trip around the string for the wanted ring time.
  const gain = 10 ** ((-3 * (period / rate)) / ring)

  // Excitation: soft-filtered noise, notched at the pick position.
  const line = new Float32Array(delay)
  const noise = new Float32Array(delay)
  let lp = 0
  const bright = tone === 'acoustic' ? 0.55 : 0.4
  for (let i = 0; i < delay; i++) {
    lp += bright * (Math.random() * 2 - 1 - lp)
    noise[i] = lp
  }
  const pick = Math.max(1, Math.round(delay * (tone === 'acoustic' ? 0.13 : 0.18)))
  for (let i = 0; i < delay; i++) line[i] = noise[i] - (i >= pick ? noise[i - pick] : 0)
  // A short string holds few samples, so the noise rarely averages to zero;
  // the loop would keep that offset as DC (clicks, lopsided distortion).
  let mean = 0
  for (let i = 0; i < delay; i++) mean += line[i]
  mean /= delay
  for (let i = 0; i < delay; i++) line[i] -= mean

  let idx = 0
  let prev = 0
  let apIn = 0
  let apOut = 0
  for (let i = 0; i < len && i < data.length; i++) {
    const x = line[idx]
    const avg = gain * 0.5 * (x + prev)
    prev = x
    const y = c * avg + apIn - c * apOut
    apIn = avg
    apOut = y
    line[idx] = y
    data[i] = y
    idx = idx + 1 === delay ? 0 : idx + 1
  }

  let peak = 0
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(data[i]))
  const k = peak > 0 ? 0.5 / peak : 0
  const fade = Math.floor(rate * 0.08)
  for (let i = 0; i < len; i++) data[i] *= k * (i > len - fade ? (len - i) / fade : 1)
  return data
}

export class GuitarSynth {
  readonly ctx: AudioContext
  private input: GainNode
  private master: GainNode
  private stage: AudioNode[] = []
  private tone: Tone = 'acoustic'
  private cache = new Map<string, AudioBuffer>()
  /** One sounding note per string, like a real guitar. */
  private strings = new Map<number, { src: AudioBufferSourceNode; gain: GainNode }>()

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' })
    this.input = this.ctx.createGain()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.8
    const comp = this.ctx.createDynamicsCompressor()
    comp.threshold.value = -12
    comp.ratio.value = 3
    this.master.connect(comp).connect(this.ctx.destination)
    this.setTone('acoustic')
  }

  set volume(v: number) {
    this.master.gain.value = v
  }

  setTone(tone: Tone) {
    this.tone = tone
    this.input.disconnect()
    for (const n of this.stage) n.disconnect()
    const ctx = this.ctx
    const chain: AudioNode[] = []
    if (tone === 'acoustic') {
      // Body: a low "air" resonance, a wood mid bump, a little presence.
      for (const [f, q, g] of [
        [105, 3, 5],
        [220, 2, 3],
        [3200, 1, 2],
      ] as const) {
        const bq = ctx.createBiquadFilter()
        bq.type = 'peaking'
        bq.frequency.value = f
        bq.Q.value = q
        bq.gain.value = g
        chain.push(bq)
      }
    } else {
      const pre = ctx.createGain()
      pre.gain.value = tone === 'drive' ? 9 : 1.4
      const shaper = ctx.createWaveShaper()
      const curve = new Float32Array(2048)
      const k = tone === 'drive' ? 3.5 : 1.2
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1
        curve[i] = Math.tanh(k * x) / Math.tanh(k)
      }
      shaper.curve = curve
      shaper.oversample = '4x'
      // Speaker cabinet: no fizz above ~4–5 kHz, a little low-mid body.
      const cab = ctx.createBiquadFilter()
      cab.type = 'lowpass'
      cab.frequency.value = tone === 'drive' ? 4200 : 5200
      cab.Q.value = 0.8
      const mid = ctx.createBiquadFilter()
      mid.type = 'peaking'
      mid.frequency.value = 650
      mid.Q.value = 0.9
      mid.gain.value = tone === 'drive' ? 4 : 1
      const post = ctx.createGain()
      post.gain.value = tone === 'drive' ? 0.35 : 0.8
      chain.push(pre, shaper, cab, mid, post)
    }
    let node: AudioNode = this.input
    for (const n of chain) {
      node.connect(n)
      node = n
    }
    node.connect(this.master)
    this.stage = chain
  }

  /** Renders notes ahead of time so a first strum has no hiccup. */
  warm(notes: number[]) {
    for (const n of notes) this.buffer(n)
  }

  /** Plays `midi` on `string` at `when` (AudioContext time; default now). */
  pluck(string: number, midi: number, velocity = 0.8, when = 0) {
    void this.ctx.resume()
    const at = Math.max(when, this.ctx.currentTime)
    this.damp(string, at)
    const src = this.ctx.createBufferSource()
    src.buffer = this.buffer(midi)
    const gain = this.ctx.createGain()
    gain.gain.value = 0.3 + 0.7 * velocity
    src.connect(gain).connect(this.input)
    src.start(at)
    this.strings.set(string, { src, gain })
  }

  /** Stops a string (a new note on it, or the palm). */
  damp(string: number, at = this.ctx.currentTime) {
    const v = this.strings.get(string)
    if (!v) return
    v.gain.gain.setTargetAtTime(0, at, 0.015)
    v.src.stop(at + 0.1)
    this.strings.delete(string)
  }

  dampAll() {
    for (const s of this.strings.keys()) this.damp(s)
  }

  close() {
    void this.ctx.close().catch(() => {})
  }

  private buffer(midi: number): AudioBuffer {
    const key = `${this.tone}${midi}`
    let b = this.cache.get(key)
    if (!b) {
      const rate = this.ctx.sampleRate
      const data = renderString(rate, midiToFreq(midi), this.tone)
      b = this.ctx.createBuffer(1, data.length, rate)
      b.copyToChannel(data as Float32Array<ArrayBuffer>, 0)
      this.cache.set(key, b)
    }
    return b
  }
}
