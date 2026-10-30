# @chalidade/remove-background

Background removal for any website: one `<script>` tag, one element. Pick the
background by hand with a magic wand, colour select, lasso, box or brush,
clean the edge, then save a transparent PNG or put it on a new colour. There is
**no AI model**, so nothing is downloaded beyond this package.
**Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Remove Background](https://chalidade.github.io/tools/#/remove-background) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/remove-background@0/dist/element.js"></script>

<remove-background></remove-background>
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
remove-background {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/remove-background
```

```js
import '@chalidade/remove-background/element' // registers <remove-background>
```

In React, `<remove-background theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

The mask editing behind the element, on raw pixels, no React, about 1.5 KB gzipped.
A mask is one byte per pixel: 255 = keep, 0 = removed.

```js
import { floodRegion, applyRegion, refine, compose } from '@chalidade/remove-background'

const { data } = ctx.getImageData(0, 0, W, H)          // a 96×64 picture: a yellow disc on blue
const mask = new Uint8Array(W * H).fill(255)
applyRegion(mask, floodRegion(data, W, H, 0, 0, 20), 'erase') // magic wand at the top-left corner, tolerance 20
const rgba = compose(data, refine(mask, W, H, 1, 1), 'result') // shrink the edge 1 px, feather 1 px
ctx.putImageData(new ImageData(rgba, W, H), 0, 0)
// 4862 of 6144 pixels removed; the disc stays opaque with a soft edge
```

- Selections: `floodRegion` (connected, magic wand), `colorRegion` (one colour
  everywhere), `applyCoverage` (a lasso or box you rasterised yourself),
  `stampBrush` / `strokeBrush`, `invert`.
- `compose(…, 'overlay')` tints removed parts red instead of hiding them.
- The element scales pictures larger than 3000 px down before editing.


## Browser support

Current Chrome, Edge, Firefox and Safari, desktop and mobile. Pictures are
decoded by the browser itself, which also refuses absurd sizes: a 300 KB PNG
that claims 50000×50000 px is rejected in a few milliseconds instead of
allocating gigabytes.

## License

MIT © Chalid Ade Rahman. This package bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
