# @chalidade/trim-media

Video and audio trimming for any website: one `<script>` tag, one element. Drag
the start and end markers over a filmstrip or waveform, play the selection,
save. The result keeps the input's format (MP4 stays MP4, MP3 stays MP3), and
the part you keep is copied, not re-encoded, so quality does not drop.
**Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Trim Video & Audio](https://chalidade.github.io/tools/#/trim-media) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/trim-media@0/dist/element.js"></script>

<trim-media></trim-media>
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
trim-media {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/trim-media
```

```js
import '@chalidade/trim-media/element' // registers <trim-media>
```

In React, `<trim-media theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React. The trimming code is about 2 KB gzipped; Mediabunny
(about 200 KB gzipped) loads on the first call.

```js
import { trimMedia } from '@chalidade/trim-media'

const { blob, ext, mimeType } = await trimMedia(file, { start: 0.5, end: 2 }, {
  onProgress: (p) => console.log(Math.round(p * 100) + '%'),
  onStart: (cancel) => cancelButton.onclick = cancel,
})
// 3-second WebM → ext 'webm', mimeType 'video/webm', 51817 bytes, 1.5 s long
// a 2-second MP3, { start: 0.5, end: 1.5 } → ext 'mp3', 41987 bytes, 1.04 s long
```

- Supported: MP4, MOV, WebM, MKV, MP3, M4A, WAV, OGG, FLAC, AAC. A container the
  browser can read but not write becomes MP4 (video) or M4A (audio).
- At the cut points, MP3 and AAC audio is re-encoded for an exact cut; a
  WebAssembly encoder steps in when the browser has none.

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
