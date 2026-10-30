# @chalidade/zakat

A zakat calculator for any website: one `<script>` tag, one element. Income,
wealth (*mal*), gold and silver, and *fitrah*, with the formula shown for each.
**Everything runs in the visitor's browser**; nothing is sent anywhere, and no
price is fetched.

*Zakat* is the obligatory annual alms in Islam: 2.5% of qualifying wealth once
it reaches the *nisab* (the value of 85 g of gold) and has been held for a lunar
year. *Zakat fitrah* is a fixed amount of staple food (2.5 kg of rice) per
person, paid before Eid al-Fitr. The rules follow common Indonesian guidance
(Baznas / Kemenag); amounts are in rupiah but the maths works in any currency.
The visitor enters today's gold price themselves. It is a calculation aid, not
a religious ruling.

This is the [Zakat Calculator](https://chalidade.github.io/tools/#/zakat) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/zakat@0/dist/element.js"></script>

<zakat-calculator></zakat-calculator>
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
zakat-calculator {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/zakat
```

```js
import '@chalidade/zakat/element' // registers <zakat-calculator>
```

In React, `<zakat-calculator theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, under 1 KB gzipped:

```js
import { zakatMal, zakatIncome, zakatMetal, zakatFitrah, GOLD_NISAB_G } from '@chalidade/zakat'

const gold = 1_500_000 // price of 1 g of gold, entered by you

zakatMal(200_000_000, 10_000_000, gold)    // assets, debts due
// { nisab: 127500000, base: 190000000, reached: true, zakat: 4750000 }

zakatIncome(15_000_000, 0, 2_000_000, gold) // monthly income, other income, instalments
// { nisab: 10625000, base: 13000000, reached: true, zakat: 325000 }

zakatMetal(100, GOLD_NISAB_G, gold)        // 100 g of gold held
// { nisabGrams: 85, reached: true, zakatGrams: 2.5, zakat: 3750000 }

zakatFitrah(4, 15_000)                     // 4 people, rice at 15,000/kg
// { kg: 10, zakat: 150000 }
```

- Income zakat is judged monthly against a twelfth of the yearly gold nisab.
- `num()` reads user input like `'1.500.000'`, `'1,500,000'` or `'2,5'`
  and returns 0 for anything that isn't a positive number.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
