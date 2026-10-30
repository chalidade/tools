# @chalidade/split-pdf

Split a PDF on any website: one `<script>` tag, one element. Pick pages by
clicking them, type ranges like `1-3, 5, 8-`, or cut every N pages. Several
parts download as one ZIP. **Everything runs in the visitor's browser** with
pdf-lib; the file is never uploaded.

This is the [Split PDF](https://chalidade.github.io/tools/#/split-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/split-pdf@0/dist/element.js"></script>

<split-pdf></split-pdf>
```

`element.js` is 93.41 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: pdf-lib ~184 kB, PDF.js + its worker ~759 kB, qpdf (WebAssembly) ~619 kB, JSZip ~32 kB).
PDF.js draws the page previews, JSZip packs several parts into one ZIP, and qpdf
only loads for a PDF with print/copy restrictions, to decrypt it first.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
split-pdf {
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
npm install @chalidade/split-pdf
```

```js
import '@chalidade/split-pdf/element' // registers <split-pdf>
```

In React, `<split-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { chunkPages, parseRanges, splitPdf } from '@chalidade/split-pdf'

parseRanges('1-2, 3', 3) // [[1, 2], [3]]
parseRanges('2-9', 3)    // '“2-9” is outside pages 1–3.' (an error message, as a string)
chunkPages(10, 3)        // [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]

const { blob, fileName } = await splitPdf(file, [[1, 2], [3]], 'report', (done, total) => {})
fileName // 'report-split.zip' (two PDFs inside)

await splitPdf(file, [[2]], 'report', () => {})
// { fileName: 'report-page-2.pdf', blob: Blob { type: 'application/pdf' } }
```

File names inside the result follow the UI language: `page`/`pages` in English,
`hlm` in Indonesian.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
