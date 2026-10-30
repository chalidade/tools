// The headless API. The source lives with the site (src/tools/guitar/sound.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { GuitarSynth } from '@chalidade/guitar'
//   const guitar = new GuitarSynth()
//   ;[40, 47, 52, 56, 59, 64].forEach((midi, string) => guitar.pluck(string, midi, 0.8, guitar.ctx.currentTime + string * 0.03))

export { GuitarSynth, renderString, type Tone } from '@/tools/guitar/sound'
