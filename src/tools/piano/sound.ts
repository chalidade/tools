import { midiToFreq } from '@/lib/music'
import { renderString } from '@/tools/guitar/sound'

/*
 * The keyboard's instruments, all synthesised — no samples to download.
 *
 * Decaying sounds (grand, electric piano, harpsichord, music box) are rendered
 * once per note into an AudioBuffer and cached, so a key press only starts a
 * buffer. Sustained sounds (organ, strings) are live oscillators instead,
 * because they must ring for as long as the key is held.
 */

export type Voice = 'grand' | 'epiano' | 'organ' | 'harpsichord' | 'strings' | 'musicbox'

export const VOICES: { id: Voice; label: readonly [string, string] }[] = [
  { id: 'grand', label: ['Grand piano', 'Grand piano'] },
  { id: 'epiano', label: ['Piano elektrik', 'Electric piano'] },
  { id: 'organ', label: ['Organ', 'Organ'] },
  { id: 'harpsichord', label: ['Harpsichord', 'Harpsichord'] },
  { id: 'strings', label: ['String', 'Strings'] },
  { id: 'musicbox', label: ['Kotak musik', 'Music box'] },
]

const RELEASE: Record<Voice, number> = {
  grand: 0.25,
  epiano: 0.3,
  organ: 0.06,
  harpsichord: 0.12,
  strings: 0.6,
  musicbox: 0.4,
}

interface Sounding {
  gain: GainNode
  stop: (at: number) => void
}

export class PianoSynth {
  readonly ctx: AudioContext
  private master: GainNode
  private voice: Voice = 'grand'
  private cache = new Map<string, AudioBuffer>()
  private voices = new Map<number, Sounding>()
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

  setVoice(v: Voice) {
    this.allOff()
    this.voice = v
  }

  get now() {
    return this.ctx.currentTime
  }

  /** Renders the notes in advance so the first press of each has no delay. */
  warm(notes: number[]) {
    if (this.voice === 'organ' || this.voice === 'strings') return
    for (const n of notes) this.buffer(n)
  }

  noteOn(midi: number, velocity = 0.8) {
    void this.ctx.resume()
    this.stopVoice(midi, 0.02)
    this.sustained.delete(midi)
    this.voices.set(midi, this.start(midi, velocity, this.ctx.currentTime))
  }

  noteOff(midi: number) {
    if (this.pedal) this.sustained.add(midi)
    else this.stopVoice(midi, RELEASE[this.voice])
  }

  /**
   * Plays a note at a set time for a set length, independent of the keys
   * (demo playback). Returns a function that silences it early; its sources
   * already have their stop time, so this only fades the gain.
   */
  playAt(midi: number, velocity: number, when: number, duration: number): () => void {
    void this.ctx.resume()
    const s = this.start(midi, velocity, when)
    s.stop(when + duration)
    return () => {
      const t = this.ctx.currentTime
      s.gain.gain.cancelScheduledValues(t)
      s.gain.gain.setTargetAtTime(0, t, 0.02)
    }
  }

  setPedal(down: boolean) {
    this.pedal = down
    if (!down) {
      for (const n of this.sustained) this.stopVoice(n, RELEASE[this.voice])
      this.sustained.clear()
    }
  }

  allOff() {
    for (const m of this.voices.keys()) this.stopVoice(m, 0.05)
    this.sustained.clear()
  }

  close() {
    void this.ctx.close().catch(() => {})
  }

  private stopVoice(midi: number, release: number) {
    const v = this.voices.get(midi)
    if (!v) return
    this.voices.delete(midi)
    const t = this.ctx.currentTime
    v.gain.gain.cancelScheduledValues(t)
    v.gain.gain.setValueAtTime(v.gain.gain.value, t)
    v.gain.gain.setTargetAtTime(0, t, release / 4)
    v.stop(t + release + 0.05)
  }

  private start(midi: number, velocity: number, when: number): Sounding {
    const ctx = this.ctx
    const gain = ctx.createGain()
    gain.connect(this.master)
    const level = 0.25 + 0.75 * velocity
    const release = RELEASE[this.voice]

    if (this.voice === 'organ' || this.voice === 'strings') {
      const f = midiToFreq(midi)
      const nodes: AudioScheduledSourceNode[] = []
      let out: AudioNode = gain
      if (this.voice === 'strings') {
        // Two detuned saws through a soft low-pass, slow bow-like attack.
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = Math.min(6000, 1200 + f * 3)
        lp.connect(gain)
        out = lp
        for (const cents of [-7, 7]) {
          const o = ctx.createOscillator()
          o.type = 'sawtooth'
          o.frequency.value = f
          o.detune.value = cents
          const g = ctx.createGain()
          g.gain.value = 0.12
          o.connect(g).connect(out)
          nodes.push(o)
        }
        gain.gain.setValueAtTime(0, when)
        gain.gain.linearRampToValueAtTime(level, when + 0.25)
      } else {
        // Drawbars 16′ 8′ 4′ 2⅔′ 2′, plus a tiny key click.
        for (const [ratio, amp] of [
          [0.5, 0.35],
          [1, 0.5],
          [2, 0.3],
          [3, 0.18],
          [4, 0.14],
        ] as const) {
          const o = ctx.createOscillator()
          o.frequency.value = f * ratio
          const g = ctx.createGain()
          g.gain.value = amp * 0.4
          o.connect(g).connect(out)
          nodes.push(o)
        }
        gain.gain.setValueAtTime(0, when)
        gain.gain.linearRampToValueAtTime(level, when + 0.008)
      }
      for (const n of nodes) n.start(when)
      return {
        gain,
        stop: (at) => {
          gain.gain.cancelScheduledValues(at)
          gain.gain.setTargetAtTime(0, at, release / 4)
          for (const n of nodes) n.stop(at + release + 0.05)
        },
      }
    }

    const src = ctx.createBufferSource()
    src.buffer = this.buffer(midi)
    gain.gain.value = level
    src.connect(gain)
    src.start(when)
    return {
      gain,
      stop: (at) => {
        gain.gain.setTargetAtTime(0, at, release / 4)
        src.stop(at + release + 0.05)
      },
    }
  }

