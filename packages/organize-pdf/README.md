# @chalidade/organize-pdf

Reorder, delete, rotate and duplicate the pages of a PDF on any website: one
`<script>` tag, one element, with page thumbnails. **Everything runs in the
visitor's browser** with pdf-lib; the file is never uploaded.

This is the [Organize PDF Pages](https://chalidade.github.io/tools/#/organize-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/organize-pdf@0/dist/element.js"></script>

<organize-pdf></organize-pdf>
```

`element.js` is 93.39 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: pdf-lib ~184 kB, PDF.js + its worker ~759 kB, qpdf (WebAssembly) ~619 kB).
PDF.js draws the thumbnails, and qpdf only loads for a PDF with print/copy
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
organize-pdf {
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
npm install @chalidade/organize-pdf
```

```js
import '@chalidade/organize-pdf/element' // registers <organize-pdf>
```

In React, `<organize-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { moveItem, organizePdf, rotateBy } from '@chalidade/organize-pdf'

moveItem(['a', 'b', 'c'], 0, 2) // ['b', 'c', 'a']
rotateBy(270, 90)               // 0

// Page 3 first, then page 1 turned a quarter clockwise; page 2 left out.
const blob = await organizePdf(file, [
  { id: 1, src: 2, turn: 0 },
  { id: 2, src: 0, turn: 90 },
])
blob.type // 'application/pdf' (2 pages)
```

`src` is the 0-based page index in the source file; list a page twice to
duplicate it.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
