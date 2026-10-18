/*
 * A synthesised drum kit in the spirit of classic drum machines — no samples.
 *  - kick and toms: a sine whose pitch drops fast, plus a short click;
 *  - snare: band-passed noise for the wires over two short tones for the shell;
 *  - hi-hats and cymbals: six square waves at inharmonic ratios (the 808
 *    "metal" recipe) high-passed, plus noise; an open hat is cut off ("choked")
 *    by the next closed one, like a foot closing the pedal.
 * Every hit is a handful of nodes scheduled at an exact AudioContext time, so
 * the sequencer can queue them ahead and they land on the beat.
 */

export type Piece = 'kick' | 'snare' | 'hhClosed' | 'hhOpen' | 'tom1' | 'tom2' | 'floor' | 'crash' | 'ride'

const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800]

export class DrumKit {
  readonly ctx: AudioContext
  private master: GainNode
  private noise: AudioBuffer
  private openHat: GainNode | null = null

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' })
    const comp = this.ctx.createDynamicsCompressor()
    comp.threshold.value = -6
    comp.ratio.value = 3
    comp.attack.value = 0.003
    this.master = this.ctx.createGain()
    this.master.gain.value = 1.6
    this.master.connect(comp).connect(this.ctx.destination)
    const len = this.ctx.sampleRate * 2
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }

  set volume(v: number) {
    this.master.gain.value = v
  }

  get now() {
    return this.ctx.currentTime
  }

  resume() {
    void this.ctx.resume()
  }

  close() {
    void this.ctx.close().catch(() => {})
  }

  hit(piece: Piece, velocity = 0.85, when = 0) {
    const t = Math.max(when, this.ctx.currentTime)
    const v = 0.2 + 0.8 * velocity
    switch (piece) {
      case 'kick':
        this.drum(t, v, 150, 48, 0.07, 0.5, 1.1)
        this.click(t, v * 0.5, 3500)
        break
      case 'tom1':
        this.drum(t, v, 300, 200, 0.08, 0.35, 0.75)
        this.click(t, v * 0.25, 2500)
        break
      case 'tom2':
        this.drum(t, v, 220, 145, 0.09, 0.42, 0.8)
        this.click(t, v * 0.25, 2200)
        break
      case 'floor':
        this.drum(t, v, 150, 95, 0.1, 0.55, 0.9)
        this.click(t, v * 0.25, 1800)
        break
      case 'snare':
        this.snare(t, v)
        break
      case 'hhClosed':
        this.choke(t)
        this.metal(t, v * 3.2, 7500, 0.06)
        break
      case 'hhOpen': {
        this.choke(t)
        this.openHat = this.metal(t, v * 1.6, 7000, 0.45)
        break
      }
      case 'crash':
        this.metal(t, v * 0.5, 4500, 1.8)
        this.noiseBurst(t, v * 0.25, 'highpass', 5000, 1.4)
        break
      case 'ride': {
        this.metal(t, v * 1.1, 5500, 1.1, 'bandpass', 8000)
        // The bell: a short pure ping on top of the wash.
        const o = this.ctx.createOscillator()
        o.frequency.value = 3020
        const g = this.ctx.createGain()
        g.gain.setValueAtTime(v * 0.05, t)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
        o.connect(g).connect(this.master)
        o.start(t)
        o.stop(t + 0.62)
        break
      }
    }
  }

  /** A tuned membrane: sine with a falling pitch and an exponential decay. */
  private drum(t: number, v: number, from: number, to: number, sweep: number, decay: number, level: number) {
    const o = this.ctx.createOscillator()
    o.frequency.setValueAtTime(from, t)
    o.frequency.exponentialRampToValueAtTime(to, t + sweep)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(v * level, t + 0.003)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + decay + 0.02)
  }

  /** The beater or stick: a couple of milliseconds of filtered noise. */
  private click(t: number, v: number, freq: number) {
    this.noiseBurst(t, v, 'bandpass', freq, 0.012)
  }

  private snare(t: number, v: number) {
    for (const [f, a] of [
      [185, 0.5],
      [330, 0.3],
    ] as const) {
      const o = this.ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(f * 1.2, t)
      o.frequency.exponentialRampToValueAtTime(f, t + 0.02)
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(v * a, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      o.connect(g).connect(this.master)
      o.start(t)
      o.stop(t + 0.14)
    }
    this.noiseBurst(t, v * 0.8, 'highpass', 1500, 0.22)
    this.noiseBurst(t, v * 0.35, 'bandpass', 4000, 0.15)
  }

  private noiseBurst(t: number, v: number, type: BiquadFilterType, freq: number, decay: number) {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const f = this.ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(v, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    src.connect(f).connect(g).connect(this.master)
    // Start somewhere random in the buffer so repeated hits don't sound identical.
    src.start(t, Math.random() * 1.5)
    src.stop(t + decay + 0.02)
  }

  private metal(t: number, v: number, cutoff: number, decay: number, type: BiquadFilterType = 'highpass', band = 0): GainNode {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(v, t + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    const hp = this.ctx.createBiquadFilter()
    hp.type = type
    hp.frequency.value = band || cutoff
    if (type === 'bandpass') hp.Q.value = 0.8
    const hp2 = this.ctx.createBiquadFilter()
    hp2.type = 'highpass'
    hp2.frequency.value = cutoff
    hp.connect(hp2).connect(g).connect(this.master)
    for (const f of METAL) {
      const o = this.ctx.createOscillator()
      o.type = 'square'
      o.frequency.value = f * 1.7
      const og = this.ctx.createGain()
      og.gain.value = 0.18
      o.connect(og).connect(hp)
      o.start(t)
      o.stop(t + decay + 0.05)
    }
    return g
  }

  /** A closed hat (or the next open one) cuts off an open hat that is still ringing. */
  private choke(t: number) {
    if (!this.openHat) return
    this.openHat.gain.cancelScheduledValues(t)
    this.openHat.gain.setTargetAtTime(0, t, 0.01)
    this.openHat = null
  }
}
