# @chalidade/ppt-to-pdf

Convert PowerPoint decks to PDF on any website: one `<script>` tag, one
element. Drop a `.pptx`, see the slides, and download a PDF with one page per
slide, or print to "Save as PDF" for selectable text. **Everything runs in the
visitor's browser**; the deck is never uploaded. Animations, transitions and
video are not carried over; fonts that aren't installed are replaced.

This is the [PowerPoint to PDF](https://chalidade.github.io/tools/#/ppt-to-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/ppt-to-pdf@0/dist/element.js"></script>

<ppt-to-pdf></ppt-to-pdf>
```

The element script is about 96 KB gzipped with React included; the PPTX
reader, DOMPurify, html2canvas-pro and jsPDF load only when a deck is opened or
exported.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
ppt-to-pdf {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/ppt-to-pdf
```

```js
import '@chalidade/ppt-to-pdf/element' // registers <ppt-to-pdf>
```

In React, `<ppt-to-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No React, but it needs a browser (DOM, canvas, print).

```js
import { readPptx, downloadPdf, printDeck } from '@chalidade/ppt-to-pdf'

const deck = await readPptx(file)
// { slides: ['<div class="slide" style="position: relative; …', …], width: 960, height: 540 }

host.innerHTML = deck.slides.join('') // sanitized HTML, safe to insert
const pdf = await downloadPdf([...host.querySelectorAll('.slide')], deck, (done, total) => {})
// Blob { type: 'application/pdf' }

await printDeck(deck, 'Quarterly review') // the browser's print dialog
```

The slide HTML is sanitized with DOMPurify, and only embedded (`data:`) images
and styles may load: a crafted deck can't run script or make the browser fetch
a remote URL. The print copy runs in a sandboxed iframe.


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
