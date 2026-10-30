# @chalidade/terbilang

Spell out numbers in words on any website: one `<script>` tag, one element.
Indonesian (*terbilang*, as written on receipts, invoices and cheques) or
English, with an optional rupiah currency reading and letter-case options.
**Everything runs in the visitor's browser**; nothing is sent anywhere.

*Terbilang* is the Indonesian word for a number written out in words, the line
required on Indonesian receipts (*kwitansi*) and bank transfers. The tool also
reads English, so it works for international invoices too.

This is the [Number to Words](https://chalidade.github.io/tools/#/terbilang) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/terbilang@0/dist/element.js"></script>

<terbilang-converter></terbilang-converter>
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
terbilang-converter {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/terbilang
```

```js
import '@chalidade/terbilang/element' // registers <terbilang-converter>
```

In React, `<terbilang-converter theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 1.5 KB gzipped:

```js
import { parseNumber, toWords } from '@chalidade/terbilang'

const n = parseNumber('1.250.000') // Indonesian or English separators both work
toWords(n, { lang: 'id', currency: true, case: 'sentence' })
// 'Satu juta dua ratus lima puluh ribu rupiah'

toWords(parseNumber('42.5'), { lang: 'en', currency: false, case: 'lower' })
// 'forty-two point five'
```

- `parseNumber()` returns `null` for text that isn't a number, or longer than
  `MAX_DIGITS` (18) integer digits. Digits stay strings, so large values are exact.
- `case`: `'lower'`, `'upper'`, `'sentence'` or `'title'`.
- With `currency: true`, decimals are read as two-digit *sen*.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
