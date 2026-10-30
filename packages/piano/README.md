# @chalidade/piano

A playable piano for any website: one `<script>` tag, one element. Play with
the mouse, several fingers on a touch screen, the computer keyboard or a MIDI
keyboard, with a sustain pedal, six sounds, chord names, full screen and a
practice mode (built-in songs, scales or your own MIDI file).
**Everything runs in the visitor's browser**: the sound is synthesised, and a
MIDI file opened for practice is read on the device, never uploaded.

This is the [Online Piano](https://chalidade.github.io/tools/#/piano) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/piano@0/dist/element.js"></script>

<piano-keyboard></piano-keyboard>
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
piano-keyboard {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

### Keyboard

Two rows of letters play two octaves, **Space** holds the sustain pedal, the **left/right arrows** move an octave. The shortcuts listen on the whole page (they are ignored while someone
types in a text field), so put one instrument per page.

### MIDI

"Use a MIDI keyboard" asks the browser for MIDI access only when pressed;
the element stops listening to the inputs when it is removed from the page.

## Use with npm

```bash
npm install @chalidade/piano
```

```js
import '@chalidade/piano/element' // registers <piano-keyboard>
```

In React, `<piano-keyboard theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 5.4 KB gzipped: the synth, the practice songs and the
MIDI file reader.

```js
import { PianoSynth } from '@chalidade/piano'

const piano = new PianoSynth() // create it from a click: browsers block audio before one
piano.noteOn(60)              // middle C, velocity 0.8
piano.noteOff(60)
piano.setPedal(true)          // sustain
piano.playAt(64, 0.7, piano.now + 0.1, 0.5) // E4 in 0.1 s for 0.5 s; returns a function that fades it early
piano.setVoice('epiano')      // grand, epiano, organ, harpsichord, strings, musicbox
piano.volume = 0.6
piano.close()
```

Songs and MIDI files become a list of timed notes:

```js
import { SONGS, scaleSong, parseMidi, stepsOf, rangeOf } from '@chalidade/piano'

SONGS.map((s) => s.id) // ['twinkle', 'ode', 'birthday', 'jingle', 'fur-elise', 'canon', 'prelude']
stepsOf(SONGS[0].notes).slice(0, 3)
// [{ t: 0, notes: [60] }, { t: 0.6, notes: [60] }, { t: 1.2, notes: [67] }]
rangeOf(SONGS[0].notes) // [60, 69]

scaleSong(2, 'minor', 120).notes.map((n) => n.midi) // D natural minor, up and down
// [62, 64, 65, 67, 69, 70, 72, 74, 72, 70, 69, 67, 65, 64, 62]

const song = parseMidi(await file.arrayBuffer(), file.name)
// for a file with C4, then E4 + G4 together (480 ticks per quarter, 120 BPM):
// { id: 'midi-tiny.mid', title: 'tiny', by: 'MIDI', notes: [
//     { t: 0, d: 0.5, midi: 60, velocity: 0.787…, track: 0 },
//     { t: 0.5, d: 0.5, midi: 64, velocity: 0.708…, track: 0 },
//     { t: 0.5, d: 0.5, midi: 67, velocity: 0.708…, track: 0 } ] }
stepsOf(song.notes) // [{ t: 0, notes: [60] }, { t: 0.5, notes: [64, 67] }]
```

`parseMidi` reads format 0 and 1 files, follows tempo changes and skips the
drum channel; anything else throws (`'not a MIDI file'`, or a `RangeError` for a
truncated file).

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
