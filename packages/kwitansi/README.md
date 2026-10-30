# @chalidade/kwitansi

Make PDF receipts (kwitansi) and invoices on any website: one `<script>`
tag, one element. Fill in the payee, the amount or invoice items with discount
and tax, and download an A4 PDF with the amount written out in words, in
Indonesian (`Satu juta dua ratus lima puluh ribu rupiah`) or English.
**Everything runs in the visitor's browser**; nothing is sent anywhere.

This is the [Receipt & Invoice](https://chalidade.github.io/tools/#/kwitansi) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/kwitansi@0/dist/element.js"></script>

<receipt-invoice></receipt-invoice>
```

The element script is about 93 KB gzipped with React included; pdf-lib loads
only when a PDF is made.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |
| `persist` | `false` = keep nothing in `localStorage` | the last document is kept in this page's `localStorage` (`tools.kwitansi`) so the next one starts filled in |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
receipt-invoice {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/kwitansi
```

```js
import '@chalidade/kwitansi/element' // registers <receipt-invoice>
```

In React, `<receipt-invoice theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React. `buildPdf` (pdf-lib, loaded on first use) and the rest run
in Node too.

```js
import { totals, amountWords, rupiahText, amountFromInput, buildPdf, setLanguage } from '@chalidade/kwitansi'

const items = [
  { id: 1, name: 'Website design', qty: 1, price: 2500000 },
  { id: 2, name: 'Hosting (1 year)', qty: 2, price: 450000 },
]
totals(items, 100000, 11) // discount Rp 100.000, tax 11%
// { subtotal: 3400000, discount: 100000, tax: 363000, total: 3663000 }

setLanguage('id')
rupiahText(3663000)  // 'Rp 3.663.000'
amountWords(3663000) // 'Tiga juta enam ratus enam puluh tiga ribu rupiah'
setLanguage('en')
amountWords(3663000) // 'Three million six hundred sixty-three thousand rupiah'

amountFromInput('Rp 1.250.000') // 1250000

const pdf = await buildPdf({
  mode: 'invoice', number: 'INV-001', date: '2026-10-30',
  fromName: 'Studio Budi', fromAddress: 'Jl. Merdeka 1, Malang', toName: 'PT Contoh', toAddress: 'Jakarta',
  purpose: '', amount: 0, items, discount: 100000, taxPercent: 11,
  notes: 'Thank you!', place: 'Malang', signer: 'Budi',
}) // Blob { type: 'application/pdf' }
```

Amounts are whole rupiah. The PDF uses the built-in Helvetica font, so
characters outside Latin-1 print as `?`. Without `setLanguage`, the language
follows the visitor's browser.


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
