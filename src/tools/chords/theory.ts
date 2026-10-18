import { FLATS, SHARPS, parseNote, pc } from '@/lib/music'

/*
 * Chord shapes are generated, not typed in: for every 4-fret window up the
 * neck, every combination of muted / open / fretted strings that sounds the
 * chord is scored for playability, and the best few distinct ones are kept.
 * That covers every root × chord type on any tuning with no shape table to
 * maintain — and the scoring lands on the familiar open shapes (C x32010,
 * G 320003, Am x02210…) first.
 */

export interface ChordType {
  /** As written after the root: "", "m", "7", "maj7"… */
  suffix: string
  label: readonly [string, string]
  /** Semitones above the root. The first is always 0. */
  intervals: number[]
}

export const CHORD_TYPES: ChordType[] = [
  { suffix: '', label: ['Mayor', 'Major'], intervals: [0, 4, 7] },
  { suffix: 'm', label: ['Minor', 'Minor'], intervals: [0, 3, 7] },
  { suffix: '7', label: ['Dominan 7', 'Dominant 7'], intervals: [0, 4, 7, 10] },
  { suffix: 'maj7', label: ['Mayor 7', 'Major 7'], intervals: [0, 4, 7, 11] },
  { suffix: 'm7', label: ['Minor 7', 'Minor 7'], intervals: [0, 3, 7, 10] },
  { suffix: 'sus2', label: ['Sus 2', 'Sus 2'], intervals: [0, 2, 7] },
  { suffix: 'sus4', label: ['Sus 4', 'Sus 4'], intervals: [0, 5, 7] },
  { suffix: '7sus4', label: ['7 sus 4', '7 sus 4'], intervals: [0, 5, 7, 10] },
  { suffix: 'add9', label: ['Add 9', 'Add 9'], intervals: [0, 4, 7, 2] },
  { suffix: '6', label: ['Mayor 6', 'Major 6'], intervals: [0, 4, 7, 9] },
  { suffix: 'm6', label: ['Minor 6', 'Minor 6'], intervals: [0, 3, 7, 9] },
  { suffix: '9', label: ['Dominan 9', 'Dominant 9'], intervals: [0, 4, 7, 10, 2] },
  { suffix: 'dim', label: ['Diminished', 'Diminished'], intervals: [0, 3, 6] },
  { suffix: 'dim7', label: ['Diminished 7', 'Diminished 7'], intervals: [0, 3, 6, 9] },
  { suffix: 'm7b5', label: ['Half-diminished', 'Half-diminished'], intervals: [0, 3, 6, 10] },
  { suffix: 'aug', label: ['Augmented', 'Augmented'], intervals: [0, 4, 8] },
]

export interface Instrument {
  id: 'guitar' | 'ukulele'
  label: readonly [string, string]
  /** MIDI notes, the string drawn on the left first. */
  strings: number[]
  /** Lowest sounding note must be the root (guitar), or anything goes (re-entrant ukulele). */
  rootInBass: boolean
}

export const INSTRUMENTS: Instrument[] = [
  { id: 'guitar', label: ['Gitar', 'Guitar'], strings: [40, 45, 50, 55, 59, 64], rootInBass: true },
  { id: 'ukulele', label: ['Ukulele', 'Ukulele'], strings: [67, 60, 64, 69], rootInBass: false },
]

/** One fret per string; -1 = muted, 0 = open. */
export type Voicing = number[]

const SPAN = 3 // highest fretted − lowest fretted
const MAX_FRET = 12

/** Fingers needed, letting one finger barre the lowest fret when it can. */
function fingers(v: Voicing): number {
  const fretted = v.filter((f) => f > 0)
  if (fretted.length === 0) return 0
  const low = Math.min(...fretted)
  const first = v.findIndex((f) => f === low)
  // A barre lies flat from its first string to the last: nothing under it may be open or muted.
  const canBarre = v.slice(first).every((f) => f >= low)
  const atLow = fretted.filter((f) => f === low).length
  return canBarre && atLow > 1 ? fretted.length - atLow + 1 : fretted.length
}

