// The headless API. The source lives with the site (src/tools/persen/).
//
//   import { stackedDiscount } from '@chalidade/persen'
//   stackedDiscount(100_000, [50, 20]).combined // 60

export {
  percentOf,
  whatPercent,
  percentChange,
  stackedDiscount,
  parseNumber,
  finite,
  type DiscountStep,
  type Discounts,
} from '@/tools/persen/percent'
