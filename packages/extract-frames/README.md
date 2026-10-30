# @chalidade/extract-frames

Video frames as images for any website: one `<script>` tag, one element. Pause
on a scene and capture it, or grab a frame every N seconds, at the video's
full resolution, as PNG, JPEG or WebP, and download them one by one or as a
ZIP. **Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Extract Video Frames](https://chalidade.github.io/tools/#/extract-frames) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/extract-frames@0/dist/element.js"></script>

<extract-frames></extract-frames>
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
extract-frames {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/extract-frames
```

```js
import '@chalidade/extract-frames/element' // registers <extract-frames>
```

In React, `<extract-frames theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React. The frame code is about 2 KB gzipped; Mediabunny
(about 200 KB gzipped) loads on the first call, JSZip (32 KB) only for `zipFrames`.

```js
import { probeMedia, plannedTimes, captureFrames, frameName, zipFrames } from '@chalidade/extract-frames'

const { duration } = await probeMedia(file)        // 3.001
const times = plannedTimes(duration, 'count', 3)   // [0.50016…, 1.5005, 2.50083…]  centres of 3 equal parts
plannedTimes(duration, 'every', 1)                 // [0, 1, 2, 3]

const frames = []
await captureFrames(file, times, 'png', (f) => frames.push(f), (done, total) => {}, () => canceled)
frames.map((f) => frameName('clip', f))            // ['clip-0m00.50s.png', 'clip-0m01.50s.png', 'clip-0m02.50s.png']
// each a 320×240 PNG Blob (15950, 17684, 19247 bytes); f.url is an object URL to revoke when done

const zip = await zipFrames(frames, 'clip')        // 53233-byte ZIP
```


`probeMedia(file)`, `hasWebCodecs()`, `isCanceled(error)` and the error classes
`NoEncoderError` / `UnsupportedMediaError` are exported too.


## Browser support

Needs WebCodecs: current Chrome, Edge and Opera, Safari 16.4+, Firefox 130+.
`hasWebCodecs()` tells you up front; the element shows its own message.
Encoders depend on the device (H.264/AAC are hardware on most phones and
laptops); when the browser has no AAC or MP3 encoder, a WebAssembly one is
loaded from this package. That encoder runs in a Web Worker started from a
`blob:` URL, so a page with a strict Content-Security-Policy needs
`worker-src blob:` and `script-src 'wasm-unsafe-eval'`.

## License

MIT © Chalid Ade Rahman. This package bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
