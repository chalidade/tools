// Public types of @chalidade/chord-progression. They mirror
// src/tools/chord-progression/progression.ts; types/check.ts fails the build if they drift.

export interface Step {
  /** Roman numeral as printed on a chart: "vi", "V7"… */
  degree: string
  /** Semitones above the key's tonic. */
  offset: number
  /** Chord type after the root: "", "m", "7", "maj7", "m7b5"… */
  suffix: string
}

export interface Pattern {
  id: string
  /** [Indonesian, English] label. */
  label: readonly [string, string]
  minor: boolean
  steps: Step[]
}

export interface ProgressionChord {
  /** Pitch class 0–11 (C = 0). */
  root: number
  suffix: string
  degree: string
  /** Spelled the way the key spells it: "Bb", "F#m". */
  name: string
}

/**
 * pop, 50s, sad, basic, ballad, canon, jazz, blues (12-bar) in major;
 * minor-epic, minor-rock, minor-andalusian, minor-jazz in minor.
 */
export declare const PATTERNS: Pattern[]

/** The chords of `pattern` in the key of `tonic` (pitch class, C = 0), optionally transposed. */
export declare function buildProgression(tonic: number, pattern: Pattern, transpose?: number): ProgressionChord[]
/** MIDI notes for the piano: the bass note, then the chord close around middle C. */
export declare function pianoVoicing(root: number, suffix: string): number[]
/** MIDI notes of the easiest guitar shape, low string first (`string` 0 = low E). */
export declare function guitarNotes(root: number, suffix: string): { string: number; midi: number }[]
/** "C     G     Am    F", a line break every `perLine` (default 4) chords. */
export declare function progressionText(chords: ProgressionChord[], perLine?: number): string
/** Whether a key is written with flats (F, B♭, E♭… major; D, G, C… minor). */
export declare const usesFlats: (tonic: number, minor: boolean) => boolean
/** A pitch class spelled in ASCII: "C#" or, with `flats`, "Db". */
export declare const spell: (n: number, flats: boolean) => string
