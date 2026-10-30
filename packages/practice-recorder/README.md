# @chalidade/practice-recorder

A practice recorder for any website: one `<script>` tag, one element.
Record your playing while a metronome ticks (the click is not in the recording),
play the take back with the click on top to check your timing, and save it as
WAV or MP3. **Everything runs in the visitor's browser**: nothing is uploaded,
and the take is gone when the page closes.

This is the [Practice Recorder](https://chalidade.github.io/tools/#/practice-recorder) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/practice-recorder@0/dist/element.js"></script>

<practice-recorder></practice-recorder>
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
practice-recorder {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

### Microphone and privacy

The microphone is requested only when the visitor presses **Record**, and it is
released (the browser's recording indicator goes off) when they press **Stop**
or when the element is removed from the page. The take is kept in memory only (about 1.5 MB per minute) until the visitor records again or leaves the page; saving converts it in the browser. The browser only offers
the microphone on HTTPS pages (and `localhost`); inside an `<iframe>`, the frame
needs `allow="microphone"`.

### What it remembers

The tempo, beats per bar, count-in and timing nudge are kept in your page's `localStorage` under `tools:practice-recorder`, so it is
there on the next visit. Nothing else is stored, and nothing is sent anywhere.

Saving loads [Mediabunny](https://mediabunny.dev) on demand (about 196 KB
gzipped, plus a 134 KB MP3 encoder for MP3), from the same CDN folder as the
element, so the element itself stays about 100 KB.

## Use with npm

```bash
npm install @chalidade/practice-recorder
```

```js
import '@chalidade/practice-recorder/element' // registers <practice-recorder>
```

In React, `<practice-recorder theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

The recorder itself is plain `MediaRecorder`; what this package adds is the
click it plays over a take, the same one as
[@chalidade/metronome](https://www.npmjs.com/package/@chalidade/metronome)
(under 0.5 KB):

```js
import { click } from '@chalidade/practice-recorder'

const ctx = new AudioContext()
click(ctx, ctx.currentTime + 0.1, 'accent') // 'accent' | 'beat' | 'sub'
```

Beat *k* of a take sits at *k* × 60 / BPM seconds after the recording started,
which is how the element lays the click back over it on playback.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