/** The barre to draw for a shape, if its lowest fret is held by one flat finger. */
export function barreOf(v: Voicing): { fret: number; from: number; to: number } | null {
  const fretted = v.filter((f) => f > 0)
  if (fretted.length < 2) return null
  const low = Math.min(...fretted)
  const first = v.findIndex((f) => f === low)
  const last = v.lastIndexOf(low)
  if (first === last || !v.slice(first).every((f) => f >= low)) return null
  return { fret: low, from: first, to: v.length - 1 }
}

export function voicings(inst: Instrument, root: number, type: ChordType, limit = 6): Voicing[] {
  const tones = new Set(type.intervals.map((i) => pc(root + i)))
  const fifth = pc(root + 7)
  // A perfect fifth adds little to a 4+ note chord and is the usual note to drop.
  const optional = type.intervals.length >= 4 && type.intervals.includes(7) ? fifth : -1
  const required = [...tones].filter((t) => t !== optional)
  const n = inst.strings.length
  const found = new Map<string, { v: Voicing; score: number }>()

  for (let base = 0; base <= MAX_FRET - SPAN; base++) {
    const lo = Math.max(1, base)
    const options = inst.strings.map((open) => {
      const opts: number[] = [-1]
      if (tones.has(pc(open))) opts.push(0)
      for (let f = lo; f <= lo + SPAN; f++) if (tones.has(pc(open + f))) opts.push(f)
      return opts
    })
    const v: number[] = Array.from({ length: n }, () => -1)
    const walk = (s: number) => {
      if (s === n) return consider([...v])
      for (const f of options[s]) {
        v[s] = f
        walk(s + 1)
      }
    }
    walk(0)
  }

  function consider(v: Voicing) {
    const sounding = v.map((f, i) => (f < 0 ? null : inst.strings[i] + f))
    const notes = sounding.filter((x): x is number => x !== null)
    if (notes.length < Math.min(n, 3)) return
    const pcs = new Set(notes.map(pc))
    if (!required.every((t) => pcs.has(t))) return

    // Muted strings only at the bass end, and at most two of them.
    const muted = v.filter((f) => f < 0).length
    const firstSounding = v.findIndex((f) => f >= 0)
    if (v.slice(firstSounding).some((f) => f < 0)) return
    if (muted > (inst.rootInBass ? 2 : 0)) return
    if (inst.rootInBass && pc(Math.min(...notes)) !== root) return

    const fretted = v.filter((f) => f > 0)
    if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > SPAN) return
    const fingerCount = fingers(v)
    if (fingerCount > 4) return

    const position = fretted.length ? Math.min(...fretted) : 0
    // Up the neck, an open string in the middle of the shape cannot be reached cleanly.
    if (position >= 5 && v.some((f, i) => f === 0 && v.slice(0, i).some((x) => x > 0) && v.slice(i + 1).some((x) => x > 0))) return
    const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0
    const opens = v.filter((f) => f === 0).length
    // An open string right next to a finger at fret 4+ is a reach most hands avoid.
    const awkward = v.filter((f, i) => f === 0 && (v[i - 1] >= 4 || v[i + 1] >= 4)).length
    // Open strings above a high position ring against the shape — fine low down, odd higher up.
    const farOpens = position > 4 ? opens : 0
    const score =
      position * 1.2 +
      muted * 1.5 +
      fingerCount * 0.6 +
      (span === 3 ? 1.5 : span === 2 ? 0.3 : 0) +
      awkward * 1.2 +
      farOpens * 2 -
      opens * 0.3 +
      (pcs.has(fifth) ? 0 : 0.8)
    const key = v.join(',')
    if (!found.has(key)) found.set(key, { v, score })
  }

  // Best first, but one shape per neck position so the list shows real alternatives.
  const sorted = [...found.values()].sort((a, b) => a.score - b.score)
  const picked: { v: Voicing; score: number }[] = []
  const positions = new Set<number>()
  for (const c of sorted) {
    const fretted = c.v.filter((f) => f > 0)
    const position = fretted.length ? Math.min(...fretted) : 0
    const bucket = position <= 3 ? 0 : position
    if (positions.has(bucket) && picked.length > 0 && bucket !== 0) continue
    if (bucket === 0 && picked.filter((p) => Math.min(...p.v.filter((f) => f > 0), 99) <= 3).length >= 2) continue
    positions.add(bucket)
    picked.push(c)
    if (picked.length >= limit) break
  }
  return picked.map((p) => p.v)
}

