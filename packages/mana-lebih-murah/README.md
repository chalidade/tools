# @chalidade/mana-lebih-murah

A unit-price comparison for any website: one `<script>` tag, one element.
Enter a few packs (price, pieces, size in g / kg / ml / L / pcs) and it marks
the cheapest per unit and how much more the others cost. **Everything runs in
the visitor's browser**; nothing is sent anywhere.

*Mana lebih murah?* is Indonesian for "which is cheaper?", the question behind
every supermarket shelf of different pack sizes. Prices are labelled in rupiah,
but the comparison works in any currency.

This is the [Which Is Cheaper](https://chalidade.github.io/tools/#/mana-lebih-murah) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/mana-lebih-murah@0/dist/element.js"></script>

<unit-price-compare></unit-price-compare>
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
unit-price-compare {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/mana-lebih-murah
```

```js
import '@chalidade/mana-lebih-murah/element' // registers <unit-price-compare>
```

In React, `<unit-price-compare theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, under 1 KB gzipped:

```js
import { compare, unitPrice, displayPrice } from '@chalidade/mana-lebih-murah'

const packs = [
  { price: 15000, count: 1, size: 1, unit: 'kg' },
  { price: 4000, count: 1, size: 250, unit: 'g' },
  { price: 22000, count: 6, size: 250, unit: 'g' }, // 6 × 250 g
]
compare(packs)
// { best: 2, extra: [2.27…, 9.09…, 0], mixed: false }  (percent dearer than the best)

displayPrice(unitPrice(packs[2])) // { per: '100 g', value: 1466.6666666666665 }
```

- `unitPrice()` returns `null` unless price, count and size are all positive.
- Mixing dimensions (g with ml) sets `mixed: true`; only packs of the first
  dimension are ranked, the others get `null`.
- `parseNumber()` (the input reader, `'12.500'` → 12500, `'1,5'` → 1.5) is
  exported too.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
