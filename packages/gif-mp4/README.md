# @chalidade/gif-mp4

GIF to MP4 and video to GIF for any website: one `<script>` tag, one element.
A GIF becomes a much smaller MP4 (that apps accept as a video, looped as many
times as you like); a clip of a video becomes a GIF with a sharp palette per
frame. **Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [GIF ⇄ MP4](https://chalidade.github.io/tools/#/gif-mp4) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/gif-mp4@0/dist/element.js"></script>

<gif-mp4></gif-mp4>
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
gif-mp4 {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/gif-mp4
```

```js
import '@chalidade/gif-mp4/element' // registers <gif-mp4>
```

In React, `<gif-mp4 theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React. The conversion code is about 3 KB gzipped; the GIF
libraries (about 8 KB) and Mediabunny (about 200 KB gzipped) load on the first call.

```js
import { readGifInfo, gifToMp4, videoToGif } from '@chalidade/gif-mp4'

await readGifInfo(gif) // { width: 160, height: 120, frames: 10, duration: 1 }

const mp4 = await gifToMp4(gif, { background: '#ffffff', loops: 2 }, (p) => console.log(p))
// 19132-byte GIF → 6893-byte MP4 (H.264, 160×120, 2 s)

const out = await videoToGif(video, { start: 0, end: 1, fps: 10, width: 160 }, (p) => console.log(p), () => canceled)
// first second of a 320×240 WebM → 40870-byte GIF, 160×120, 10 frames
```

- Transparent GIF pixels are drawn on `background` (any CSS colour): MP4 has no
  transparency.
- A GIF that claims more than 64 megapixels per frame is refused before
  decoding (a 190 KB file can claim 16000×16000 and would need gigabytes);
  the promise rejects with `UnsupportedMediaError`.

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
