// Public types of @chalidade/guitar-tuner. They mirror src/tools/guitar-tuner/pitch.ts
// and src/lib/music.ts; types/check.ts fails the build if they drift.

export interface Pitch {
  /** Fundamental frequency in Hz. */
  freq: number
  /** 0–1: how periodic the signal is. Below ~0.85 it is noise or a decaying tail. */
  clarity: number
}

export interface Tuning {
  id: string
  /** [Indonesian, English] label. */
  label: readonly [string, string]
  /** MIDI notes, lowest string first. Empty = chromatic (any note). */
  strings: number[]
}

/**
 * Pitch of `input` (time-domain samples at `rate` Hz), searching only between
 * `minFreq` and `maxFreq`, with the McLeod Pitch Method. Null for silence or
 * a non-periodic signal.
 */
export declare function detectPitch(input: Float32Array, rate: number, minFreq: number, maxFreq: number): Pitch | null

/** Guitar (standard, drop D, ½ step down, DADGAD, open G), bass, violin, viola, cello, ukulele and chromatic. */
export declare const TUNINGS: Tuning[]

/** Frequency of a MIDI note number for a given A4 reference (default 440 Hz). */
export declare const midiToFreq: (midi: number, a4?: number) => number
/** Fractional MIDI note number of a frequency: the fraction × 100 is the offset in cents. */
export declare const freqToMidi: (freq: number, a4?: number) => number
/** "E2", "A♯3"… (or "B♭3" with `flats`). */
export declare const noteName: (midi: number, flats?: boolean) => string