  private buffer(midi: number): AudioBuffer {
    const key = this.voice + midi
    let b = this.cache.get(key)
    if (!b) {
      const rate = this.ctx.sampleRate
      const f = midiToFreq(midi)
      const data =
        this.voice === 'harpsichord'
          ? renderString(rate, f, 'clean')
          : this.voice === 'epiano'
            ? renderEpiano(rate, f, midi)
            : this.voice === 'musicbox'
              ? renderMusicBox(rate, f)
              : renderGrand(rate, f, midi)
      b = this.ctx.createBuffer(1, data.length, rate)
      b.copyToChannel(data as Float32Array<ArrayBuffer>, 0)
      this.cache.set(key, b)
    }
    return b
  }
}

/* ---- Renderers ---- */

function finish(out: Float32Array, rate: number, peakTo = 0.35) {
  let peak = 0
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]))
  const k = peak > 0 ? peakTo / peak : 0
  const tail = Math.floor(rate * 0.05)
  for (let i = 0; i < out.length; i++) out[i] *= k * (i > out.length - tail ? (out.length - i) / tail : 1)
  return out
}

/** Adds a decaying sine partial by rotating a phasor (no Math.sin per sample). */
function partial(out: Float32Array, rate: number, f: number, amp: number, fast: number, slow: number, mix = 0.65) {
  if (f > rate * 0.45) return
  const w = (2 * Math.PI * f) / rate
  const c = Math.cos(w)
  const s = Math.sin(w)
  let x = 1
  let y = 0
  const df = Math.exp(-fast / rate)
  const ds = Math.exp(-slow / rate)
  let ef = mix * amp
  let es = (1 - mix) * amp
  for (let i = 0; i < out.length; i++) {
    out[i] += y * (ef + es)
    const nx = x * c - y * s
    y = x * s + y * c
    x = nx
    ef *= df
    es *= ds
  }
}

function renderGrand(rate: number, f0: number, midi: number) {
  const seconds = Math.min(4.5, Math.max(1.4, 4.5 - (midi - 40) * 0.05))
  const out = new Float32Array(Math.floor(rate * seconds))
  for (let n = 1; n <= 12; n++) {
    const f = n * f0 * Math.sqrt(1 + 0.00025 * n * n)
    const fast = 2.5 + n * 0.9 + f0 / 220
    partial(out, rate, f, (n === 1 ? 1 : 0.7) / n ** 1.15, fast, fast / 5)
  }
  // Hammer: a quick attack and a few milliseconds of soft noise.
  const attack = Math.floor(rate * 0.004)
  const thump = Math.floor(rate * 0.02)
  let lp = 0
  for (let i = 0; i < thump; i++) {
    if (i < attack) out[i] *= i / attack
    lp += 0.2 * (Math.random() * 2 - 1 - lp)
    out[i] += lp * 0.15 * (1 - i / thump)
  }
  return finish(out, rate)
}

/** Two-operator FM, the classic tine electric piano: bright bark that mellows. */
function renderEpiano(rate: number, f: number, midi: number) {
  const seconds = Math.min(4, Math.max(1.5, 4 - (midi - 40) * 0.04))
  const out = new Float32Array(Math.floor(rate * seconds))
  let pc = 0
  let pm = 0
  let pt = 0
  const wc = (2 * Math.PI * f) / rate
  const wt = (2 * Math.PI * f * 14) / rate
  for (let i = 0; i < out.length; i++) {
    const t = i / rate
    const index = 2.2 * Math.exp(-t * 5) + 0.25
    const tine = f * 14 < rate * 0.45 ? 0.08 * Math.exp(-t * 30) * Math.sin(pt) : 0
    out[i] = (Math.sin(pc + index * Math.sin(pm)) + tine) * Math.exp(-t * (0.9 + f / 900))
    pc += wc
    pm += wc
    pt += wt
  }
  const attack = Math.floor(rate * 0.003)
  for (let i = 0; i < attack; i++) out[i] *= i / attack
  return finish(out, rate)
}

/** Steel comb tines: a near-pure tone with a few bright, fast-dying overtones. */
function renderMusicBox(rate: number, f: number) {
  const out = new Float32Array(Math.floor(rate * 2.2))
  partial(out, rate, f, 1, 2.2, 1.4)
  partial(out, rate, f * 3.0, 0.25, 9, 6)
  partial(out, rate, f * 5.4, 0.12, 18, 12)
  partial(out, rate, f * 8.9, 0.05, 30, 20)
  return finish(out, rate, 0.3)
}
