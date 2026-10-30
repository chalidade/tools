# @chalidade/json-beautify

Pretty-print JSON on any website: one `<script>` tag, one element. Paste or
drop a file, pick 2 spaces, 4 spaces or tabs, optionally sort keys A–Z, and
syntax errors are shown with their line, column and a jump to the spot. Numbers
are copied exactly, never rounded. **Everything runs in the visitor's
browser**; nothing is sent anywhere.

This is the [JSON Beautifier](https://chalidade.github.io/tools/#/json-beautify) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/json-beautify@0/dist/element.js"></script>

<json-beautify></json-beautify>
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
json-beautify {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/json-beautify
```

```js
import '@chalidade/json-beautify/element' // registers <json-beautify>
```

In React, `<json-beautify theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, runs in Node too. Unlike `JSON.parse`, numbers are never
turned into doubles, so `12345678901234567890` and `1.50` come out exactly as
they went in.

```js
import { parseJson, formatJson, minifyJson, stats, JsonSyntaxError } from '@chalidade/json-beautify'

const ast = parseJson('{"id": 12345678901234567890, "price": 1.50, "tags": ["a", "b"]}')
formatJson(ast, { indent: 2, sortKeys: false })
// '{\n  "id": 12345678901234567890,\n  "price": 1.50,\n  "tags": [\n    "a",\n    "b"\n  ]\n}\n'
minifyJson(ast) // '{"id":12345678901234567890,"price":1.50,"tags":["a","b"]}'
stats(ast)      // { keys: 3, depth: 2 }

try {
  parseJson('{"a": 1,}')
} catch (e) {
  e instanceof JsonSyntaxError // true
  e.message                    // 'Trailing comma before }'
  [e.line, e.column]           // [1, 9]
}
```

`formatJson` also takes `indent: 4` or `'tab'`, and `sortKeys: true` orders
object keys A–Z. Error messages follow the visitor's browser language.


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
