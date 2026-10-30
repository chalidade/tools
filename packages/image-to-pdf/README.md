# @chalidade/image-to-pdf

Combine photos and images into one PDF on any website: one `<script>` tag,
one element. Add as many as you like, drag to reorder, rotate, and choose A4,
Letter or pages that fit each image, with a margin. Phone photos come out
upright (EXIF), PNG screenshots stay lossless. **Everything runs in the
visitor's browser**; no image is uploaded.

This is the [Images to PDF](https://chalidade.github.io/tools/#/image-to-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/image-to-pdf@0/dist/element.js"></script>

<image-to-pdf></image-to-pdf>
```

The element script is about 97 KB gzipped with React included; jsPDF loads only
when the PDF is made.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
image-to-pdf {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/image-to-pdf
```

```js
import '@chalidade/image-to-pdf/element' // registers <image-to-pdf>
```

In React, `<image-to-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No React; `loadImage` and `buildPdf` need a browser, `layout` and
`rotatedSize` run in Node too.

```js
import { loadImage, buildPdf, layout } from '@chalidade/image-to-pdf'

const item = await loadImage(file)
// { id: 'img-0', file, width: 1200, height: 800, rotation: 0, thumb: 'data:image/jpeg;base64,…' }

const pdf = await buildPdf([item, { ...item, rotation: 90 }], { page: 'a4', orientation: 'auto', margin: 24 }, (done, total) => {})
// Blob { type: 'application/pdf' }

layout({ width: 4000, height: 3000, rotation: 90 }, { page: 'a4', orientation: 'auto', margin: 24 })
// { pageW: 595.28, pageH: 841.89, x: 24, y: 56.0916666666667, w: 547.28, h: 729.7066666666666 } (points)
```

`loadImage` throws `UnsupportedImageError` (with `fileName`) for files the
browser can't decode, such as HEIC outside Safari.


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
