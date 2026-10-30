// Public types of @chalidade/drums. They mirror src/tools/drums/sound.ts;
// types/check.ts fails the build if they drift.

export type Piece = 'kick' | 'snare' | 'hhClosed' | 'hhOpen' | 'tom1' | 'tom2' | 'floor' | 'crash' | 'ride'

/**
 * A synthesised drum kit in the spirit of classic drum machines, no samples,
 * on its own AudioContext. An open hi-hat is choked by the next closed one.
 * Browsers start audio only after a user gesture, so call `resume()` from one.
 */
export declare class DrumKit {
  constructor()
  readonly ctx: AudioContext
  /** Master gain, default 1.6. */
  set volume(v: number)
  /** The context clock in seconds, for scheduling hits ahead. */
  get now(): number
  resume(): void
  /** Closes the AudioContext. */
  close(): void
  /** Plays `piece` at `when` (context time; default now), velocity 0–1 (default 0.85). */
  hit(piece: Piece, velocity?: number, when?: number): void
}
