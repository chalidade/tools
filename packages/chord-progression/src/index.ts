// The headless API. The source lives with the site (src/tools/chord-progression/progression.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { PATTERNS, buildProgression } from '@chalidade/chord-progression'
//   buildProgression(7, PATTERNS[0]).map((c) => c.name) // ['G', 'D', 'Em', 'C']

export {
  PATTERNS,
  buildProgression,
  pianoVoicing,
  guitarNotes,
  progressionText,
  usesFlats,
  spell,
  type Step,
  type Pattern,
  type ProgressionChord,
} from '@/tools/chord-progression/progression'
