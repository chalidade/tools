# @chalidade/persen

A percentage calculator for any website: one `<script>` tag, one element.
X% of Y, what percent, percent change, and stacked discounts, each with the
working shown. **Everything runs in the visitor's browser**; nothing is sent anywhere.

Stacked discounts are the ones shops advertise as "50% + 20%": each applies to
the price left by the one before, so together they take 60% off, not 70%. Inputs
accept both Indonesian (`1.500,5`) and English (`1,500.5`) number formats.

This is the [Percentage & Discount Calculator](https://chalidade.github.io/tools/#/persen) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/persen@0/dist/element.js"></script>

<percent-calculator></percent-calculator>
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
percent-calculator {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/persen
```

```js
import '@chalidade/persen/element' // registers <percent-calculator>
```

In React, `<percent-calculator theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 0.7 KB gzipped. No rounding: format the results yourself.

```js
import { percentOf, whatPercent, percentChange, stackedDiscount, parseNumber } from '@chalidade/persen'

percentOf(15, 80_000)  // 12000  (15% of 80,000)
whatPercent(30, 120)   // 25     (30 is 25% of 120)
percentChange(80, 100) // 25     (+25%)

stackedDiscount(250_000, [50, 20])
// { steps: [...], final: 100000, saved: 150000, combined: 60 }

;['1.500', '1.500,5', '1,500.5', '12,5', 'abc'].map(parseNumber)
// [1500, 1500.5, 1500.5, 12.5, NaN]
```

- `whatPercent()` and `percentChange()` return `null` when dividing by zero.
- `parseNumber()` treats the last separator as the decimal point unless exactly
  three digits follow it, so `'1.500'` and `'1,500'` are both 1500.
- `stackedDiscount()` does not cap percentages: a discount above 100% gives a
  negative price.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
