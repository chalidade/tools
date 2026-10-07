# Paket: tools yang bisa dipasang di situs lain

Setiap folder di sini adalah satu tool yang dikemas sebagai paket npm, supaya
orang lain bisa memasangnya di website mereka. Saat ini:

| Paket | Folder | Status |
| --- | --- | --- |
| [`@chalidade/screen-recorder`](./screen-recorder) | `screen-recorder/` | siap terbit (0.1.0) |

## Cara kerjanya

**Satu sumber kode.** Paket tidak menyalin kode tool. Ia mem-build kode yang
sama dengan yang dipakai situs (`src/tools/<tool>/`) lewat alias `@` ke
`../../src`. Memperbaiki tool di situs berarti memperbaikinya di paket juga,
cukup build ulang dan terbitkan versi baru.

Setiap paket berisi dua hal:

- **`dist/element.js`**: custom element (mis. `<screen-recorder>`) yang
  merender komponen React tool ke dalam **Shadow DOM**, jadi CSS situs pemasang
  tidak merusaknya dan sebaliknya. React dan CSS ikut dibundel, sehingga cukup
  satu `<script type="module">`. Lewat jsDelivr, semua paket npm otomatis
  tersedia sebagai CDN gratis.
- **`dist/index.js`**: API tanpa UI (fungsi biasa, tanpa React) untuk developer
  yang ingin membuat tampilan sendiri.

Hal yang perlu diperhatikan saat membuat paket baru:

- **Warna tema**: token di `src/theme.css` didefinisikan untuk `:root, :host`,
  jadi berlaku juga di Shadow DOM.
- **`@property` Tailwind** diabaikan browser di dalam shadow root, sehingga
  `translate-*`, `shadow-*` dan sejenisnya rusak. `element.tsx` memindahkan
  aturan-aturan itu ke `<head>` halaman sekali saja.
- **Tipe publik** (`types/index.d.ts`) ditulis tangan supaya rapi untuk
  pemakai. `types/check.ts` membuat build gagal kalau tipe itu tidak cocok lagi
  dengan kode sumbernya.
- **Komponen tool** sebaiknya menerima props untuk pemakaian di luar situs
  (lihat `ScreenRecorderProps`: `persist`, `onRecording`, `showInTitle`), lalu
  `element.tsx` menerjemahkannya menjadi atribut dan event.
- **Teks UI** masih berbahasa Indonesia.

## Build dan uji

```bash
npm run build:packages            # dari root repo: type-check + build semua paket
```

Uji di halaman HTML biasa di luar situs ini, dengan CSS yang "nakal", supaya
isolasi gaya benar-benar teruji. Lihat contoh di README paket.

## Menerbitkan ke npm

Hanya pemilik akun npm yang bisa menjalankan langkah ini.

1. **Sekali saja:** buat akun di https://www.npmjs.com/signup dengan username
   **`chalidade`**. Nama paket `@chalidade/...` hanya bisa diterbitkan oleh user
   atau organisasi bernama `chalidade`. Kalau username itu sudah dipakai orang,
   ganti `name` di `package.json` paket (dan di `src/tools/registry.ts`).
2. Login di terminal: `npm login`
3. Build dan terbitkan:
   ```bash
   cd packages/screen-recorder
   npm publish --access public      # prepublishOnly menjalankan build otomatis
   ```
4. Di `src/tools/registry.ts`, ubah `package.published` menjadi `true` untuk tool
   itu. Halaman tool lalu menampilkan tab "Satu tag script" dan "npm" di bagian
   **Pasang di situsmu**. Commit dan push.
5. Cek: `https://cdn.jsdelivr.net/npm/@chalidade/screen-recorder@0/dist/element.js`
   (jsDelivr butuh beberapa menit setelah publish).

**Versi berikutnya:** naikkan `version` di `package.json` paket (`0.1.1` untuk
perbaikan, `0.2.0` untuk fitur baru), lalu `npm publish` lagi. Snippet memakai
`@0`, jadi pemasang otomatis mendapat versi 0.x terbaru.

## Menambah paket untuk tool lain

Salin `screen-recorder/` sebagai pola:

1. Pisahkan logika tool dari tampilannya (seperti `captureScreen()` di
   `src/tools/screen-recorder/screen.ts`) supaya ada API tanpa UI.
2. `src/index.ts`: ekspor API itu. `src/element.tsx`: ganti nama elemen dan
   komponennya. `src/element.css`: arahkan `@source` ke folder tool tersebut.
3. Sesuaikan `package.json`, `types/`, README, dan THIRD-PARTY-NOTICES.
4. Tambahkan field `package` di registry dan skrip build-nya di
   `build:packages` (root `package.json`).

Tool yang memakai WASM (PDF lewat pdf.js / qpdf) perlu satu langkah tambahan:
file `.wasm` dan worker harus dimuat dari URL paket (`import.meta.url`), bukan
dari situs ini.
