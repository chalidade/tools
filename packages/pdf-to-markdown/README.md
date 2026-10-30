# @chalidade/pdf-to-markdown

Turn PDFs into Markdown on any website: one `<script>` tag, one element.
Headings come from font size, **bold** and *italic* are kept, lists and
tables are rebuilt. **Everything runs in the visitor's browser** with PDF.js;
the file is never uploaded.

This is the [PDF to Markdown](https://chalidade.github.io/tools/#/pdf-to-markdown) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pdf-to-markdown@0/dist/element.js"></script>

<pdf-to-markdown></pdf-to-markdown>
```

`element.js` is 93.04 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: PDF.js + its worker ~759 kB).
Text is escaped, so characters like `*`, `_`, `[` or `<` in the PDF can't turn
into Markdown formatting, links or HTML. A scanned PDF (no text layer) throws
`ScannedPdfError`.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
pdf-to-markdown {
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
npm install @chalidade/pdf-to-markdown
```

```js
import '@chalidade/pdf-to-markdown/element' // registers <pdf-to-markdown>
```

In React, `<pdf-to-markdown theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { readPdfText, toMarkdown } from '@chalidade/pdf-to-markdown'

const pages = await readPdfText(file, (done, total) => {})
console.log(toMarkdown(pages, { pageBreaks: true }))
```

Output for a small three-page report (first page):

```md
# Quarterly report, page 1

Sales grew in every region this quarter, led by the east coast stores. The board approved the new budget for the next financial year.

| Region | Q1 | Q2 |
| --- | --- | --- |
| North | 1,200 | 1,350 |
| South | 980 | 1,105 |
| East | 2,040 | 2,300 |

---
```

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
