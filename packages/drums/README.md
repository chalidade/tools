# @chalidade/drums

Drums for any website: one `<script>` tag, one element. Nine pads to hit with
fingers, the keyboard or an e-drum kit over MIDI, plus a 16-step sequencer with
swing and patterns (rock, pop, disco, funk, hip-hop, shuffle, bossa nova,
reggae, dangdut). **Everything runs in the visitor's browser**: the kit is
synthesised like a classic drum machine, no samples are downloaded.

This is the [Online Drums](https://chalidade.github.io/tools/#/drums) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/drums@0/dist/element.js"></script>

<drum-machine></drum-machine>
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
drum-machine {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

### Keyboard

**Q W E R** crash, toms and ride, **A S D F** hi-hats, snare and floor tom, **Space** the kick. The shortcuts listen on the whole page (they are ignored while someone
types in a text field), so put one instrument per page.

### What it remembers

The sequencer pattern, tempo and swing are kept in your page's `localStorage` under `tools:drums`, so it is
there on the next visit. Nothing else is stored, and nothing is sent anywhere.

### MIDI

"Use an e-drum / MIDI" asks the browser for MIDI access only when pressed
(General MIDI drum notes work as-is); the element stops listening to the inputs
when it is removed from the page.

## Use with npm

```bash
npm install @chalidade/drums
```

```js
import '@chalidade/drums/element' // registers <drum-machine>
```

In React, `<drum-machine theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 1.4 KB gzipped: the drum synth.

```js
import { DrumKit } from '@chalidade/drums'

const kit = new DrumKit() // create it from a click: browsers block audio before one
kit.resume()
kit.hit('kick')                       // now, velocity 0.85
kit.hit('snare', 0.9, kit.now + 0.25) // scheduled on the audio clock
kit.hit('hhOpen')
kit.hit('hhClosed', 0.7, kit.now + 0.5) // chokes the open hat, like a pedal
kit.volume = 1.2
kit.close()
```

Pieces: `kick`, `snare`, `hhClosed`, `hhOpen`, `tom1`, `tom2`, `floor`, `crash`,
`ride`. Scheduling hits ahead with `when` (rather than calling `hit` from a
timer) keeps a sequencer on the beat.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
