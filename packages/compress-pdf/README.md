# @chalidade/compress-pdf

Shrink PDFs on any website: one `<script>` tag, one element. The photos inside
are scaled down and re-encoded, then the file is repacked with compressed
object streams; text stays text and stays sharp. **Everything runs in the
visitor's browser** with qpdf compiled to WebAssembly; the file is never
uploaded.

This is the [Compress PDF](https://chalidade.github.io/tools/#/compress-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/compress-pdf@0/dist/element.js"></script>

<compress-pdf></compress-pdf>
```

`element.js` is 93.23 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: qpdf (WebAssembly) ~619 kB).
Only JPEG photos in RGB or grey are re-encoded, and only when that makes them
at least 10 % smaller; the result is never larger than the input.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
compress-pdf {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

### Content Security Policy

The PDF engines are bundled inside the package as `data:` URLs (no request to
any other server).
On a page with a strict CSP, the PDF engines run under this policy (tested in Chrome); add the CDN
you load `element.js` from to `script-src`:

```
default-src 'self'; script-src 'self' data: 'wasm-unsafe-eval'; worker-src blob:;
connect-src 'self' data:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'
```

## Use with npm

```bash
npm install @chalidade/compress-pdf
```

```js
import '@chalidade/compress-pdf/element' // registers <compress-pdf>
```

In React, `<compress-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { compressPdf } from '@chalidade/compress-pdf'

const input = new Uint8Array(await file.arrayBuffer())
const result = await compressPdf(input, 'medium', (stage) => console.log(stage))
// Reading the PDF structure…
// Shrinking image 1/1…
// Rebuilding the PDF…
result.before // 369004
result.after  // 61805
result.images // { found: 1, shrunk: 1 }
// result.output is the compressed PDF (Uint8Array)
```

Levels: `light` (photos up to 2400 px, JPEG quality 0.82), `medium` (1600 px,
0.7), `strong` (1100 px, 0.55).

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
