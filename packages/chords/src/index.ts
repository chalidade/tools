// The headless API. The source lives with the site (src/tools/chords/theory.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { voicings, INSTRUMENTS, CHORD_TYPES, transposeSheet } from '@chalidade/chords'
//   voicings(INSTRUMENTS[0], 0, CHORD_TYPES[0]) // C major shapes, [[-1, 3, 2, 0, 1, 0], …]

export {
  CHORD_TYPES,
  INSTRUMENTS,
  voicings,
  barreOf,
  isChord,
  transposeChord,
  transposeSheet,
  firstChordRoot,
  type ChordType,
  type Instrument,
  type Voicing,
} from '@/tools/chords/theory'
export { pluck } from '@/lib/music'
