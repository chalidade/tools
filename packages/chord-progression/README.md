# @chalidade/chord-progression

A chord progression builder for any website: one `<script>` tag, one element.
Pick a key and a pattern (I–V–vi–IV, ii–V–I, 12-bar blues, Andalusian…), hear
it on guitar or piano at any tempo, transpose it and copy the chords.
**Everything runs in the visitor's browser**; the sound is synthesised, no
samples are downloaded.

This is the [Chord Progression Builder](https://chalidade.github.io/tools/#/chord-progression) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/chord-progression@0/dist/element.js"></script>

<chord-progression></chord-progression>
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
chord-progression {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

### What it remembers

The key, pattern, sound, tempo and chord length are kept in your page's `localStorage` under `tools:chord-progression`, so it is
there on the next visit. Nothing else is stored, and nothing is sent anywhere.

The buttons under the chords link to the guitar, piano and chord tools on
chalidade.github.io/tools.

## Use with npm

```bash
npm install @chalidade/chord-progression
```

```js
import '@chalidade/chord-progression/element' // registers <chord-progression>
```

In React, `<chord-progression theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 2.6 KB gzipped (the chord-shape generator included).

```js
import { PATTERNS, buildProgression, progressionText, pianoVoicing, guitarNotes } from '@chalidade/chord-progression'

PATTERNS.map((p) => p.id)
// ['pop', '50s', 'sad', 'basic', 'ballad', 'canon', 'jazz', 'blues',
//  'minor-epic', 'minor-rock', 'minor-andalusian', 'minor-jazz']

buildProgression(7, PATTERNS[0]).map((c) => c.name) // G major, I–V–vi–IV
// ['G', 'D', 'Em', 'C']
buildProgression(5, PATTERNS[0]) // F major: spelled with flats
// [{ root: 5, suffix: '', degree: 'I', name: 'F' }, { root: 0, suffix: '', degree: 'V', name: 'C' },
//  { root: 2, suffix: 'm', degree: 'vi', name: 'Dm' }, { root: 10, suffix: '', degree: 'IV', name: 'Bb' }]

const jazz = PATTERNS.find((p) => p.id === 'jazz')
buildProgression(10, jazz, 2).map((c) => c.name) // ii–V–I in B♭, transposed up 2
// ['Dm7', 'G7', 'Cmaj7', 'Cmaj7']

const blues = PATTERNS.find((p) => p.id === 'blues')
progressionText(buildProgression(9, blues))
// A7    A7    A7    A7
// D7    D7    A7    A7
// E7    D7    A7    E7
```

To play it yourself: `pianoVoicing(9, 'm')` gives `[45, 57, 60, 64]` (bass A2,
then A3 C4 E4, as MIDI notes) and `guitarNotes(7, '')` gives the easiest G
shape, `[{ string: 0, midi: 43 }, { string: 1, midi: 47 }, …, { string: 5, midi: 67 }]`.
`usesFlats(tonic, minor)` and `spell(n, flats)` name keys the way the element does.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
