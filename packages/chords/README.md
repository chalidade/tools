# @chalidade/chords

Guitar and ukulele chord diagrams for any website: one `<script>` tag, one
element. 16 chord types in all 12 keys, several shapes each, playable with a
tap, plus a song transposer that keeps chords lined up over the lyrics.
**Everything runs in the visitor's browser**; nothing is stored or sent anywhere.

This is the [Chord Finder & Transpose](https://chalidade.github.io/tools/#/chords) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/chords@0/dist/element.js"></script>

<chord-finder></chord-finder>
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
chord-finder {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/chords
```

```js
import '@chalidade/chords/element' // registers <chord-finder>
```

In React, `<chord-finder theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 2.6 KB gzipped. Shapes are generated, not looked up:
every root × chord type works, easiest shape first.

```js
import { voicings, INSTRUMENTS, CHORD_TYPES, barreOf } from '@chalidade/chords'

const [guitar, ukulele] = INSTRUMENTS
const major = CHORD_TYPES[0]
const minor = CHORD_TYPES.find((t) => t.suffix === 'm')

voicings(guitar, 0, major)    // C, one fret per string from low E (-1 = muted)
// [[-1, 3, 2, 0, 1, 0], [-1, 3, 2, 0, 1, 3], [8, 7, 5, 5, 5, 8], [8, 10, 10, 9, 8, 8]]
voicings(guitar, 6, minor, 3) // F#m
// [[2, 4, 4, 2, 2, 2], [2, 4, 4, 2, 2, 5], [-1, -1, 4, 6, 7, 5]]
voicings(ukulele, 9, minor, 2) // Am on ukulele (G C E A)
// [[2, 0, 0, 0], [2, 0, 0, 3]]

barreOf([1, 3, 3, 2, 1, 1])   // { fret: 1, from: 0, to: 5 }
```

Roots are pitch classes (C = 0 … B = 11). `CHORD_TYPES` suffixes: `''` (major),
`m`, `7`, `maj7`, `m7`, `sus2`, `sus4`, `7sus4`, `add9`, `6`, `m6`, `9`, `dim`,
`dim7`, `m7b5`, `aug`.

Transposing:

```js
import { transposeChord, transposeSheet, isChord, firstChordRoot } from '@chalidade/chords'

transposeChord('F#m7', 2, false) // 'G#m7'
transposeChord('Bb/D', -2, true) // 'Ab/C'  (true = spell with flats)
transposeSheet('C       G       Am   F\nHello [C]world', 2, false)
// 'D       A       Bm   G\nHello [D]world'
isChord('F#m7') // true
isChord('Hello') // false
firstChordRoot('Intro: Bb  F  Gm') // 10 (B♭)
```

`pluck(ctx, freq, seconds?)` renders a plucked-string note (Karplus–Strong) as an
`AudioBuffer`, the sound the element plays: `pluck(ctx, 110)` gives 2.5 s of mono
audio at the context's sample rate.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
