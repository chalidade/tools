# @chalidade/image-to-base64

Turn images into Base64 on any website, and back: one `<script>` tag, one
element. Drop, pick or paste an image to get a data URL, bare Base64, an HTML
`<img>`, a CSS `background-image` or Markdown, byte for byte (no
re-encoding). Paste Base64 or a data URL to see and download the image; its
type is checked from the bytes, not from what the text claims. **Everything
runs in the visitor's browser**; nothing is uploaded.

This is the [Image ⇄ Base64](https://chalidade.github.io/tools/#/image-to-base64) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/image-to-base64@0/dist/element.js"></script>

<image-to-base64></image-to-base64>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
image-to-base64 {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/image-to-base64
```

```js
import '@chalidade/image-to-base64/element' // registers <image-to-base64>
```

In React, `<image-to-base64 theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React. `fileToDataUrl` needs a browser; the rest runs in Node too.

```js
import { fileToDataUrl, snippet, decodeBase64Image, sniffMime, NotBase64Error, NotImageError } from '@chalidade/image-to-base64'

const dataUrl = await fileToDataUrl(file) // 'data:image/png;base64,iVBORw0KGgo…'

snippet('html', 'data:image/png;base64,iVBORw0KGgo=', 'logo.png')     // '<img src="data:image/png;base64,iVBORw0KGgo=" alt="logo">'
snippet('markdown', 'data:image/png;base64,iVBORw0KGgo=', 'logo.png') // '![logo](data:image/png;base64,iVBORw0KGgo=)'
snippet('css', 'data:image/png;base64,iVBORw0KGgo=', 'logo.png')      // 'background-image: url("data:image/png;base64,iVBORw0KGgo=");'

// Pasted straight from CSS: the url("…") wrapper is ignored, and the type comes from the bytes.
decodeBase64Image('background: url("data:image/png;base64,R0lGODlhAQABAAAAACw=");')
// { blob: Blob, mime: 'image/gif', ext: 'gif', size: 14 }

decodeBase64Image('aGVsbG8=')    // throws NotImageError ("hello" is not an image)
decodeBase64Image('not base64!') // throws NotBase64Error
sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47])) // 'image/png'
```


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
