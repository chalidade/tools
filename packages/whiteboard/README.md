# @chalidade/whiteboard

A whiteboard or blackboard for any website: one `<script>` tag, one element.
Pen with stylus pressure, highlighter, eraser, lines, arrows, shapes, text,
several pages, zoom and pan, and PNG / PDF / board-file export. **Everything
runs in the visitor's browser**; nothing is sent anywhere.

Drawings are vector data, so they stay sharp at any zoom and can be moved,
undone and exported cleanly. The PDF exporter (jsPDF) is only downloaded when
someone exports a PDF.

This is the [Whiteboard](https://chalidade.github.io/tools/#/whiteboard) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/whiteboard@0/dist/element.js"></script>

<web-whiteboard></web-whiteboard>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |
| `persist` | `false`: do not autosave the board | the board is autosaved (localStorage) |

### Where the data lives

The board autosaves to localStorage (key `tools:whiteboard`) **under your site's origin**, the same storage your own
scripts use, so any script on your pages can read it. Nothing is ever sent
anywhere. Add `persist="false"` for a kiosk, a shared computer, or a demo where
nothing should stay behind.

A very large board can outgrow localStorage; the element then says so, and the board
file download keeps it.

### Keyboard and scrolling

Tool shortcuts (P, E, T…), Ctrl+Z / Ctrl+Y, Delete and Space-to-pan work while
the pointer is over the board or focus is inside the element; elsewhere on your
page those keys are left alone. Scrolling over the board pans it instead of
scrolling the page (Ctrl + scroll zooms).

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
web-whiteboard {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/whiteboard
```

```js
import '@chalidade/whiteboard/element' // registers <web-whiteboard>
```

In React, `<web-whiteboard theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

Read and draw a board saved with **Save board file** (`.board.json`) without
the editor, e.g. to show a drawing on another page. Browser only (it draws on a
`<canvas>`); about 5 KB gzipped.

```js
import { isBoardDoc, renderPage } from '@chalidade/whiteboard'

const doc = JSON.parse(await file.text())
if (isBoardDoc(doc)) {
  const canvas = renderPage(doc.pages[0], doc) // null for a blank page
  if (canvas) document.body.append(canvas)
}
```

- `isBoardDoc()` checks every item of every page, so use it before drawing a
  file you didn't make: a malformed item is rejected instead of breaking the draw.
- `renderPage(page, doc, scale = 2, padding = 48)` crops to the drawing.
  `drawItems()`, `drawSurface()`, `contentBounds()` and `emptyDoc()` are there
  for your own canvas; see `index.d.ts`.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
