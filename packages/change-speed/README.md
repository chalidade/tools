# @chalidade/change-speed

Speed up or slow down video and audio for any website: one `<script>` tag, one
element. 0.25× to 4×, with the pitch kept natural (a time-stretch, so voices
don't turn into chipmunks) or shifted like a tape. **Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Change Speed](https://chalidade.github.io/tools/#/change-speed) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/change-speed@0/dist/element.js"></script>

<change-speed></change-speed>
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
change-speed {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/change-speed
```

```js
import '@chalidade/change-speed/element' // registers <change-speed>
```

In React, `<change-speed theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React. The speed code is about 3.5 KB gzipped; Mediabunny
(about 200 KB gzipped) loads on the first call.

```js
import { probeMedia, changeSpeed, outputFor } from '@chalidade/change-speed'

const info = await probeMedia(file)
const opts = { speed: 2, keepPitch: true, keepAudio: true, audioOut: 'mp3' }
outputFor(info, opts) // { ext: 'mp4', mimeType: 'video/mp4' } (videos become MP4; audio uses audioOut)

const blob = await changeSpeed(file, info, opts, (p) => console.log(p), (cancel) => {})
// 3-second WebM at 2× → 72229-byte MP4, about 1.5 s long
// a 2-second WAV at 0.5× with audioOut 'mp3' → 81658-byte MP3, about 4 s long
```

- `TimeStretch` (keeps the pitch, WSOLA) and `Resample` (pitch follows the
  speed) are exported for raw audio: `new TimeStretch(channels, sampleRate, speed)`,
  then `push(planes)` per chunk of planar float32 samples and `flush()` at the end.
- `onProgress` gets 0–1; `onStart` receives a function that cancels the job (the
promise then rejects; `isCanceled(error)` is true).

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
