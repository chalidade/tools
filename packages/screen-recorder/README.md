# @chalidade/screen-recorder

Screen recording for any website: one `<script>` tag, one element. Record the
whole screen, a single window or a single tab, with microphone and tab audio,
plus a floating camera bubble. **Everything runs in the visitor's browser**:
there is no server and nothing is uploaded.

This is the [Screen Recorder](https://chalidade.github.io/tools/#/screen-recorder)
tool from [chalidade/tools](https://github.com/chalidade/tools), packaged so you
can drop it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/screen-recorder@0/dist/element.js"></script>

<screen-recorder></screen-recorder>
```

That's it. Recordings are stored in the visitor's browser and can be downloaded
as WebM or converted to MP4.

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `persist` | `false` = don't keep recordings in the browser (IndexedDB) | keep |
| `title-indicator` | `true` = show "● Recording 0:42" in the tab title | off |
| `lang` | `id` or `en`, the UI language | the visitor's browser language |

### Event: get the recorded file

When a recording finishes, the element fires a `recording` event, for example to
upload it to your own server:

```html
<screen-recorder id="rec" persist="false"></screen-recorder>
<script>
  document.getElementById('rec').addEventListener('recording', async (e) => {
    const { blob, mimeType, duration, width, height } = e.detail
    const form = new FormData()
    form.append('video', blob, 'recording.webm')
    await fetch('/upload', { method: 'POST', body: form }) // your server
  })
</script>
```

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its colors with CSS variables:

```css
screen-recorder {
  --sr-brand-1: #0ea5e9; /* toggle & accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/screen-recorder
```

```js
import '@chalidade/screen-recorder/element' // registers <screen-recorder>
```

In React, `<screen-recorder theme="light" />` works directly in JSX (React 19
passes attributes and events through to custom elements).

## Headless API

For your own UI, no React, about 3 KB gzipped:

```js
import { canRecordScreen, recordScreen, toMp4 } from '@chalidade/screen-recorder'

if (!canRecordScreen()) alert('Screen recording needs a desktop browser.')

button.onclick = async () => {
  const capture = await recordScreen({ microphone: true, systemAudio: true, fps: 30 })
  preview.srcObject = capture.stream          // live preview
  capture.onended = () => stopButton.click()  // the visitor clicked "Stop sharing"
}

stopButton.onclick = async () => {
  const result = await capture.stop()         // { blob, mimeType, duration, width, height }
  const mp4 = await toMp4(result.blob, (p) => console.log(Math.round(p * 100) + '%'))
}
```

- `captureScreen(options)` prepares a recording without starting it (for a
  countdown); call `capture.start()` when ready.
- `capture.pause()`, `capture.resume()`, `capture.cancel()`, `capture.elapsed()`.
- `capture.warnings` contains `'system-audio-missing'` (the visitor didn't tick
  "Share audio") or `'microphone-unavailable'`.
- `toMp4()` loads the encoder (about 200 KB gzipped) only when called.

`recordScreen` / `captureScreen` must be called from a click: browsers require a
user gesture before recording the screen.

## Browser support

Current Chrome, Edge, Firefox and Safari **on desktop**. Phones and tablets
don't let websites record the screen yet; `canRecordScreen()` returns `false`
there, and the element shows its own message. Tab audio can be recorded in
Chrome/Edge; whole-system audio only on Windows and ChromeOS. The page must be
served over HTTPS (or `localhost`).

## License

MIT © Chalid Ade Rahman. This package bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
