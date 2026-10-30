# @chalidade/qr-generator

Make QR codes on any website: one `<script>` tag, one element. Links, text,
Wi-Fi, WhatsApp, contact cards, email and phone numbers, with three module
shapes, your colors, an optional logo in the middle, and PNG or SVG downloads.
Every code is read back by a real scanner before you download it, so you know
it scans. **Everything runs in the visitor's browser**; nothing is uploaded.

This is the [QR Code Generator](https://chalidade.github.io/tools/#/qr-generator) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/qr-generator@0/dist/element.js"></script>

<qr-generator></qr-generator>
```

The element script is about 96 KB gzipped with React included. The ZXing
WebAssembly reader (1.27 MB, 528 KB gzipped, inlined in a lazy chunk next to
`element.js`) loads when the first code is checked; nothing is fetched from
another CDN.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
qr-generator {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/qr-generator
```

```js
import '@chalidade/qr-generator/element' // registers <qr-generator>
```

In React, `<qr-generator theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React. `qrMatrix` loads node-qrcode on first use; `toSvg` is
plain string work and also runs in Node.

```js
import { qrMatrix, toSvg, toCanvas, buildWifi, buildContact, normalizeUrl } from '@chalidade/qr-generator'

const text = buildWifi({ ssid: 'Warung Kopi', password: 'kopi;susu', security: 'WPA', hidden: false })
// 'WIFI:T:WPA;S:Warung Kopi;P:kopi\\;susu;;'

const m = await qrMatrix(text, 'M') // m.size === 29
const svg = toSvg(m, { fg: '#111111', bg: '#ffffff', margin: 4, style: 'rounded', logo: null })
// '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37 37" …'

const canvas = await toCanvas(m, { fg: '#111111', bg: null, margin: 4, style: 'dots', logo: null }, 1024) // browser only

normalizeUrl('example.com/menu') // 'https://example.com/menu'
```

- `buildWhatsApp`, `buildEmail`, `buildPhone`, `buildContact` (vCard 3.0) build
  the other payloads; `internationalPhone('0812-3456-7890')` gives
  `'6281234567890'` (a leading 0 is read as Indonesian, +62).
- With a `logo` (a data or object URL), use error level `'H'`: the logo covers
  part of the code and only H recovers 30%.
- Text that doesn't fit one QR code makes `qrMatrix` reject
  (`The amount of data is too big to be stored in a QR Code`).


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
