// The headless API. The source lives with the site (src/tools/unit-converter/).
//
//   import { CATEGORIES, convert } from '@chalidade/unit-converter'
//   convert(CATEGORIES.find((c) => c.id === 'area')!, 1, 'ha', 'm2')

export { CATEGORIES, convert, parseNumber, formatResult, type Unit, type Category, type CategoryId } from '@/tools/unit-converter/units'
