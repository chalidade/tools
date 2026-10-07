# @chalidade/screen-recorder

Rekam layar di website mana pun — satu tag `<script>`, satu elemen. Merekam
seluruh layar, satu jendela, atau satu tab, dengan suara mikrofon dan suara
tab, plus kamera melayang. **Semua berjalan di browser pengunjung**: tidak ada
server, tidak ada yang di-upload.

*English: a drop-in screen recorder for any website (a `<screen-recorder>`
custom element) plus a small headless API. Runs entirely in the browser. The
built-in UI is in Indonesian.*

Ini adalah tool [Rekam Layar](https://chalidade.github.io/tools/#/screen-recorder)
dari [chalidade/tools](https://github.com/chalidade/tools), dikemas supaya bisa
dipasang di situsmu sendiri. Coba dulu di sana.

## Pasang dalam 10 detik

Tempel ini di HTML mana pun (WordPress, Blogger, Webflow, HTML biasa):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/screen-recorder@0/dist/element.js"></script>

<screen-recorder></screen-recorder>
```

Selesai. Rekaman tersimpan di browser pengunjung dan bisa diunduh sebagai WebM
atau diubah ke MP4.

### Atribut

| Atribut | Nilai | Default |
| --- | --- | --- |
| `theme` | `auto` (ikut sistem), `light`, `dark` | `auto` |
| `persist` | `false` = jangan simpan rekaman di browser (IndexedDB) | simpan |
| `title-indicator` | `true` = tampilkan "● Merekam 0:42" di judul tab | mati |

### Event: ambil file rekamannya

Setiap rekaman selesai, elemen mengirim event `recording` — misalnya untuk
meng-upload ke server-mu sendiri:

```html
<screen-recorder id="rec" persist="false"></screen-recorder>
<script>
  document.getElementById('rec').addEventListener('recording', async (e) => {
    const { blob, mimeType, duration, width, height } = e.detail
    const form = new FormData()
    form.append('video', blob, 'rekaman.webm')
    await fetch('/upload', { method: 'POST', body: form }) // server milikmu
  })
</script>
```

### Warna

Elemen memakai Shadow DOM, jadi CSS situsmu tidak merusaknya (dan sebaliknya).
Warnanya bisa diubah lewat variabel CSS:

```css
screen-recorder {
  --sr-brand-1: #0ea5e9; /* gradasi toggle & aksen, terang maupun gelap */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* kelengkungan sudut */
}
```

## Pakai dengan npm

```bash
npm install @chalidade/screen-recorder
```

```js
import '@chalidade/screen-recorder/element' // mendaftarkan <screen-recorder>
```

Di React: `<screen-recorder theme="light" />` langsung bisa dipakai di JSX
(React 19 meneruskan atribut dan event ke custom element).

## API tanpa UI

Untuk tampilanmu sendiri — tanpa React, ±3 KB gzip:

```js
import { canRecordScreen, recordScreen, toMp4 } from '@chalidade/screen-recorder'

if (!canRecordScreen()) alert('Perekaman layar butuh browser komputer.')

button.onclick = async () => {
  const capture = await recordScreen({ microphone: true, systemAudio: true, fps: 30 })
  preview.srcObject = capture.stream          // tampilan langsung
  capture.onended = () => stopButton.click()  // pengunjung menekan "Berhenti berbagi"
}

stopButton.onclick = async () => {
  const result = await capture.stop()         // { blob, mimeType, duration, width, height }
  const mp4 = await toMp4(result.blob, (p) => console.log(Math.round(p * 100) + '%'))
}
```

- `captureScreen(options)` menyiapkan perekaman tanpa langsung mulai (untuk
  hitung mundur), lalu `capture.start()`.
- `capture.pause()`, `capture.resume()`, `capture.cancel()`, `capture.elapsed()`.
- `capture.warnings` berisi `'system-audio-missing'` (pengunjung tidak mencentang
  "Bagikan audio") atau `'microphone-unavailable'`.
- `toMp4()` memuat encoder (±200 KB gzip) hanya saat dipanggil.

`recordScreen` / `captureScreen` harus dipanggil dari klik — browser mewajibkan
izin pengguna untuk merekam layar.

## Dukungan browser

Chrome, Edge, Firefox, dan Safari versi terbaru **di komputer**. Ponsel dan
tablet belum mengizinkan situs web merekam layar — `canRecordScreen()`
mengembalikan `false` di sana, dan elemen menampilkan pesannya sendiri. Suara
tab bisa direkam di Chrome/Edge; suara seluruh sistem hanya di Windows dan
ChromeOS. Halaman harus dibuka lewat HTTPS (atau `localhost`).

## Lisensi

MIT © Chalid Ade Rahman. Paket ini menyertakan pustaka pihak ketiga — lihat
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
