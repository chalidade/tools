// Public types of @chalidade/guitar. They mirror src/tools/guitar/sound.ts;
// types/check.ts fails the build if they drift.

export type Tone = 'acoustic' | 'clean' | 'drive'

/**
 * One Karplus–Strong guitar string at `freq` Hz, rendered at `rate` Hz into
 * `out` (or a new array long enough for the note to ring out).
 */
export declare function renderString(rate: number, freq: number, tone: Tone, out?: Float32Array): Float32Array

/**
 * A plucked-string guitar on its own AudioContext: one sounding note per
 * string, like a real guitar, and an acoustic body, clean amp or overdrive.
 * Browsers start audio only after a user gesture, so pluck from a click or key press.
 */
export declare class GuitarSynth {
  constructor()
  readonly ctx: AudioContext
  /** Master gain, default 0.8. */
  set volume(v: number)
  /** Swaps the tone stage, also while notes ring. */
  setTone(tone: Tone): void
  /** Renders notes ahead of time so a first strum has no hiccup. */
  warm(notes: number[]): void
  /** Plays `midi` on `string` (0 = low E) at `when` (context time; default now), velocity 0–1. */
  pluck(string: number, midi: number, velocity?: number, when?: number): void
  /** Stops a string. */
  damp(string: number, at?: number): void
  dampAll(): void
  /** Closes the AudioContext. */
  close(): void
}
