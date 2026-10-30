# @chalidade/color-picker

A color picker for any website: one `<script>` tag, one element. Type HEX,
`rgb()`, `hsl()` or `oklch()`, pick from the screen (where the browser has the
EyeDropper API) or from an image with a loupe, and get every format, WCAG
contrast against white and black text, the image's main colors and a
Tailwind-style 50–950 scale. **Everything runs in the visitor's browser**;
images are never uploaded.

This is the [Color Picker](https://chalidade.github.io/tools/#/color-picker) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/color-picker@0/dist/element.js"></script>

<color-picker></color-picker>
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
color-picker {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/color-picker
```

```js
import '@chalidade/color-picker/element' // registers <color-picker>
```

In React, `<color-picker theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, plain math that runs in Node too.

```js
import { parseColor, toHex, formats, contrast, colorScale, toOklch, extractPalette } from '@chalidade/color-picker'

const c = parseColor('#7c3aed')        // { r: 124, g: 58, b: 237 }
toHex(parseColor('rgb(124 58 237)'))  // '#7c3aed'
parseColor('nope')                    // null

formats(c)
// [{ label: 'HEX', value: '#7C3AED' }, { label: 'RGB', value: 'rgb(124 58 237)' },
//  { label: 'HSL', value: 'hsl(262 83% 58%)' }, { label: 'OKLCH', value: 'oklch(54.1% 0.247 293)' },
//  { label: 'HSV', value: '262°, 76%, 93%' }, { label: 'CMYK', value: '48%, 76%, 0%, 7%' },
//  { label: 'Flutter', value: '0xFF7C3AED' }]

contrast(c, { r: 255, g: 255, b: 255 }).toFixed(2) // '5.70' (passes AA for body text)

colorScale(c).map(toHex) // shades 50…950 (SCALE_STEPS)
// ['#f7f5ff', '#eae6ff', '#d7ceff', '#c0b0ff', '#a78aff', '#905eff',
//  '#7935e9', '#6407cd', '#4e00a5', '#370077', '#21004c']

extractPalette(ctx.getImageData(0, 0, w, h).data, 8) // the 8 main colors of an image, most common first
```


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
