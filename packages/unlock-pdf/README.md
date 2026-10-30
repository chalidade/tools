# @chalidade/unlock-pdf

Remove the password or the restrictions from your own PDF, on any website: one
`<script>` tag, one element. **Everything runs in the visitor's browser**
with qpdf compiled to WebAssembly; neither the file nor the password leaves
the device.

It does not crack passwords: a PDF that needs a password to open is only
decrypted when the visitor types that password. A PDF that opens freely but
forbids printing or copying (an owner password only) has those restrictions
removed.

This is the [Unlock PDF](https://chalidade.github.io/tools/#/unlock-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/unlock-pdf@0/dist/element.js"></script>

<unlock-pdf></unlock-pdf>
```

`element.js` is 95.89 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: qpdf (WebAssembly) ~619 kB).

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
unlock-pdf {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

### Content Security Policy

The PDF engines are bundled inside the package as `data:` URLs (no request to
any other server).
On a page with a strict CSP, the PDF engines run under this policy (tested in Chrome); add the CDN
you load `element.js` from to `script-src`:

```
default-src 'self'; script-src 'self' data: 'wasm-unsafe-eval'; worker-src blob:;
connect-src 'self' data:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'
```

## Use with npm

```bash
npm install @chalidade/unlock-pdf
```

```js
import '@chalidade/unlock-pdf/element' // registers <unlock-pdf>
```

In React, `<unlock-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { encryptionInfo, unlockPdf, WrongPasswordError } from '@chalidade/unlock-pdf'

const bytes = new Uint8Array(await file.arrayBuffer())
await encryptionInfo(bytes) // { encrypted: true, needsPassword: true }

await unlockPdf(bytes, 'wrong') // throws WrongPasswordError
const open = await unlockPdf(bytes, 'correct horse')
await encryptionInfo(open) // { encrypted: false, needsPassword: false }
```

For a PDF with `needsPassword: false`, call `unlockPdf(bytes)` without a
password to remove its restrictions.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
