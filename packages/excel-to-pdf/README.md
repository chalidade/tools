# @chalidade/excel-to-pdf

Convert spreadsheets to PDF on any website: one `<script>` tag, one element.
Drop an `.xlsx` or `.csv`, pick the sheets, paper, orientation, fit-to-width
and gridlines, and get a PDF with real, selectable text: number and date
formats, bold, colors, fills, borders and merged cells as in Excel.
**Everything runs in the visitor's browser**; the file is never uploaded.

This is the [Excel to PDF](https://chalidade.github.io/tools/#/excel-to-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/excel-to-pdf@0/dist/element.js"></script>

<excel-to-pdf></excel-to-pdf>
```

The element script is about 97 KB gzipped with React included; ExcelJS (285 KB
gzipped) and jsPDF load only when a file is opened or exported.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
excel-to-pdf {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/excel-to-pdf
```

```js
import '@chalidade/excel-to-pdf/element' // registers <excel-to-pdf>
```

In React, `<excel-to-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No React; it needs a browser (canvas for measuring text).

```js
import { readSpreadsheet, buildPdf, pageFor } from '@chalidade/excel-to-pdf'

const book = await readSpreadsheet(file) // .xlsx, .xlsm or .csv
const sheet = book.sheets[0]
sheet.rows.map((r) => r.map((c) => c.text))
// [['Item', 'Qty', 'Price', 'Date'],
//  ['Kopi susu', '3', '18,000.00', '30 Oct 2026'],
//  ['Roti bakar', '2', '15,000.50', '31 Oct 2026']]
sheet.rows[0][0].style // { bold: true, color: '#ffffff', fill: '#4472c4', align: 'left', … }

const opts = { page: 'a4', orientation: 'auto', fitWidth: true, gridlines: true }
pageFor(sheet, opts) // { pageW: 595.28, pageH: 841.89, landscape: false, scale: 1 }
const pdf = await buildPdf(book.sheets, opts, (done, total) => {}) // Blob { type: 'application/pdf' }
```

Formulas show their cached result, as Excel does when opening a file. CSV files
with `;` separators (common with a decimal comma) are detected. Hidden rows,
columns and sheets are skipped. A sheet that would span more than 2 million
cells (for example a crafted merge over the whole grid) is rejected with
`UnsupportedSheetError` instead of hanging the tab.


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
