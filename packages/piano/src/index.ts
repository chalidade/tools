// The headless API. The source lives with the site (src/tools/piano/sound.ts, songs.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { PianoSynth } from '@chalidade/piano'
//   const piano = new PianoSynth()
//   piano.noteOn(60); setTimeout(() => piano.noteOff(60), 500)

export { PianoSynth, VOICES, type Voice } from '@/tools/piano/sound'
export { SONGS, SCALES, scaleSong, parseMidi, stepsOf, rangeOf, type Note, type Song, type Step } from '@/tools/piano/songs'
