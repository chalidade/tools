# @chalidade/pdf-to-excel

Pull tables out of PDFs into Excel spreadsheets (.xlsx) on any website: one
`<script>` tag, one element. Columns are found from where the text sits, and
numbers such as `Rp15.500.000`, `1,234.50` or `12,5%` become real numbers.
**Everything runs in the visitor's browser** with PDF.js and ExcelJS; the file
is never uploaded.

This is the [PDF to Excel](https://chalidade.github.io/tools/#/pdf-to-excel) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pdf-to-excel@0/dist/element.js"></script>

<pdf-to-excel></pdf-to-excel>
```

`element.js` is 93.80 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: PDF.js + its worker ~759 kB, ExcelJS ~285 kB).
A scanned PDF (no text layer) throws `ScannedPdfError`.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
pdf-to-excel {
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
npm install @chalidade/pdf-to-excel
```

```js
import '@chalidade/pdf-to-excel/element' // registers <pdf-to-excel>
```

In React, `<pdf-to-excel theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { assemble, buildXlsx, readPdf } from '@chalidade/pdf-to-excel'

const pages = await readPdf(file, (done, total) => {})
const result = assemble(pages, { mode: 'merge', convertNumbers: true })
result.tables                                // 3
result.sheets.map((s) => s.name)             // ['Data']
result.sheets[0].rows[4].cells
// [
//   { text: 'North', bold: false },
//   { text: '1,200', bold: false, value: 1200, numFmt: '#,##0' },
//   { text: '1,350', bold: false, value: 1350, numFmt: '#,##0' },
// ]

const xlsx = await buildXlsx(result)
xlsx.type // 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
```

`readPdf` reads the PDF once; re-run `assemble` for other options (`mode:
'per-page'` for one sheet per page) without reading it again.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
