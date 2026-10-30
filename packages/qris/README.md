# @chalidade/qris

Turn a shop's static QRIS into a QR code that asks for a set amount, on any
website: one `<script>` tag, one element. Scan the printed QRIS from a photo,
screenshot or the camera, type the amount, and download the new code as PNG
or SVG. The merchant data is kept as it is, the amount goes in tag 54 and the
CRC is recomputed; a code whose own CRC doesn't match is flagged.
**Everything runs in the visitor's browser**; nothing is sent to any server.
Scan the result once with a payment app before giving it to customers.

This is the [QRIS Amount](https://chalidade.github.io/tools/#/qris) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/qris@0/dist/element.js"></script>

<qris-amount></qris-amount>
```

The element script is about 98 KB gzipped with React included. The ZXing
WebAssembly reader (1.27 MB, 528 KB gzipped, inlined in a lazy chunk next to
`element.js`) loads only when the first QRIS is scanned. The camera needs HTTPS
(or localhost).

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
qris-amount {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/qris
```

```js
import '@chalidade/qris/element' // registers <qris-amount>
```

In React, `<qris-amount theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, plain string work that runs in Node too. Pair it with
[`@chalidade/qr-reader`](https://www.npmjs.com/package/@chalidade/qr-reader) to
read the QRIS and
[`@chalidade/qr-generator`](https://www.npmjs.com/package/@chalidade/qr-generator)
to draw the new code.

```js
import { readQris, parseAmount, withAmount, crc16 } from '@chalidade/qris'

// The text of a scanned static QRIS (a made-up shop here).
const scanned = '00020101021126570011ID.DANA.WWW011893600915302259148102090225914810303UMI51440014ID.CO.QRIS.WWW0215ID10200211817450303UMI5204899953033605802ID5909TOKO BUDI6006MALANG61056511162070703A0163046CFC'

const info = readQris(scanned)
// { merchant: 'TOKO BUDI', city: 'MALANG', dynamic: false, amount: '', crcOk: true, items: [12 items] }

parseAmount('Rp 25.000')  // '25000'
parseAmount('25.000,50')  // '25000.5'
parseAmount('0')          // null

withAmount(info, '25000')
// '00020101021226570011ID.DANA.WWW011893600915302259148102090225914810303UMI51440014ID.CO.QRIS.WWW0215ID10200211817450303UMI5204899953033605405250005802ID5909TOKO BUDI6006MALANG61056511162070703A0163048B3C'
// tag 01 is now 12 (dynamic), tag 54 holds 25000, and the CRC (last 4 characters) is new

crc16('123456789') // '29B1' (CRC-16/CCITT-FALSE check value)
```

`readQris` throws `NotQrisError` with a readable message for anything that
isn't an Indonesian QRIS (`'This is not a QRIS: it is not in EMV format (it
must start with 000201).'`).


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
