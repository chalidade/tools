// The headless API. The source lives with the site (src/tools/calculator/).
// A tokenizer and recursive-descent parser: input is never passed to eval().
//
//   import { evaluate } from '@chalidade/calculator'
//   evaluate('200 + 10%') // 220

export { evaluate, CalcError, clean, formatNumber, plainNumber, decimalPoint, type AngleMode } from '@/tools/calculator/engine'
