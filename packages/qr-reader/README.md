# @chalidade/qr-reader

Scan QR codes and barcodes on any website: one `<script>` tag, one element.
From an image, a pasted screenshot or the camera. Wi-Fi codes, contact cards,
links, WhatsApp, email and phone codes are shown as readable fields, and links
are only offered when they are http(s), mailto, tel or sms. Reads QR, Micro QR,
Data Matrix, Aztec, PDF417, EAN, UPC, Code 128/39/93, ITF and Codabar with
ZXing compiled to WebAssembly. **Everything runs in the visitor's browser**;
no picture or camera frame leaves the device.

This is the [QR & Barcode Reader](https://chalidade.github.io/tools/#/qr-reader) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/qr-reader@0/dist/element.js"></script>

<qr-reader></qr-reader>
```

The element script is about 95 KB gzipped with React included. The ZXing
WebAssembly reader (1.27 MB, 528 KB gzipped, inlined in a lazy chunk next to
`element.js`) loads only when the first scan runs; nothing is fetched from
another CDN.

The camera needs HTTPS (or localhost). The element listens for image pastes
on the whole page while it shows the "From image" source.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
qr-reader {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/qr-reader
```

```js
import '@chalidade/qr-reader/element' // registers <qr-reader>
```

In React, `<qr-reader theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React. Scanning needs a browser (canvas, `createImageBitmap`);
`parseQr` also runs in Node.

```js
import { scanFile, scanPixels, parseQr, formatName } from '@chalidade/qr-reader'

await scanFile(file) // a File from <input type="file">, a drop or a paste
// [{ text: 'https://example.com/x', format: 'QRCode' }]

await scanPixels(ctx.getImageData(0, 0, w, h).data, w, h) // e.g. a video frame

parseQr('WIFI:T:WPA;S:Warung Kopi;P:kopi\\;susu;;')
// { kind: 'wifi', title: 'Wi-Fi network', fields: [
//   { label: 'Network name (SSID)', value: 'Warung Kopi' },
//   { label: 'Password', value: 'kopi;susu', secret: true },
//   { label: 'Security', value: 'WPA' } ] }

parseQr('javascript:alert(1)').href // undefined: never offered as a link
formatName('EAN13')                 // 'Barcode EAN-13'
```

`scanFile` returns up to 8 codes per picture, tries rotated and inverted codes,
and throws `UnreadableImageError` when the browser can't decode the file.
Labels follow the visitor's browser language.


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
