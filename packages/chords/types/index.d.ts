// Public types of @chalidade/chords. They mirror src/tools/chords/theory.ts
// and src/lib/music.ts; types/check.ts fails the build if they drift.

export interface ChordType {
  /** As written after the root: "", "m", "7", "maj7"… */
  suffix: string
  /** [Indonesian, English] label. */
  label: readonly [string, string]
  /** Semitones above the root. The first is always 0. */
  intervals: number[]
}

export interface Instrument {
  id: 'guitar' | 'ukulele'
  /** [Indonesian, English] label. */
  label: readonly [string, string]
  /** MIDI notes, the string drawn on the left first. */
  strings: number[]
  /** Lowest sounding note must be the root (guitar), or anything goes (re-entrant ukulele). */
  rootInBass: boolean
}

/** One fret per string, lowest string first; -1 = muted, 0 = open. */
export type Voicing = number[]

/** The 16 chord types: major, m, 7, maj7, m7, sus2, sus4, 7sus4, add9, 6, m6, 9, dim, dim7, m7b5, aug. */
export declare const CHORD_TYPES: ChordType[]
/** Standard-tuned guitar (E A D G B E) and re-entrant ukulele (G C E A). */
export declare const INSTRUMENTS: Instrument[]

/**
 * Playable shapes of the chord `root` (pitch class 0–11, C = 0) + `type`,
 * easiest first, at most one per neck position. Generated, not looked up, so
 * every root × type works.
 */
export declare function voicings(inst: Instrument, root: number, type: ChordType, limit?: number): Voicing[]
/** The barre to draw for a shape, if its lowest fret is held by one flat finger. */
export declare function barreOf(v: Voicing): { fret: number; from: number; to: number } | null

/** True when `token` reads as a chord symbol: "C", "F#m7", "Bb/D", "Gsus4". */
export declare const isChord: (token: string) => boolean
/** "F#m7" up 2 → "G#m7" (or "Abm7" with `flats`). Slash basses move too; anything else comes back unchanged. */
export declare function transposeChord(token: string, steps: number, flats: boolean): string
/**
 * Transposes a song sheet: chord-only lines keep their column alignment,
 * [bracketed] chords inside lyrics change too, everything else stays as typed.
 */
export declare function transposeSheet(text: string, steps: number, flats: boolean): string
/** Pitch class of the first chord in a sheet (to name the key it is in), or null. */
export declare function firstChordRoot(text: string): number | null

/** A plucked-string (Karplus–Strong) note as a mono AudioBuffer. */
export declare function pluck(ctx: BaseAudioContext, freq: number, seconds?: number): AudioBuffer
