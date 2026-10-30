# @chalidade/guitar

A playable guitar for any website: one `<script>` tag, one element. Strum
chords with a swipe or the keyboard, pick notes freely on the fretboard, move a
capo, switch between acoustic, clean electric and distortion, and let the auto
accompaniment strum a pattern for you. **Everything runs in the visitor's
browser**: every string is synthesised, no samples are downloaded.

This is the [Online Guitar](https://chalidade.github.io/tools/#/guitar) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/guitar@0/dist/element.js"></script>

<virtual-guitar></virtual-guitar>
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
virtual-guitar {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

### Keyboard

**Space** or **↓** strums down, **↑** strums up, **M** mutes, **1–8** pick a chord. The shortcuts listen on the whole page (they are ignored while someone
types in a text field), so put one instrument per page.

### What it remembers

The chords, sound and accompaniment pattern and tempo are kept in your page's `localStorage` under `tools:guitar`, so it is
there on the next visit. Nothing else is stored, and nothing is sent anywhere.

## Use with npm

```bash
npm install @chalidade/guitar
```

```js
import '@chalidade/guitar/element' // registers <virtual-guitar>
```

In React, `<virtual-guitar theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 1.9 KB gzipped: the guitar synth.

```js
import { GuitarSynth } from '@chalidade/guitar'

const guitar = new GuitarSynth() // create it from a click: browsers block audio before one
// An E major strum, low string first, 30 ms apart
;[40, 47, 52, 56, 59, 64].forEach((midi, string) =>
  guitar.pluck(string, midi, 0.8, guitar.ctx.currentTime + string * 0.03))
guitar.setTone('drive') // 'acoustic' | 'clean' | 'drive', also while notes ring
guitar.damp(0)          // stop the low string
guitar.dampAll()
guitar.close()
```

Each string plays one note at a time, like a real one: a new `pluck` on the
same `string` stops the previous note. `renderString(rate, freq, tone)` gives
the raw Karplus–Strong note as a `Float32Array`;
`renderString(48000, 82.41, 'acoustic')` (the low E) is 197,989 samples, 4.12 s
until it has rung out.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
