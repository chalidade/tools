// The headless API: parse, retime, merge and write SRT/VTT subtitles, no UI.
// The source lives with the site (src/tools/subtitle/subtitle.ts), so the
// tool on toowl.my.id and this package are the same code.
//
//   import { parseSubtitle, shiftCues, writeSubtitle } from '@chalidade/subtitle'
//   const vtt = writeSubtitle(shiftCues(parseSubtitle(srtText), 1.5), 'vtt')

export {
  parseSubtitle,
  formatTime,
  writeSubtitle,
  shiftCues,
  stretchCues,
  mergeCues,
  type Cue,
  type SubFormat,
} from '@/tools/subtitle/subtitle'
