# @chalidade/bpm-key

Find a song's tempo (BPM) and key on any website: one `<script>` tag, one
element. Drop an MP3, M4A, WAV, OGG, FLAC or an MP4 video and get the BPM, the
key with its Camelot code, the relative key and the chords that fit.
**Everything runs in the visitor's browser**: the song is decoded and analysed
on the device, in a Web Worker, and never uploaded.

This is the [BPM & Key Finder](https://chalidade.github.io/tools/#/bpm-key) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/bpm-key@0/dist/element.js"></script>

<bpm-key></bpm-key>
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
bpm-key {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

### Large files and CSP

The file is decoded in memory (roughly 20 MB per minute of stereo audio, at most
the first 8 minutes are analysed), so files over 200 MB are refused. The analysis
runs in a Web Worker that starts from a `blob:` URL (a browser does not start a
worker from a CDN address); if your site sends a Content-Security-Policy, allow
it with `worker-src blob:`.

The "Open in Metronome" button links to the metronome on chalidade.github.io/tools.

## Use with npm

```bash
npm install @chalidade/bpm-key
```

```js
import '@chalidade/bpm-key/element' // registers <bpm-key>
```

In React, `<bpm-key theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 2 KB gzipped. Decode a file, then analyse it:

```js
import { decodeToMono, analyze, camelot, RATE } from '@chalidade/bpm-key'

const samples = await decodeToMono(file) // Float32Array, mono at RATE (11025 Hz)
const result = analyze(samples)
```

For a 20-second test file (clicks at 120 BPM over an A-minor chord), `result` is:

```js
{
  bpm: 120,
  bpmConfidence: 1,
  key: { tonic: 9, minor: true },  // A minor (pitch class: C = 0 … B = 11)
  keyConfidence: 1,
  keys: [
    { tonic: 9, minor: true, score: 0.89 },
    { tonic: 9, minor: false, score: 0.68 },
    { tonic: 0, minor: false, score: 0.33 },
    { tonic: 5, minor: false, score: 0.3 }
  ],
  seconds: 20
}
// (bpm and the scores are rounded here; they are full floats)
```

```js
camelot(9, true)  // '8A'
camelot(0, false) // '8B'
```

- `bpm` is searched between 50 and 220 and leans towards ~120, so a song felt
  in half time may come back doubled: offer ×½ / ×2 like the element does.
  `bpmConfidence` of about 0.25 and up means a steady beat.
- `analyze` is synchronous and CPU-bound: for full songs, run it in a Worker
  in your own UI, as the element does.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
