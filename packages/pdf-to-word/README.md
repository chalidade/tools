# @chalidade/pdf-to-word

Convert PDFs to editable Word documents (.docx) on any website: one `<script>`
tag, one element. Lines are rebuilt into paragraphs, keeping font size, bold,
italic, centring and indents. **Everything runs in the visitor's browser** with
PDF.js and docx; the file is never uploaded.

This is the [PDF to Word](https://chalidade.github.io/tools/#/pdf-to-word) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pdf-to-word@0/dist/element.js"></script>

<pdf-to-word></pdf-to-word>
```

`element.js` is 95.18 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: PDF.js + its worker ~759 kB, docx ~120 kB).
Text is carried over, not the exact layout: images and drawn table borders are
left out. A scanned PDF (no text layer) throws `ScannedPdfError`.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
pdf-to-word {
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
npm install @chalidade/pdf-to-word
```

```js
import '@chalidade/pdf-to-word/element' // registers <pdf-to-word>
```

In React, `<pdf-to-word theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { buildDocx, convertPdf } from '@chalidade/pdf-to-word'

const conversion = await convertPdf(file, (done, total) => {})
conversion.pages              // 3
conversion.paragraphs.length  // 18
conversion.paragraphs[0].runs[0]
// { text: 'Quarterly report, page 1', size: 22, bold: true, italic: false, font: 'Helvetica' }

const docx = await buildDocx(conversion)
docx.type // 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
```

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
