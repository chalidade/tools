# @chalidade/calculator

A basic and scientific calculator for any website: one `<script>` tag, one
element. Type or tap, see the result as you type, and reuse earlier results
from the history. **Everything runs in the visitor's browser**; nothing is sent
anywhere.

The expression is read by a small tokenizer and recursive-descent parser,
never `eval()`, so typed text can only ever be arithmetic. It understands
phone-calculator percent (200 + 10% = 220), × ÷ −, a comma or dot as the
decimal point, implicit multiplication (2π, 3(4+5)), powers, roots, factorials,
trigonometry in degrees or radians, logarithms and `Ans`.

This is the [Calculator](https://chalidade.github.io/tools/#/calculator) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/calculator@0/dist/element.js"></script>

<basic-calculator></basic-calculator>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |
| `persist` | `false`: keep no history in storage | the last 50 results are kept (localStorage) |

### Where the data lives

The last 50 calculations are kept in localStorage (key `tools:calculator`) **under your site's origin**, the same storage your own
scripts use, so any script on your pages can read it. Nothing is ever sent
anywhere. Add `persist="false"` for a kiosk, a shared computer, or a demo where
nothing should stay behind.

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
basic-calculator {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/calculator
```

```js
import '@chalidade/calculator/element' // registers <basic-calculator>
```

In React, `<basic-calculator theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

The parser without the UI, about 6 KB gzipped:

```js
import { evaluate, clean, CalcError } from '@chalidade/calculator'

clean(evaluate('200 + 10%'))  // 220
clean(evaluate('2π'))         // 6.28318530718
clean(evaluate('3(4+5)'))     // 27
clean(evaluate('sin(30)'))    // 0.5  (degrees by default)
clean(evaluate('0.1 + 0.2'))  // 0.3
evaluate('asin(1)', { angle: 'rad' }) // 1.5707963267948966

try {
  evaluate('alert(1)')
} catch (e) {
  e instanceof CalcError // true
  e.message              // 'Unknown: alert'
}
```

- `evaluate()` throws `CalcError` for anything that isn't arithmetic
  (`alert(1)`, `constructor`, `1;2`…), for dividing by zero and for results that
  are NaN or infinite. Brackets nested thousands deep exceed the call stack and
  throw a `RangeError` instead.
- `clean()` rounds binary noise away (12 significant digits); `formatNumber()`
  and `plainNumber()` format a result with the UI language's separators.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
