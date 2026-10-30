# @chalidade/merge-pdf

Combine several PDFs into one file on any website: one `<script>` tag, one
element. Visitors drop their files, drag them into order and download the
merged PDF. **Everything runs in the visitor's browser** with pdf-lib; the files
are never uploaded.

This is the [Merge PDF](https://chalidade.github.io/tools/#/merge-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/merge-pdf@0/dist/element.js"></script>

<merge-pdf></merge-pdf>
```

`element.js` is 93.33 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: pdf-lib ~184 kB, PDF.js + its worker ~759 kB, qpdf (WebAssembly) ~619 kB).
PDF.js draws the first-page previews. qpdf only loads for a PDF that carries
print/copy restrictions, to decrypt it before merging; a PDF that needs a
password to open is refused (`LockedPdfError`).

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
merge-pdf {
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
npm install @chalidade/merge-pdf
```

```js
import '@chalidade/merge-pdf/element' // registers <merge-pdf>
```

In React, `<merge-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { loadPdfItem, mergePdfs } from '@chalidade/merge-pdf'

// a and b are File objects, e.g. from <input type="file" multiple>
const blob = await mergePdfs([{ file: a }, { file: b }], (done, total) => console.log(`merged ${done}/${total}`))
// merged 1/2
// merged 2/2
blob.type // 'application/pdf'

// Page count and a first-page preview, for your own file list:
const item = await loadPdfItem(a)
item.pages // 3
item.thumb // 'data:image/jpeg;base64,…'
```

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
