# @chalidade/merge-audio

Join audio files into one for any website: one `<script>` tag, one element. Drop
in MP3, M4A, WAV, OGG, FLAC (or the sound of a video), mixed formats welcome,
set the order and the gap between them, and save as MP3, M4A or WAV.
**Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Merge Audio](https://chalidade.github.io/tools/#/merge-audio) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/merge-audio@0/dist/element.js"></script>

<merge-audio></merge-audio>
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
merge-audio {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/merge-audio
```

```js
import '@chalidade/merge-audio/element' // registers <merge-audio>
```

In React, `<merge-audio theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React. The merge code is about 2 KB gzipped; Mediabunny
(about 200 KB gzipped) and, when needed, an MP3/AAC encoder load on the first call.

```js
import { probeMedia, mergeAudio } from '@chalidade/merge-audio'

const items = await Promise.all(
  files.map(async (file, i) => ({ id: String(i), file, info: await probeMedia(file) })),
)
const { blob, duration } = await mergeAudio(items, { out: 'mp3', gap: 0.5 }, (p) => console.log(p), (cancel) => {})
// a 2 s WAV + a 2 s MP3 with a 0.5 s gap → duration 4.5375…, 109870-byte audio/mpeg (stereo, 44.1 kHz)
```

- The result takes the highest sample rate (up to 48 kHz) and channel count (up
  to stereo) among the inputs; the others are resampled and remixed to match.
- `out` is `'mp3'`, `'m4a'` or `'wav'`. `onProgress` gets 0–1; `onStart` receives a function that cancels the job (the
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
