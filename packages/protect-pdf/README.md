# @chalidade/protect-pdf

Lock a PDF with a password on any website: one `<script>` tag, one element.
The PDF is encrypted with **AES-256** (PDF 2.0 security handler, revision 6)
and can forbid printing, copying text or editing. **Everything runs in the
visitor's browser** with qpdf compiled to WebAssembly; neither the file nor
the password leaves the device, and the password is not stored.

This is the [Protect PDF](https://chalidade.github.io/tools/#/protect-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/protect-pdf@0/dist/element.js"></script>

<protect-pdf></protect-pdf>
```

`element.js` is 96.10 kB gzipped (React and styles included). The
heavy libraries are separate files that load only when a visitor uses the
tool, from the same place as `element.js` (gzipped: qpdf (WebAssembly) ~619 kB).
The permissions are locked with a random owner password that nobody gets to
see, so the open password alone cannot lift them in readers that honour them.
Adobe Reader, browsers and most PDF apps do; some do not.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
protect-pdf {
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
npm install @chalidade/protect-pdf
```

```js
import '@chalidade/protect-pdf/element' // registers <protect-pdf>
```

In React, `<protect-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI: plain async functions for building your own interface. Browser only
(they use `File`, `Blob` and canvas).

```js
import { encryptionInfo, protectPdf } from '@chalidade/protect-pdf'

const bytes = new Uint8Array(await file.arrayBuffer())
const locked = await protectPdf(bytes, 'correct horse', { print: true, copy: false, modify: false })
await encryptionInfo(locked) // { encrypted: true, needsPassword: true }

// Already encrypted? protectPdf throws AlreadyEncryptedError.
await protectPdf(locked, 'x', { print: true, copy: true, modify: true }) // throws AlreadyEncryptedError
```

`pdfinfo` (poppler) on the result: `Encrypted: yes (print:yes copy:no change:no
addNotes:no algorithm:AES-256)`. The element asks for at least 4 characters;
`protectPdf` only refuses an empty password, so enforce your own policy.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
