# @chalidade/pdf-to-image

Save PDF pages as PNG or JPG images, up to 300 dpi, on any website: one
`<script>` tag, one element. One page downloads as an image, several as a
ZIP. **Everything runs in the visitor's browser** with PDF.js; the file is
never uploaded.

This is the [PDF to Images](https://chalidade.github.io/tools/#/pdf-to-image) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pdf-to-image@0/dist/element.js"></script>

<pdf-to-image></pdf-to-image>
```

`element.js` is 92.90 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: PDF.js + its worker ~759 kB, JSZip ~32 kB).
Very large pages are rendered at a lower resolution than asked, so a canvas
never exceeds what browsers can allocate.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
pdf-to-image {
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
npm install @chalidade/pdf-to-image
```

```js
import '@chalidade/pdf-to-image/element' // registers <pdf-to-image>
```

In React, `<pdf-to-image theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { exportImages } from '@chalidade/pdf-to-image'

const one = await exportImages(file, [1], { dpi: 150, format: 'png', baseName: 'report' }, (done, total) => {})
one.fileName  // 'report-1.png'
one.blob.type // 'image/png'

const all = await exportImages(file, [1, 2, 3], { dpi: 72, format: 'jpg', baseName: 'report' }, () => {})
all.fileName  // 'report-images.zip'
```

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
