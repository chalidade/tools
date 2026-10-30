# @chalidade/text-diff

Compare two texts on any website: one `<script>` tag, one element. Paste the
before and after versions and see what changed, line by line and word by word,
in a unified or side-by-side view. **Everything runs in the visitor's browser**;
neither text is sent anywhere.

This is the [Text Compare](https://chalidade.github.io/tools/#/text-diff) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/text-diff@0/dist/element.js"></script>

<text-diff></text-diff>
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
text-diff {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/text-diff
```

```js
import '@chalidade/text-diff/element' // registers <text-diff>
```

In React, `<text-diff theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 1 KB gzipped:

```js
import { diffLines, withInline, stats } from '@chalidade/text-diff'

const o = { ignoreCase: false, ignoreSpace: true }
const lines = withInline(diffLines(before, after, o), o)

for (const line of lines) {
  // line.op: 'eq' | 'add' | 'del'
  // line.parts (on changed lines): word pieces, each with its own op, to highlight
}

stats(lines) // { added, removed, same }
```

- `diffWords(left, right, options)` diffs two strings word by word.
- `diffTokens(a, b)` diffs any two arrays of strings (characters, tokens, CSV cells…).

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
