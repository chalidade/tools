import { midiToFreq } from '@/lib/music'

/*
 * A small synthesised piano: each note is rendered once into an AudioBuffer
 * (a handful of slightly stretched partials with a two-stage decay, plus a
 * short hammer thump) and cached, so playing is just starting a buffer. No
 * samples to download — the whole instrument is this file.
 */

const INHARMONICITY = 0.00025
const RELEASE_S = 0.25

export class PianoSynth {
  private ctx: AudioContext
  private master: GainNode
  private cache = new Map<number, AudioBuffer>()
  private voices = new Map<number, { src: AudioBufferSourceNode; gain: GainNode }>()
  /** Notes whose key is up but still ring because the sustain pedal is down. */
  private sustained = new Set<number>()
  private pedal = false

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' })
    const comp = this.ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.8
    this.master.connect(comp).connect(this.ctx.destination)
  }

  set volume(v: number) {
    this.master.gain.value = v
  }

  /** Renders the notes in advance so the first press of each has no delay. */
  warm(notes: number[]) {
    for (const n of notes) this.buffer(n)
  }

  noteOn(midi: number, velocity = 0.8) {
    void this.ctx.resume()
    this.stopVoice(midi, 0.02)
    this.sustained.delete(midi)
    const src = this.ctx.createBufferSource()
    src.buffer = this.buffer(midi)
    const gain = this.ctx.createGain()
    gain.gain.value = 0.25 + 0.75 * velocity
    src.connect(gain).connect(this.master)
    src.start()
    src.onended = () => {
      if (this.voices.get(midi)?.src === src) this.voices.delete(midi)
    }
    this.voices.set(midi, { src, gain })
  }

  noteOff(midi: number) {
    if (this.pedal) this.sustained.add(midi)
    else this.stopVoice(midi, RELEASE_S)
  }

  setPedal(down: boolean) {
    this.pedal = down
    if (!down) {
      for (const n of this.sustained) this.stopVoice(n, RELEASE_S)
      this.sustained.clear()
    }
  }

  close() {
    void this.ctx.close().catch(() => {})
  }

  private stopVoice(midi: number, release: number) {
    const v = this.voices.get(midi)
    if (!v) return
    const t = this.ctx.currentTime
    v.gain.gain.cancelScheduledValues(t)
    v.gain.gain.setValueAtTime(v.gain.gain.value, t)
    v.gain.gain.setTargetAtTime(0, t, release / 4)
    v.src.stop(t + release + 0.05)
    this.voices.delete(midi)
  }

  private buffer(midi: number): AudioBuffer {
    let b = this.cache.get(midi)
    if (!b) {
      b = renderNote(this.ctx, midi)
      this.cache.set(midi, b)
    }
    return b
  }
}

function renderNote(ctx: BaseAudioContext, midi: number): AudioBuffer {
  const rate = ctx.sampleRate
  const f0 = midiToFreq(midi)
  // Low strings ring for longer than high ones.
  const seconds = Math.min(4.5, Math.max(1.4, 4.5 - (midi - 40) * 0.05))
  const len = Math.floor(rate * seconds)
  const buffer = ctx.createBuffer(1, len, rate)
  const out = buffer.getChannelData(0)

  for (let n = 1; n <= 12; n++) {
    const f = n * f0 * Math.sqrt(1 + INHARMONICITY * n * n)
    if (f > rate * 0.45) break
    const amp = (n === 1 ? 1 : 0.7) / n ** 1.15
    // Fast initial drop, then a long tail; higher partials and higher notes die sooner.
    const fast = 2.5 + n * 0.9 + f0 / 220
    const slow = fast / 5
    const w = (2 * Math.PI * f) / rate
    const c = Math.cos(w)
    const s = Math.sin(w)
    // Rotate a phasor instead of calling Math.sin for every sample.
    let x = 1
    let y = 0
    const df = Math.exp(-fast / rate)
    const ds = Math.exp(-slow / rate)
    let ef = 0.65 * amp
    let es = 0.35 * amp
    for (let i = 0; i < len; i++) {
      out[i] += y * (ef + es)
      const nx = x * c - y * s
      y = x * s + y * c
      x = nx
      ef *= df
      es *= ds
    }
  }

  // Hammer: a few milliseconds of soft noise on top of a quick attack.
  const attack = Math.floor(rate * 0.004)
  const thump = Math.floor(rate * 0.02)
  let lp = 0
  for (let i = 0; i < len; i++) {
    if (i < attack) out[i] *= i / attack
    if (i < thump) {
      lp += 0.2 * (Math.random() * 2 - 1 - lp)
      out[i] += lp * 0.15 * (1 - i / thump)
    }
  }

  let peak = 0
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]))
  const k = peak > 0 ? 0.35 / peak : 0
  for (let i = 0; i < len; i++) out[i] *= k
  // Fade the very end so a long note never clicks off.
  const tail = Math.floor(rate * 0.05)
  for (let i = 0; i < tail; i++) out[len - 1 - i] *= i / tail
  return buffer
}
