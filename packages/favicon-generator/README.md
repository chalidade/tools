# @chalidade/favicon-generator

Make a complete favicon set on any website: one `<script>` tag, one element.
From a logo or a letter/emoji, with a background, shape (square, rounded,
circle) and padding, previewed at real size. The download is a zip with
`favicon.ico` (16/32/48), PNG 16 and 32, `apple-touch-icon.png` (180),
Android icons (192, 512), `site.webmanifest` and the `<link>` tags to paste.
**Everything runs in the visitor's browser**; the logo is never uploaded.

This is the [Favicon Generator](https://chalidade.github.io/tools/#/favicon-generator) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/favicon-generator@0/dist/element.js"></script>

<favicon-generator></favicon-generator>
```

The element script is about 94 KB gzipped with React included; JSZip loads
only when the zip is made.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
favicon-generator {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/favicon-generator
```

```js
import '@chalidade/favicon-generator/element' // registers <favicon-generator>
```

In React, `<favicon-generator theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React. Drawing and zipping need a browser (canvas); `buildIco`
also runs in Node.

```js
import { decodeImage, drawIcon, buildFaviconZip, buildIco, HTML_SNIPPET } from '@chalidade/favicon-generator'

const opts = {
  image: await decodeImage(file), // or null to draw `text`
  text: 'T', textColor: '#ffffff',
  background: '#6d28d9', // null = transparent
  shape: 'rounded', fit: 'contain', padding: 0.08,
}
drawIcon(64, opts)                                    // an HTMLCanvasElement
const zip = await buildFaviconZip(opts, 'My Site', '#6d28d9') // Blob, application/zip

buildIco([{ size: 16, data: png16 }, { size: 32, data: png32 }]) // Uint8Array, PNG-in-ICO
HTML_SNIPPET
// '<link rel="icon" href="/favicon.ico" sizes="48x48">\n<link rel="icon" type="image/png" sizes="32x32" …'
```


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
