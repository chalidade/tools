# @chalidade/audio-recorder

A voice recorder for any website: one `<script>` tag, one element. Record from
the microphone with a live waveform, pause and resume, play back, rename, and
download as WebM, MP3, M4A or WAV. **Everything runs in the visitor's browser**: there is no server and nothing is uploaded.

This is the [Voice Recorder](https://chalidade.github.io/tools/#/audio-recorder) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/audio-recorder@0/dist/element.js"></script>

<audio-recorder></audio-recorder>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `persist` | `false` = don't keep recordings in the browser (IndexedDB) | keep |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Event: get the recorded file

When a recording finishes, the element fires a `recording` event, for example to
upload it to your own server:

```html
<audio-recorder id="rec" persist="false"></audio-recorder>
<script>
  document.getElementById('rec').addEventListener('recording', async (e) => {
    const { blob, mimeType, duration, name } = e.detail
    const form = new FormData()
    form.append('audio', blob, name + '.webm')
    await fetch('/upload', { method: 'POST', body: form }) // your server
  })
</script>
```

With `persist` left on, recordings are kept in IndexedDB on the visitor's
device (database `tools-audio-recorder`, on your site's origin) so they
survive a reload.

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
audio-recorder {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/audio-recorder
```

```js
import '@chalidade/audio-recorder/element' // registers <audio-recorder>
```

In React, `<audio-recorder persist="false" />` works directly in JSX (React 19
passes attributes and events through to custom elements).

## Headless API

The helpers around a recording, no React. Record with the browser's own
`MediaRecorder`; `convertRecording` loads Mediabunny (about 200 KB gzipped) on the first call.

```js
import { canRecord, pickMimeType, extensionOf, convertRecording } from '@chalidade/audio-recorder'

canRecord()                  // true (getUserMedia + MediaRecorder exist)
const mimeType = pickMimeType() // 'audio/webm;codecs=opus' in Chrome, 'audio/mp4…' in Safari
extensionOf(mimeType)        // 'webm'

// …record with new MediaRecorder(stream, { mimeType })…
const recording = { id: '1', name: 'Memo', createdAt: Date.now(), duration: 1.5, mimeType, blob }
const mp3 = await convertRecording(recording, 'mp3', (p) => console.log(p), (cancel) => {})
// a 1.5-second recording, 16516-byte WebM → 30888-byte audio/mpeg; as 'wav' → 144044 bytes
```


## Browser support

Current Chrome, Edge, Firefox and Safari, desktop and mobile. The page must be
served over HTTPS (or `localhost`) for microphone access. MP3/M4A export needs
WebCodecs (Safari 16.4+, Firefox 130+); its WebAssembly encoder runs in a Web
Worker from a `blob:` URL, so a strict Content-Security-Policy needs
`worker-src blob:` and `script-src 'wasm-unsafe-eval'`.

## License

MIT © Chalid Ade Rahman. This package bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
