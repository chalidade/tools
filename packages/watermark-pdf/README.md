# @chalidade/watermark-pdf

Put a translucent text or logo watermark on every page of a PDF, on any
website: one `<script>` tag, one element. Centred or tiled, any angle, with a
live preview that matches the output. **Everything runs in the visitor's
browser** with pdf-lib; the file is never uploaded.

This is the [Watermark PDF](https://chalidade.github.io/tools/#/watermark-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/watermark-pdf@0/dist/element.js"></script>

<watermark-pdf></watermark-pdf>
```

`element.js` is 94.29 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: pdf-lib ~184 kB, PDF.js + its worker ~759 kB, qpdf (WebAssembly) ~619 kB).
PDF.js draws the preview of page 1, and qpdf only loads for a PDF with
print/copy restrictions, to decrypt it first.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
watermark-pdf {
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
npm install @chalidade/watermark-pdf
```

```js
import '@chalidade/watermark-pdf/element' // registers <watermark-pdf>
```

In React, `<watermark-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { measureText, watermarkPdf } from '@chalidade/watermark-pdf'

await measureText('CONFIDENTIAL') // 7.444 (width at 1 pt)
await measureText('机密')          // null: the built-in PDF font can't draw it

const blob = await watermarkPdf(
  file,
  { kind: 'text', text: 'CONFIDENTIAL', image: null, color: 'red', opacity: 0.3, angle: 45, layout: 'tile', size: 'md' },
  (done, total) => console.log(`page ${done}/${total}`),
)
// page 1/3
// page 2/3
// page 3/3
blob.type // 'application/pdf'
```

For a logo, read it with `readWatermarkImage(imageFile)` and pass
`{ kind: 'image', image }`. Text watermarks use Helvetica Bold, which covers
Latin text; check with `measureText` first.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
