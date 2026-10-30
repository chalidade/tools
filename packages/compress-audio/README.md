# @chalidade/compress-audio

Audio compression for any website: one `<script>` tag, one element. Shrink a
song, podcast or voice note to MP3, AAC (M4A) or Opus at the bitrate you pick,
in stereo or mono, or pull the sound out of a video. **Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Compress Audio](https://chalidade.github.io/tools/#/compress-audio) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/compress-audio@0/dist/element.js"></script>

<compress-audio></compress-audio>
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
compress-audio {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/compress-audio
```

```js
import '@chalidade/compress-audio/element' // registers <compress-audio>
```

In React, `<compress-audio theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

For your own UI, no React. The compression code is about 2 KB gzipped; Mediabunny
(about 200 KB gzipped) and, when needed, an MP3/AAC encoder load on the first call.

```js
import { availableFormats, compressAudio } from '@chalidade/compress-audio'

await availableFormats() // ['mp3', 'm4a', 'opus'] in Chrome (Opus needs a native encoder)

const mp3 = await compressAudio(wav, { format: 'mp3', bitrate: 96_000, mono: true }, (p) => console.log(p), (cancel) => {})
// 2-second stereo WAV, 352878 bytes → 24607-byte mono MP3 at 96 kbps

const m4a = await compressAudio(video, { format: 'm4a', bitrate: 64_000, mono: false }, () => {}, () => {})
// the sound of a 3-second MP4 → 26463-byte AAC in M4A
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
