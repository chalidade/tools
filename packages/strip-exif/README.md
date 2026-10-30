# @chalidade/strip-exif

Photo metadata viewer and remover for any website: one `<script>` tag, one
element. See what a photo gives away (camera, date, GPS location on a text
map), then save it without any metadata. JPEG, PNG and WebP are cleaned
**without re-encoding**: the picture stays bit-for-bit identical.
**Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Remove Photo Metadata](https://chalidade.github.io/tools/#/strip-exif) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/strip-exif@0/dist/element.js"></script>

<strip-exif></strip-exif>
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
strip-exif {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/strip-exif
```

```js
import '@chalidade/strip-exif/element' // registers <strip-exif>
```

In React, `<strip-exif theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React, about 3 KB gzipped. Everything works on the file's bytes:

```js
import { readExif, stripMetadata, formatCoords } from '@chalidade/strip-exif'

const bytes = new Uint8Array(await file.arrayBuffer())
const info = readExif(bytes)
// { fields: [{ label: ['Kamera', 'Camera'], value: 'SECRETCAM Model X' },
//            { label: ['Aplikasi', 'Software'], value: 'SecretSoft 1.0' }],
//   orientation: 1,
//   has: { exif: true, xmp: true, iptc: true, comment: true },
//   gps: { lat: -6.2088, lon: 106.8456, altitude: 42 } }
formatCoords(info.gps.lat, info.gps.lon) // '6.20880° S, 106.84560° E'

const clean = stripMetadata(bytes)       // 4290 → 2589 bytes, same pixels
readExif(clean).has                      // { exif: false, xmp: false, iptc: false, comment: false }
const out = new Blob([clean], { type: file.type })
```

What is removed:

- **JPEG**: EXIF (with its GPS block and thumbnail), XMP and Extended XMP,
  IPTC, comments, every other APP segment, and anything after the end of the
  image, where phones put MPF previews and trailers that carry their own EXIF.
  Kept: the JFIF header, the ICC colour profile and Adobe's colour transform.
- **PNG**: `eXIf`, `tEXt`, `zTXt`, `iTXt` (XMP), `tIME`, and anything after `IEND`.
- **WebP**: the `EXIF` and `XMP ` chunks (the VP8X flags and RIFF size are fixed).

`stripMetadata` returns `null` for other formats, and for a JPEG whose picture
relies on its EXIF orientation: without the tag it would turn sideways, so draw
it on a canvas and re-encode instead (the element does this for you).
`stripJpeg`, `stripPng`, `stripWebp`, `sniff` and `textMap` are exported too.


## Browser support

Current Chrome, Edge, Firefox and Safari, desktop and mobile. Pictures are
decoded by the browser itself, which also refuses absurd sizes: a 300 KB PNG
that claims 50000×50000 px is rejected in a few milliseconds instead of
allocating gigabytes.

## License

MIT © Chalid Ade Rahman. This package bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
