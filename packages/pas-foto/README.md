# @chalidade/pas-foto

An ID photo maker for any website: one `<script>` tag, one element. Crop a
photo to 2×3, 3×4 or 4×6 cm, swap its plain backdrop for red, blue or white,
then lay copies out on 4R or A4 paper and save a print-ready JPG, PNG or PDF at
300 DPI. **Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [ID Photo](https://chalidade.github.io/tools/#/pas-foto) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pas-foto@0/dist/element.js"></script>

<pas-foto></pas-foto>
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
pas-foto {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/pas-foto
```

```js
import '@chalidade/pas-foto/element' // registers <pas-foto>
```

In React, `<pas-foto lang="en" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React, about 2.5 KB gzipped (jsPDF loads only for PDF, in the element):

```js
import { decodeImage, renderPhoto, mmToPx, sheetLayout, PAPERS } from '@chalidade/pas-foto'

const img = await decodeImage(file)
const photo = renderPhoto(img, mmToPx(30), mmToPx(40), { zoom: 1, ox: 0, oy: 0 }, 'red', 20)
// a 354×472 canvas (3×4 cm at 300 DPI), the backdrop now red: corner pixel [215, 25, 32, 255]

sheetLayout(PAPERS[0], 30, 40, 8)
// { paperW: 152, paperH: 102, cols: 4, rows: 2, cells: [{ x: 13, y: 10 }, …8 cells] }  (mm, 4R landscape)
```

- The backdrop is found by a flood fill from the top edge, within `tolerance`
  (0–100), so it works best on a plain wall or cloth. `'keep'` leaves it as is.
- `SIZES`, `PAPERS`, `DPI` (300), `mmToPx` and `BG_COLOR` are exported too.


## Browser support

Current Chrome, Edge, Firefox and Safari, desktop and mobile. Pictures are
decoded by the browser itself, which also refuses absurd sizes: a 300 KB PNG
that claims 50000×50000 px is rejected in a few milliseconds instead of
allocating gigabytes.

## License

MIT © Chalid Ade Rahman. This package bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
