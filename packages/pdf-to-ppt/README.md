# @chalidade/pdf-to-ppt

Turn PDFs into PowerPoint decks (.pptx) on any website: one `<script>` tag, one
element. Each page becomes a slide of the same size. In editable mode the page
is drawn without its text as the background, and every run of text becomes a
real text box on top, in its position, size, style and colour. **Everything
runs in the visitor's browser** with PDF.js and PptxGenJS; the file is never
uploaded.

This is the [PDF to PowerPoint](https://chalidade.github.io/tools/#/pdf-to-ppt) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pdf-to-ppt@0/dist/element.js"></script>

<pdf-to-ppt></pdf-to-ppt>
```

`element.js` is 95.62 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: PDF.js + its worker ~759 kB, PptxGenJS ~130 kB).

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
pdf-to-ppt {
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
npm install @chalidade/pdf-to-ppt
```

```js
import '@chalidade/pdf-to-ppt/element' // registers <pdf-to-ppt>
```

In React, `<pdf-to-ppt theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { buildPptx, readPdfPages } from '@chalidade/pdf-to-ppt'

const pages = await readPdfPages(file, (done, total) => {})
pages.length // 3
pages[0].boxes[0]
// { text: 'Quarterly report, page 1', x: 72, y: 64.4, w: 280.36712, h: 27.5,
//   size: 22, bold: true, italic: false, font: 'Helvetica', color: '050505' }

const pptx = await buildPptx(pages, 'editable') // or 'image': one picture per slide
pptx.size // 131328
```

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
