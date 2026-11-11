// The headless API. The source lives with the site (src/tools/text-diff/),
// so the tool on toowl.my.id and this package are the same code.
//
//   import { diffLines, withInline } from '@chalidade/text-diff'
//   const o = { ignoreCase: false, ignoreSpace: false }
//   withInline(diffLines(before, after, o), o) // lines, with word-level parts

export {
  diffLines,
  diffWords,
  diffTokens,
  withInline,
  splitLines,
  stats,
  type Op,
  type Piece,
  type Line,
  type Options,
} from '@/tools/text-diff/diff'
