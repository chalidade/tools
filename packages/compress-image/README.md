# @chalidade/compress-image

Image compression for any website: one `<script>` tag, one element. Shrink many
photos at once to JPEG or WebP, cap their size, and download them one by one
or as a ZIP. Every result is free of metadata (EXIF, GPS location, XMP): when
re-encoding would not make a file smaller, the original picture is kept and
only its metadata is removed. **Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Compress Images](https://chalidade.github.io/tools/#/compress-image) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/compress-image@0/dist/element.js"></script>

<compress-image></compress-image>
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
compress-image {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/compress-image
```

```js
import '@chalidade/compress-image/element' // registers <compress-image>
```

In React, `<compress-image theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React, about 3.5 KB gzipped:

```js
import { compressImage, outputName } from '@chalidade/compress-image'

const { blob, width, height, kept } = await compressImage(file, { format: 'webp', quality: 0.75, maxSide: 1920 })
// 3000×2000 JPEG, 284885 bytes → image/webp, 1920×1280, 36328 bytes, kept: false

outputName(file, blob.type) // 'photo.webp'
```

- `format`: `'same'` keeps JPEG/WebP/PNG and turns anything else (GIF, BMP…)
  into JPEG, `'jpeg'` or `'webp'` (JPEG where the browser cannot encode WebP).
- `maxSide`: longest side in pixels, `0` keeps the size. Never upscales.
- Phone photos stored sideways (EXIF orientation) come out upright.


## Browser support

Current Chrome, Edge, Firefox and Safari, desktop and mobile. Pictures are
decoded by the browser itself, which also refuses absurd sizes: a 300 KB PNG
that claims 50000×50000 px is rejected in a few milliseconds instead of
allocating gigabytes.

## License

MIT © Chalid Ade Rahman. This package bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
