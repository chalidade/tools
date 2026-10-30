# @chalidade/metronome

A precise metronome for any website: one `<script>` tag, one element.
30–300 BPM, accented first beat, 1–12 beats per bar, subdivisions (eighths,
triplets, sixteenths) and tap tempo. Clicks are scheduled ahead on the Web Audio
clock, so the beat stays steady even when the page is busy. **Everything runs in
the visitor's browser**.

This is the [Metronome](https://chalidade.github.io/tools/#/metronome) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/metronome@0/dist/element.js"></script>

<web-metronome></web-metronome>
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
web-metronome {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

### Keyboard

**Space** starts and stops, the **arrow keys** change the tempo. The shortcuts listen on the whole page (they are ignored while someone
types in a text field), so put one instrument per page.

### What it remembers

The tempo, beats per bar, subdivision and accent setting are kept in your page's `localStorage` under `tools:metronome`, so it is
there on the next visit. Nothing else is stored, and nothing is sent anywhere.

## Use with npm

```bash
npm install @chalidade/metronome
```

```js
import '@chalidade/metronome/element' // registers <web-metronome>
```

In React, `<web-metronome theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, under 0.5 KB: the click sound itself, for building your own
scheduler.

```js
import { click } from '@chalidade/metronome'

const ctx = new AudioContext() // create or resume it from a click: browsers block audio before one
const t = ctx.currentTime + 0.1
click(ctx, t, 'accent')       // 1760 Hz
click(ctx, t + 0.5, 'beat')   // 1100 Hz
click(ctx, t + 0.75, 'sub')   // 800 Hz, softer
```

Each click is a 50 ms sine blip, scheduled at an exact AudioContext time. Rendered
offline at 44.1 kHz, the three clicks above measure:

| Kind | Peak | RMS over 100 ms |
| --- | --- | --- |
| `accent` | 0.59 | 0.072 |
| `beat` | 0.60 | 0.072 |
| `sub` | 0.24 | 0.032 |

For a steady beat, schedule clicks about 100 ms ahead from a `setInterval`
(the "lookahead" pattern) rather than calling `click` on time from a timer.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
