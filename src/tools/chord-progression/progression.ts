import { FLATS, SHARPS, pc } from '@/lib/music'
import { CHORD_TYPES, INSTRUMENTS, voicings } from '@/tools/chords/theory'

/*
 * Progressions are stored as steps from the tonic (semitones + chord type),
 * so any key is just a different root. Voicings come from the same generator
 * the chord dictionary uses; nothing is typed in per key.
 */

export interface Step {
  /** Roman numeral as printed on a chart: "vi", "V7"… */
  degree: string
  /** Semitones above the key's tonic. */
  offset: number
  suffix: string
}

export interface Pattern {
  id: string
  label: readonly [string, string]
  minor: boolean
  steps: Step[]
}

const s = (degree: string, offset: number, suffix = ''): Step => ({ degree, offset, suffix })

export const PATTERNS: Pattern[] = [
  { id: 'pop', label: ['Pop: I–V–vi–IV', 'Pop: I–V–vi–IV'], minor: false, steps: [s('I', 0), s('V', 7), s('vi', 9, 'm'), s('IV', 5)] },
  { id: '50s', label: ['Tahun 50-an: I–vi–IV–V', '50s: I–vi–IV–V'], minor: false, steps: [s('I', 0), s('vi', 9, 'm'), s('IV', 5), s('V', 7)] },
  { id: 'sad', label: ['Syahdu: vi–IV–I–V', 'Emotional: vi–IV–I–V'], minor: false, steps: [s('vi', 9, 'm'), s('IV', 5), s('I', 0), s('V', 7)] },
  { id: 'basic', label: ['Dasar: I–IV–V–I', 'Basic: I–IV–V–I'], minor: false, steps: [s('I', 0), s('IV', 5), s('V', 7), s('I', 0)] },
  { id: 'ballad', label: ['Balada: I–iii–IV–V', 'Ballad: I–iii–IV–V'], minor: false, steps: [s('I', 0), s('iii', 4, 'm'), s('IV', 5), s('V', 7)] },
  {
    id: 'canon',
    label: ['Canon: I–V–vi–iii–IV–I–IV–V', 'Canon: I–V–vi–iii–IV–I–IV–V'],
    minor: false,
    steps: [s('I', 0), s('V', 7), s('vi', 9, 'm'), s('iii', 4, 'm'), s('IV', 5), s('I', 0), s('IV', 5), s('V', 7)],
  },
  {
    id: 'jazz',
    label: ['Jazz: ii–V–I', 'Jazz: ii–V–I'],
    minor: false,
    steps: [s('ii7', 2, 'm7'), s('V7', 7, '7'), s('Imaj7', 0, 'maj7'), s('Imaj7', 0, 'maj7')],
  },
  {
    id: 'blues',
    label: ['Blues 12 birama', '12-bar blues'],
    minor: false,
    steps: [
      s('I7', 0, '7'),
      s('I7', 0, '7'),
      s('I7', 0, '7'),
      s('I7', 0, '7'),
      s('IV7', 5, '7'),
      s('IV7', 5, '7'),
      s('I7', 0, '7'),
      s('I7', 0, '7'),
      s('V7', 7, '7'),
      s('IV7', 5, '7'),
      s('I7', 0, '7'),
      s('V7', 7, '7'),
    ],
  },
  { id: 'minor-epic', label: ['Minor: i–VII–VI–VII', 'Minor: i–VII–VI–VII'], minor: true, steps: [s('i', 0, 'm'), s('VII', 10), s('VI', 8), s('VII', 10)] },
  { id: 'minor-rock', label: ['Minor: i–VI–III–VII', 'Minor: i–VI–III–VII'], minor: true, steps: [s('i', 0, 'm'), s('VI', 8), s('III', 3), s('VII', 10)] },
  { id: 'minor-andalusian', label: ['Andalusia: i–VII–VI–V', 'Andalusian: i–VII–VI–V'], minor: true, steps: [s('i', 0, 'm'), s('VII', 10), s('VI', 8), s('V', 7)] },
  {
    id: 'minor-jazz',
    label: ['Minor jazz: iiø–V7–i', 'Minor jazz: iiø–V7–i'],
    minor: true,
    steps: [s('iiø7', 2, 'm7b5'), s('V7', 7, '7'), s('i7', 0, 'm7'), s('i7', 0, 'm7')],
  },
]

export interface ProgressionChord {
  root: number
  suffix: string
  degree: string
  name: string
}

/** Major keys that read better with flats (F, B♭, E♭…), and the same for minor. */
const FLAT_MAJOR = new Set([5, 10, 3, 8, 1, 6])
const FLAT_MINOR = new Set([2, 7, 0, 5, 10, 3])
export const usesFlats = (tonic: number, minor: boolean) => (minor ? FLAT_MINOR : FLAT_MAJOR).has(pc(tonic))

/** A pitch class spelled in ASCII, as chords are typed: "C#" / "Bb". */
export const spell = (n: number, flats: boolean) => (flats ? FLATS : SHARPS)[pc(n)].replace('♯', '#').replace('♭', 'b')

export function buildProgression(tonic: number, pattern: Pattern, transpose = 0): ProgressionChord[] {
  const key = pc(tonic + transpose)
  const flats = usesFlats(key, pattern.minor)
  return pattern.steps.map((st) => {
    const root = pc(key + st.offset)
    return { root, suffix: st.suffix, degree: st.degree, name: spell(root, flats) + st.suffix }
  })
}

const typeOf = (suffix: string) => CHORD_TYPES.find((c) => c.suffix === suffix) ?? CHORD_TYPES[0]

/** Chord tones stacked close together around middle C, bass note first (for the piano). */
export function pianoVoicing(root: number, suffix: string): number[] {
  const tones = typeOf(suffix).intervals.map((i) => 48 + pc(root) + i)
  // Move the chord down an octave if its top would run too high, so every key sits in the same register.
  const shift = Math.max(...tones) > 66 ? -12 : 0
  return [tones[0] - 12, ...tones.map((n) => n + shift)]
}

const GUITAR = INSTRUMENTS.find((i) => i.id === 'guitar')!

/** MIDI notes of the easiest guitar shape for the chord, low string first. */
export function guitarNotes(root: number, suffix: string): { string: number; midi: number }[] {
  const shape = voicings(GUITAR, root, typeOf(suffix), 1)[0]
  if (!shape) return pianoVoicing(root, suffix).map((midi, i) => ({ string: i, midi }))
  const out: { string: number; midi: number }[] = []
  shape.forEach((fret, i) => {
    if (fret >= 0) out.push({ string: i, midi: GUITAR.strings[i] + fret })
  })
  return out
}

/** The text version of a progression: "C  G  Am  F", wrapping every `perLine` chords. */
export function progressionText(chords: ProgressionChord[], perLine = 4) {
  const lines: string[] = []
  for (let i = 0; i < chords.length; i += perLine) lines.push(chords.slice(i, i + perLine).map((c) => c.name.padEnd(6)).join('').trimEnd())
  return lines.join('\n')
}
