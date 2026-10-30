# @chalidade/guitar-tuner

A chromatic tuner for any website: one `<script>` tag, one element. Guitar
(standard, drop D, ½ step down, DADGAD, open G), bass, ukulele, violin, viola,
cello or any note. The string is detected automatically, and a reference drone
helps tuning by ear. **Everything runs in the visitor's browser**: the microphone
sound is analysed on the spot, never recorded or sent anywhere.

This is the [Guitar Tuner](https://chalidade.github.io/tools/#/guitar-tuner) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/guitar-tuner@0/dist/element.js"></script>

<guitar-tuner></guitar-tuner>
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
guitar-tuner {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

### Microphone and privacy

The microphone is requested only when the visitor presses **Start**, and it is
released (the browser's recording indicator goes off) when they press **Stop**
or when the element is removed from the page. The sound is analysed in memory about 20 times a second; nothing is recorded. The browser only offers
the microphone on HTTPS pages (and `localhost`); inside an `<iframe>`, the frame
needs `allow="microphone"`.

### What it remembers

The chosen tuning and reference A4 are kept in your page's `localStorage` under `tools:guitar-tuner`, so it is
there on the next visit. Nothing else is stored, and nothing is sent anywhere.

## Use with npm

```bash
npm install @chalidade/guitar-tuner
```

```js
import '@chalidade/guitar-tuner/element' // registers <guitar-tuner>
```

In React, `<guitar-tuner theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 1.5 KB gzipped. `detectPitch` is the same McLeod
Pitch Method the tuner uses, and works on any time-domain samples (an
`AnalyserNode`'s `getFloatTimeDomainData`, a decoded file, a test signal):

```js
import { detectPitch, freqToMidi, midiToFreq, noteName, TUNINGS } from '@chalidade/guitar-tuner'

// 4096 samples at 48 kHz of a 110.5 Hz tone with a loud second harmonic
detectPitch(samples, 48000, 60, 400)
// { freq: 110.49926007663055, clarity: 0.99999661435351 }

const midi = freqToMidi(110.49926007663055) // fractional MIDI note
noteName(Math.round(midi))                  // 'A2'
(midi - Math.round(midi)) * 100             // 7.8 (cents sharp)
midiToFreq(40)                              // 82.40688922821748 (low E)

detectPitch(new Float32Array(4096), 48000, 60, 400) // null (silence)

TUNINGS[0] // { id: 'standard', label: ['Gitar · Standar', 'Guitar · Standard'], strings: [40, 45, 50, 55, 59, 64] }
```

- Search only the range you need (`minFreq`, `maxFreq`): it is faster and
  avoids octave errors. Below about 0.85 `clarity`, treat the reading as noise.
- `TUNINGS` ids: `standard`, `drop-d`, `half-down`, `dadgad`, `open-g`, `bass`,
  `violin`, `viola`, `cello`, `ukulele`, `chromatic` (strings are MIDI notes,
  lowest first; `chromatic` has none).
- `midiToFreq` and `freqToMidi` take the reference A4 as a second argument
  (default 440).

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
