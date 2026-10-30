# @chalidade/page-numbers

Add page numbers to a PDF on any website: one `<script>` tag, one element.
Pick the position, the format (`1`, `1 / 10`, `Page 1`, `- 1 -`), the first page
that gets a number and the number it starts at. **Everything runs in the
visitor's browser** with pdf-lib; the file is never uploaded.

This is the [PDF Page Numbers](https://chalidade.github.io/tools/#/page-numbers) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/page-numbers@0/dist/element.js"></script>

<page-numbers></page-numbers>
```

`element.js` is 93.20 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: pdf-lib ~184 kB, PDF.js + its worker ~759 kB, qpdf (WebAssembly) ~619 kB).
PDF.js draws the preview, and qpdf only loads for a PDF with print/copy
restrictions, to decrypt it first.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
page-numbers {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

### Content Security Policy

The PDF engines are bundled inside the package as `data:` URLs (no request to
any other server), and the PDF.js worker starts from a `blob:` URL.
On a page with a strict CSP, the PDF engines run under this policy (tested in Chrome); add the CDN
you load `element.js` from to `script-src`:

```
default-src 'self'; script-src 'self' data: 'wasm-unsafe-eval'; worker-src blob:;
connect-src 'self' data:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'
```

## Use with npm

```bash
npm install @chalidade/page-numbers
```

```js
import '@chalidade/page-numbers/element' // registers <page-numbers>
```

In React, `<page-numbers theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { numberFor, numberPdf, pageLabel } from '@chalidade/page-numbers'

pageLabel('of-total', 3, 12) // '3 / 12'
numberFor(1, { format: 'plain', v: 'bottom', h: 'center', fromPage: 2, startAt: 1, size: 11 }) // null: page 1 is skipped

const blob = await numberPdf(
  file,
  { format: 'of-total', v: 'bottom', h: 'right', fromPage: 1, startAt: 1, size: 11 },
  (done, total) => {},
)
blob.type // 'application/pdf'
```

The `word` format prints `Page 1` in English and `Halaman 1` in Indonesian,
following the UI language.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
