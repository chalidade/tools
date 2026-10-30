// The headless API. The source lives with the site (src/tools/mana-lebih-murah/).
//
//   import { compare } from '@chalidade/mana-lebih-murah'
//   compare([{ price: 15000, count: 1, size: 1, unit: 'kg' }, { price: 4000, count: 1, size: 250, unit: 'g' }])

export { unitPrice, compare, displayPrice, UNITS, type Unit, type Dimension, type Pack, type Ranked, type Comparison } from '@/tools/mana-lebih-murah/unit-price'
// The number reader the tool uses for its inputs ("1.500", "1,5"), from the percentage tool.
export { parseNumber } from '@/tools/persen/percent'
