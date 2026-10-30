# @chalidade/convert-image

Image format conversion for any website: one `<script>` tag, one element. Turn
HEIC (iPhone photos), WebP, AVIF, PNG, GIF or JPG into JPG, PNG or WebP, many
files at once, and download them one by one or as a ZIP. **Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Convert Image Format](https://chalidade.github.io/tools/#/convert-image) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/convert-image@0/dist/element.js"></script>

<convert-image></convert-image>
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
convert-image {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/convert-image
```

```js
import '@chalidade/convert-image/element' // registers <convert-image>
```

In React, `<convert-image theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React, about 1 KB gzipped; the HEIC decoder (libheif in
WebAssembly, about 730 KB gzipped) loads only when a HEIC file is opened.

```js
import { convertImage, targetName } from '@chalidade/convert-image'

const { blob, width, height } = await convertImage(file, 'image/jpeg', 0.9)
// 96×64 PNG, 785 bytes → image/jpeg, 96×64, 2122 bytes (transparency flattened onto white)

targetName(file, 'image/webp') // 'gps.png' → 'gps.webp'
```

- Targets: `'image/jpeg'`, `'image/png'`, `'image/webp'`. `quality` (0–1) is
  ignored for PNG.
- `isHeic(file)` and `decodeHeic(file)` (→ `ImageData`) are exported too.
- Converting re-draws the picture, so the result carries no EXIF/GPS metadata.


## Browser support

Current Chrome, Edge, Firefox and Safari, desktop and mobile. Pictures are
decoded by the browser itself (HEIC by libheif in WebAssembly, in every browser), which also refuses absurd sizes: a 300 KB PNG
that claims 50000×50000 px is rejected in a few milliseconds instead of
allocating gigabytes.

## License

MIT © Chalid Ade Rahman. This package bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