/* ---- Chord symbols in song sheets ---- */

const CHORD_RE = /^([A-G](?:#|b|♯|♭)?)((?:maj|min|m|M|dim|aug|sus|add|°|ø|\+|-|[0-9]|\(|\)|b|#|♯|♭)*)(?:\/([A-G](?:#|b|♯|♭)?))?$/

/** True when `token` reads as a chord symbol: "C", "F#m7", "Bb/D", "Gsus4". */
export const isChord = (token: string) => CHORD_RE.test(token)

/** Spells a pitch class in ASCII, as people type chords: "C#" / "Db". */
const spell = (n: number, flats: boolean) => (flats ? FLATS : SHARPS)[pc(n)].replace('♯', '#').replace('♭', 'b')

export function transposeChord(token: string, steps: number, flats: boolean): string {
  const m = CHORD_RE.exec(token)
  if (!m) return token
  const root = parseNote(m[1])!
  const bass = m[3] ? parseNote(m[3]) : null
  return spell(root + steps, flats) + m[2] + (bass !== null ? '/' + spell(bass + steps, flats) : '')
}

/**
 * Transposes a song sheet: lines made only of chords (plus bar marks like "|"
 * or "x2") keep their column alignment; chords in [brackets] inside lyric
 * lines change too; everything else is left as typed.
 */
export function transposeSheet(text: string, steps: number, flats: boolean): string {
  return text
    .split('\n')
    .map((line) => {
      const withBrackets = line.replace(/\[([^\]\s]+)\]/g, (all, c: string) =>
        isChord(c) ? `[${transposeChord(c, steps, flats)}]` : all,
      )
      const tokens = line.trim().split(/\s+/).filter(Boolean)
      const chordLine =
        tokens.some(isChord) &&
        tokens.every((tok) => isChord(tok) || /^(\||\|\||-+|\/|x\d+|\d+x|%|\.+|N\.?C\.?|[A-Za-z][\w-]*:)$/i.test(tok))
      if (!chordLine) return withBrackets
      // Rewrite token by token, keeping each chord where it started: a longer
      // chord eats into the gap after it, a shorter one pads it.
      let out = ''
      let debt = 0
      for (const part of line.split(/(\s+)/)) {
        if (!part) continue
        if (/^\s+$/.test(part)) {
          const keep = Math.max(1, part.length - debt)
          debt = Math.max(0, debt - (part.length - keep))
          out += ' '.repeat(keep)
        } else {
          const next = isChord(part) ? transposeChord(part, steps, flats) : part
          debt += next.length - part.length
          out += next
        }
      }
      return out
    })
    .join('\n')
}

/** Root of the first chord in the sheet, to name the key it lands in. */
export function firstChordRoot(text: string): number | null {
  for (const token of text.split(/[\s[\]]+/)) {
    const m = CHORD_RE.exec(token)
    if (m && isChordLineToken(text, token)) return parseNote(m[1])
  }
  return null
}

// "A" alone is also an English word; only trust a bare one-letter chord on a chord line.
function isChordLineToken(text: string, token: string) {
  if (token.length > 1) return true
  return text.split('\n').some((line) => transposeSheet(line, 1, false) !== line && line.split(/\s+/).includes(token))
}
