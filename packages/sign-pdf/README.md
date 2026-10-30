# @chalidade/sign-pdf

Let visitors sign a PDF on any website: one `<script>` tag, one element. They
draw a signature (or upload a photo of one, with the paper made transparent),
then drag and resize it on any page. **Everything runs in the visitor's
browser** with pdf-lib; neither the PDF nor the signature is uploaded.

The result is a PDF with an image of the signature, not a certified
(cryptographic) digital signature. The element says so too.

This is the [Sign PDF](https://chalidade.github.io/tools/#/sign-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/sign-pdf@0/dist/element.js"></script>

<sign-pdf></sign-pdf>
```

`element.js` is 96.16 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: pdf-lib ~184 kB, PDF.js + its worker ~759 kB, qpdf (WebAssembly) ~619 kB).
PDF.js draws the pages, and qpdf only loads for a PDF with print/copy
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
sign-pdf {
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
npm install @chalidade/sign-pdf
```

```js
import '@chalidade/sign-pdf/element' // registers <sign-pdf>
```

In React, `<sign-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { readSignatureImage, signPdf } from '@chalidade/sign-pdf'

// photo: a PNG/JPG of dark ink on light paper; true = make the paper transparent
const signature = await readSignatureImage(photo, true)
// { width: 374, height: 104, png: Uint8Array(3472), url: 'blob:…' }

// Bottom right of page 3, a quarter of the page wide (fractions of the page, from its top-left)
const blob = await signPdf(file, signature, [{ id: 'a', page: 3, x: 0.6, y: 0.8, w: 0.25 }])
blob.type // 'application/pdf'
```

To sign from a drawing, draw on a `<canvas>` and pass it to
`trimToSignature(canvas)`.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
