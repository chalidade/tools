// The headless API. The source lives with the site (src/tools/word-counter/),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { analyze } from '@chalidade/word-counter'
//   analyze(text) // { words, chars, sentences, readMinutes, … }

export {
  analyze,
  countWords,
  countSentences,
  graphemeLength,
  minutesToParts,
  LIMITS,
  READ_WPM,
  SPEAK_WPM,
  type TextStats,
  type Limit,
} from '@/tools/word-counter/count'
