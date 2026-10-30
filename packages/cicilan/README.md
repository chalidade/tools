# @chalidade/cicilan

A loan instalment calculator for any website: one `<script>` tag, one element.
Flat or annuity interest, the month-by-month schedule, total interest, and a
CSV download. **Everything runs in the visitor's browser**; nothing is sent anywhere.

*Cicilan* is Indonesian for instalments. The two interest methods are the ones
Indonesian lenders quote: **flat** (interest on the original principal for the
whole term, common for vehicle and consumer loans) and **annuity** or
*bunga efektif* (interest on the remaining balance, equal payments, as in
mortgages). Amounts are labelled in rupiah, but the maths is currency-free.
Fees, insurance and penalties are not included.

This is the [Loan Instalment Calculator](https://chalidade.github.io/tools/#/cicilan) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/cicilan@0/dist/element.js"></script>

<loan-calculator></loan-calculator>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
loan-calculator {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/cicilan
```

```js
import '@chalidade/cicilan/element' // registers <loan-calculator>
```

In React, `<loan-calculator theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, under 1 KB gzipped:

```js
import { buildLoan, loanCsv } from '@chalidade/cicilan'

const a = buildLoan(100_000_000, 12, 12, 'annuity') // principal, yearly %, months
Math.round(a.monthly)       // 8884879
Math.round(a.totalInterest) // 6618546

const f = buildLoan(100_000_000, 12, 12, 'flat')
Math.round(f.monthly)       // 9333333
Math.round(f.totalInterest) // 12000000

buildLoan(100_000_000, 12, 0, 'flat') // null

loanCsv(buildLoan(1_000_000, 12, 2, 'annuity').rows)
// bulan,angsuran,pokok,bunga,sisa_pokok
// 1,507512.44,497512.44,10000.00,502487.56
// 2,507512.44,502487.56,5024.88,0.00
```

- `rows` has `month`, `payment`, `principal`, `interest` and `balance` per month,
  unrounded.
- `buildLoan()` returns `null` unless the principal is positive, the rate is 0
  or more and the term is a whole number of months from 1 to `MAX_MONTHS` (1200).
- The CSV header is Indonesian (month, payment, principal, interest, balance).

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
