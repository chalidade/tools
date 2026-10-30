// The headless API. The source lives with the site (src/tools/drums/sound.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { DrumKit } from '@chalidade/drums'
//   const kit = new DrumKit()
//   kit.hit('kick'); kit.hit('snare', 0.9, kit.now + 0.5)

export { DrumKit, type Piece } from '@/tools/drums/sound'
