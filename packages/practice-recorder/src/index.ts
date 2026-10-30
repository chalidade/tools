// The headless API: the metronome click the recorder plays over a take
// (src/tools/metronome/click.ts). Recording itself is plain MediaRecorder.
//
//   import { click } from '@chalidade/practice-recorder'
//   click(ctx, ctx.currentTime + 0.1, 'accent')

export { click } from '@/tools/metronome/click'
