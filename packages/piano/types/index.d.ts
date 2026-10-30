// Public types of @chalidade/piano. They mirror src/tools/piano/sound.ts and
// songs.ts; types/check.ts fails the build if they drift.

export type Voice = 'grand' | 'epiano' | 'organ' | 'harpsichord' | 'strings' | 'musicbox'

/** The six voices with their [Indonesian, English] labels. */
export declare const VOICES: { id: Voice; label: readonly [string, string] }[]

/**
 * A synthesised piano (no samples) on its own AudioContext, with a sustain
 * pedal and six voices. Browsers start audio only after a user gesture, so
 * create it (or call `noteOn`, which resumes it) from a click or key press.
 */
export declare class PianoSynth {
  constructor()
  readonly ctx: AudioContext
  /** Master gain, default 0.8. */
  set volume(v: number)
  /** The context clock in seconds, for `playAt`. */
  get now(): number
  /** Switches voice, silencing what is sounding. */
  setVoice(v: Voice): void
  /** Renders notes in advance so the first press of each has no delay. */
  warm(notes: number[]): void
  /** Starts a MIDI note now (velocity 0–1, default 0.8). */
  noteOn(midi: number, velocity?: number): void
  /** Releases it, or keeps it ringing while the pedal is down. */
  noteOff(midi: number): void
  /** Plays a note at `when` (context time) for `duration` seconds. Returns a function that fades it early. */
  playAt(midi: number, velocity: number, when: number, duration: number): () => void
  /** Sustain pedal. */
  setPedal(down: boolean): void
  allOff(): void
  /** Closes the AudioContext. */
  close(): void
}

export interface Note {
  /** Start, seconds. */
  t: number
  /** Length, seconds. */
  d: number
  midi: number
  /** 0–1. */
  velocity: number
  /** MIDI track (0 for the built-in songs). */
  track: number
}

export interface Song {
  id: string
  title: string
  by: string
  /** English title / composer line, where it differs from the Indonesian one. */
  en?: { title: string; by: string }
  notes: Note[]
  /** Track names of an imported MIDI file, when it has more than one. */
  tracks?: { index: number; name: string; count: number }[]
}

/** Notes that start together (within 40 ms): one step to press. */
export interface Step {
  t: number
  notes: number[]
}

/** Seven public-domain tunes: Twinkle Twinkle, Ode to Joy, Happy Birthday, Jingle Bells, Für Elise, Canon in D, Bach's Prelude in C. */
export declare const SONGS: Song[]

export declare const SCALES: readonly [
  { readonly id: 'major'; readonly label: readonly ['Mayor', 'Major']; readonly steps: readonly [0, 2, 4, 5, 7, 9, 11, 12] },
  { readonly id: 'minor'; readonly label: readonly ['Minor natural', 'Natural minor']; readonly steps: readonly [0, 2, 3, 5, 7, 8, 10, 12] },
  { readonly id: 'harmonic'; readonly label: readonly ['Minor harmonis', 'Harmonic minor']; readonly steps: readonly [0, 2, 3, 5, 7, 8, 11, 12] },
  { readonly id: 'pentatonic'; readonly label: readonly ['Pentatonik mayor', 'Major pentatonic']; readonly steps: readonly [0, 2, 4, 7, 9, 12] },
]

/** A scale from `root` (pitch class) near middle C, up and back down, as a song. */
export declare function scaleSong(root: number, scaleId: string, bpm?: number): Song
/** Reads a Standard MIDI File (format 0 or 1) into timed notes, honouring tempo changes. Throws on anything else. */
export declare function parseMidi(buf: ArrayBuffer, name: string): Song
/** Groups notes that start together into steps. */
export declare function stepsOf(notes: Note[]): Step[]
/** Lowest and highest MIDI note. */
export declare const rangeOf: (notes: Note[]) => readonly [number, number]
