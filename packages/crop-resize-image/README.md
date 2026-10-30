# @chalidade/crop-resize-image

Image cropping for any website: one `<script>` tag, one element. Crop freely or
to 1:1, 4:3, 16:9, 4:5 and more, rotate, flip, resize in pixels or percent,
and save as PNG, JPEG or WebP. **Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Crop & Resize Image](https://chalidade.github.io/tools/#/crop-resize-image) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/crop-resize-image@0/dist/element.js"></script>

<crop-resize-image></crop-resize-image>
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
crop-resize-image {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/crop-resize-image
```

```js
import '@chalidade/crop-resize-image/element' // registers <crop-resize-image>
```

In React, `<crop-resize-image theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React, about 1.5 KB gzipped:

```js
import { decodeImage, orient, fitRect, exportImage } from '@chalidade/crop-resize-image'

const img = await decodeImage(file)                                    // a 96×64 JPEG
const canvas = orient(img, { rotation: 90, flipX: false, flipY: false }) // 64×96
const crop = fitRect(canvas.width, canvas.height, 1)                   // { x: 0, y: 16, w: 64, h: 64 }
const blob = await exportImage(canvas, crop, { w: 32, h: 32 }, 'webp', 0.9) // image/webp, 1002 bytes
img.close()
```

- `dragRect(start, handle, dx, dy, ratio, W, H)` is the crop box after dragging
  an edge (`'n'`, `'e'`…), a corner (`'se'`…) or the box (`'move'`), kept inside
  the image and at the ratio: the maths behind the element's handles.
- `decodeImage` applies EXIF rotation and also reads SVG.


## Browser support

Current Chrome, Edge, Firefox and Safari, desktop and mobile. Pictures are
decoded by the browser itself, which also refuses absurd sizes: a 300 KB PNG
that claims 50000×50000 px is rejected in a few milliseconds instead of
allocating gigabytes.

## License

MIT © Chalid Ade Rahman. This package bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
