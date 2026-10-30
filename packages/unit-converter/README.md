# @chalidade/unit-converter

Convert units on any website: one `<script>` tag, one element. Length, weight,
area, volume, temperature, speed and data sizes, with every unit of a category
listed at once. **Everything runs in the visitor's browser**; nothing is sent anywhere.

Besides metric and imperial units it knows the Indonesian ones people still use:
*ons* (100 g), *kuintal* (100 kg), *are* (100 m²) and *tumbak* (14 m², a
traditional West Java land unit), and it accepts a decimal comma (`1,5`).

This is the [Unit Converter](https://chalidade.github.io/tools/#/unit-converter) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/unit-converter@0/dist/element.js"></script>

<unit-converter></unit-converter>
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
unit-converter {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/unit-converter
```

```js
import '@chalidade/unit-converter/element' // registers <unit-converter>
```

In React, `<unit-converter theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 2 KB gzipped:

```js
import { CATEGORIES, convert, parseNumber, formatResult } from '@chalidade/unit-converter'

const area = CATEGORIES.find((c) => c.id === 'area')
convert(area, 1, 'ha', 'm2')     // 10000
convert(area, 1, 'tumbak', 'm2') // 14

const temp = CATEGORIES.find((c) => c.id === 'temperature')
convert(temp, 98.6, 'f', 'c')    // 37

const length = CATEGORIES.find((c) => c.id === 'length')
formatResult(convert(length, parseNumber('1,5'), 'mi', 'km'), 'en-US') // '2.414016'
```

- Unit ids are listed in `CATEGORIES` (each unit has `id`, `symbol` and an
  `[Indonesian, English]` name). Categories: `length`, `weight`, `area`,
  `volume`, `temperature`, `speed`, `data`.
- `parseNumber()` returns `null` for text that isn't a number.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
