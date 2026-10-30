// The headless API. The source lives with the site (src/tools/guitar-tuner/pitch.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { detectPitch, TUNINGS } from '@chalidade/guitar-tuner'
//   detectPitch(samples, 48000, 60, 400) // { freq: 110.02, clarity: 0.99 } or null

export { detectPitch, TUNINGS, type Pitch, type Tuning } from '@/tools/guitar-tuner/pitch'
export { midiToFreq, freqToMidi, noteName } from '@/lib/music'
