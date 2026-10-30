# @chalidade/compress-video

Video compression for any website: one `<script>` tag, one element. Shrink an
MP4, MOV, WebM or MKV with the device's own (usually hardware) encoder, pick
the quality and resolution, keep or drop the sound. The result is an MP4 that
plays everywhere. **Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Compress Video](https://chalidade.github.io/tools/#/compress-video) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/compress-video@0/dist/element.js"></script>

<compress-video></compress-video>
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
compress-video {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/compress-video
```

```js
import '@chalidade/compress-video/element' // registers <compress-video>
```

In React, `<compress-video theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React. The compression code is about 2 KB gzipped; Mediabunny
(about 200 KB gzipped) loads on the first call.

```js
import { probeMedia, compressVideo, targetBitrate } from '@chalidade/compress-video'

const info = await probeMedia(file)
// { duration: 3.001, video: { width: 320, height: 240, codec: 'vp8', fps: 29.99…, bitrate: 307405… },
//   audio: { codec: 'opus', channels: 1, sampleRate: 48000, bitrate: 70607… } }

targetBitrate(info, 'medium', 0) // 138225 (bits per second it will aim for)

const mp4 = await compressVideo(
  file, info,
  { level: 'medium', resolution: 0, keepAudio: true }, // level: light | medium | strong; resolution: 0 | 1080 | 720 | 480
  (p) => console.log(Math.round(p * 100) + '%'),
  (cancel) => cancelButton.onclick = cancel,
)
// 3-second 320×240 WebM, 144877 bytes → video/mp4 (H.264), 81120 bytes
```

- `targetSize(1920, 1080, 720)` → `{ width: 1280, height: 720 }`: the output size
  for a resolution, never upscaled.
- The bitrate is never set above 85% of the source's, so the file does not grow.
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
