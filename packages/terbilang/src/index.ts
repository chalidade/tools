// The headless API. The source lives with the site (src/tools/terbilang/),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { parseNumber, toWords } from '@chalidade/terbilang'
//   toWords(parseNumber('1.250.000')!, { lang: 'id', currency: true, case: 'sentence' })

export { parseNumber, toWords, integerWords, applyCase, MAX_DIGITS, type Parsed, type Options, type Case } from '@/tools/terbilang/terbilang'
