// The sample-level mix: the video's own sound plus a music bed, with volume,
// looping, fades, and ducking (the music dips while the video's own sound is
// loud, e.g. someone talking). Pure DSP on planar stereo, no browser APIs.

export interface MixOptions {
  /** 0–1. */
  musicVolume: number
  /** 0–1; 0 mutes the video's own sound. */
  originalVolume: number
  loop: boolean
  /** Fade the music in at the start and out at the end. */
  fade: boolean
  duck: boolean
}

export const FADE_SECONDS = 2
/** Music level while ducked, and the original's level (−30 dBFS) that triggers it. */
const DUCK_TO = 0.25
const DUCK_THRESHOLD = 0.03

export class Mixer {
  private envelope = 0
  private duckGain = 1
  private attack: number
  private release: number
  private hold: number
  private music: Float32Array[]
  private rate: number
  private duration: number
  private opts: MixOptions

  /** `music` starts at the chosen point of the song, at `rate`; `duration` is the video's, in seconds. */
  constructor(music: Float32Array[], rate: number, duration: number, opts: MixOptions) {
    this.music = music
    this.rate = rate
    this.duration = duration
    this.opts = opts
    // Per-sample smoothing: duck down in ~150 ms, come back up in ~500 ms.
    this.attack = 1 - Math.exp(-1 / (0.15 * rate))
    this.release = 1 - Math.exp(-1 / (0.5 * rate))
    // The envelope holds a word's level across short gaps between syllables (~200 ms).
    this.hold = Math.exp(-1 / (0.2 * rate))
  }

  /** Mixes `frames` samples starting at output frame `at`; `original` is null for a silent video. */
  mix(at: number, frames: number, original: Float32Array[] | null): Float32Array[] {
    const { musicVolume, originalVolume, loop, fade, duck } = this.opts
    const out = [new Float32Array(frames), new Float32Array(frames)]
    const len = this.music[0].length
    const right = this.music[1] ?? this.music[0]
    const fadeFrames = FADE_SECONDS * this.rate
    const end = this.duration * this.rate
    for (let i = 0; i < frames; i++) {
      const n = at + i
      let l = 0
      let r = 0
      if (original) {
        l = original[0][i]
        r = (original[1] ?? original[0])[i]
      }
      let g = musicVolume
      if (fade) g *= Math.min(1, n / fadeFrames, Math.max(0, (end - n) / fadeFrames))
      if (duck && original) {
        const level = Math.max(Math.abs(l), Math.abs(r))
        this.envelope = level > this.envelope ? level : this.envelope * this.hold
        const target = this.envelope > DUCK_THRESHOLD ? DUCK_TO : 1
        this.duckGain += (target - this.duckGain) * (target < this.duckGain ? this.attack : this.release)
        g *= this.duckGain
      }
      const k = loop && len ? n % len : n
      const ml = k < len ? this.music[0][k] : 0
      const mr = k < len ? right[k] : 0
      out[0][i] = clip(l * originalVolume + ml * g)
      out[1][i] = clip(r * originalVolume + mr * g)
    }
    return out
  }
}

// shortcut: a hard clip, not a limiter — only reached when both tracks are loud; add a limiter if users complain.
const clip = (x: number) => (x > 1 ? 1 : x < -1 ? -1 : x)
