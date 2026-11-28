# toowl di Apify Store

Dua puluh tujuh engine toowl dibungkus jadi **Actor Apify** berbayar (pay-per-event).
Kode tool di situs berjalan di browser; di sini engine yang sama di-port ke
Node supaya bisa dipanggil lewat API, Zapier, Make, n8n, atau jadwal.

| Folder | Actor | Engine | Event berbayar |
| --- | --- | --- | --- |
| [`pdf-compress/`](./pdf-compress) | PDF Compressor (Bulk, keeps text) | qpdf (wasm) + sharp/mozjpeg, metode sama dengan `src/tools/compress-pdf/compress.ts` | `pdf-compressed` |
| [`image-convert/`](./image-convert) | Image Converter & Resizer | sharp (libvips) + libheif-js untuk HEIC | `image-converted` |
| [`qr-reader/`](./qr-reader) | QR Code & Barcode Reader | zxing-wasm, opsi sama dengan `src/tools/qr/scan.ts` | `image-scanned` |
| [`image-upscale/`](./image-upscale) | AI Image Upscaler (Real-ESRGAN 4x/2x) | onnxruntime-node + model `realesr-general-x4v3.onnx` yang sama dengan `src/tools/upscale-image/` (disalin ke folder Actor) | `image-upscaled` |
| [`ocr/`](./ocr) | OCR: Image & Scanned PDF to Text | tesseract.js 7 + `@tesseract.js-data/*` (8 bahasa, lokal) + pdf.js untuk render halaman scan | `page-ocr` (per gambar / halaman) |
| [`pdf-markdown/`](./pdf-markdown) | PDF to Markdown for LLM & RAG | **engine situs persis**: `src/tools/pdf-to-markdown/convert.ts` dibundel jadi `src/engine.js` | `pdf-page-converted` (per halaman) |
| [`video-compress/`](./video-compress) | Video Compressor & Converter (MP4, WebM, MOV, GIF) | ffmpeg (Debian) — x264 CRF / VP9 CRF, scale, trim, GIF palet | `video-minute` (per menit dimulai) |
| [`audio-convert/`](./audio-convert) | Audio Converter (MP3, M4A, WAV, OGG, Opus, FLAC) | ffmpeg — loudnorm, trim, fade, silenceremove | `audio-converted` (per file) |
| [`image-compress/`](./image-compress) | Image Compressor (TinyPNG alternative) | engine `image-convert` (disalin) + target ukuran KB (binary search quality) | `image-compressed` |
| [`remove-background/`](./remove-background) | AI Background Remover | onnxruntime-node + IS-Net `isnet-general-use.onnx` (Apache-2.0, ±170 MB, diunduh saat build dengan checksum — tidak di git) | `background-removed` |
| [`video-frames/`](./video-frames) | Video Frame Extractor & Thumbnail Maker | ffmpeg — interval, jumlah, timestamp, scene change | `video-processed` (per video) |
| [`office-convert/`](./office-convert) | Word, Excel & PowerPoint to PDF Converter | LibreOffice headless (Debian) + font metrik-kompatibel (Carlito, Caladea, Liberation, Noto); juga DOCX↔ODT, XLSX↔ODS/CSV, PPTX↔ODP, PDF/A | `document-converted` (per dokumen) |
| [`pdf-to-image/`](./pdf-to-image) | PDF to JPG, PNG & WebP | Poppler `pdftoppm` (Debian) + sharp untuk WebP, ZIP per PDF | `pdf-page-rendered` (per halaman) |
| [`image-to-svg/`](./image-to-svg) | Image to SVG Vectorizer | VTracer (`vtracer-wasm`, sama dengan `src/tools/image-to-svg/`), satu worker thread per gambar | `image-vectorized` |
| [`pdf-toolkit/`](./pdf-toolkit) | PDF Merge, Split, Extract & Rotate | qpdf (wasm) — merge, split (per N halaman / rentang), extract, delete, rotate, unlock | `pdf-processed` (per PDF input) |
| [`qr-generator/`](./qr-generator) | QR Code Generator (Bulk, Logo, SVG & PNG) | qrcode (MIT) + gaya kotak/bulat/titik dan logo seperti `src/tools/qr/render.ts`, sharp untuk PNG, ZIP | `qr-generated` (per kode) |
| [`barcode-generator/`](./barcode-generator) | Barcode Generator (EAN, UPC, Code 128, …) | bwip-js (MIT), deteksi jenis otomatis dari panjang angka, PNG/SVG, ZIP | `barcode-generated` (per kode) |
| [`favicon-generator/`](./favicon-generator) | Favicon Generator (ICO, PNG, Manifest) | sharp — set sama dengan `src/tools/favicon-generator/`: ICO 16/32/48, apple-touch, android, maskable, `site.webmanifest`, satu ZIP per gambar | `favicon-set-generated` (per set) |
| [`pdf-to-office/`](./pdf-to-office) | PDF to Word & Excel Converter | **engine situs persis**: `src/tools/pdf-to-word/convert.ts` + `pdf-to-excel/convert.ts` dibundel jadi `src/engine.js` (`node apify/pdf-to-office/build-engine.mjs`), docx + exceljs | `pdf-page-converted` (per halaman) |
| [`web-to-pdf/`](./web-to-pdf) | HTML, URL & Markdown to PDF | Playwright Chromium (image `actor-node-playwright-chrome`), marked, template `{{field}}` untuk invoice/sertifikat massal | `pdf-generated` (per PDF) |
| [`image-to-pdf/`](./image-to-pdf) | Image to PDF Converter | sharp (rotasi EXIF, resize, JPEG) + pdf-lib, satu PDF gabungan atau per gambar | `image-converted` (per gambar) |
| [`watermark-images/`](./watermark-images) | Bulk Image Watermark | sharp + overlay SVG, geometri sama dengan `src/tools/watermark-foto/layout.ts`; font DejaVu/Liberation/Noto di Dockerfile | `image-watermarked` (per gambar) |
| [`pdf-protect/`](./pdf-protect) | PDF Password Protect & Unlock | qpdf (wasm), AES-256 seperti `src/tools/protect-pdf/protect.ts`, password per file | `pdf-secured` (per PDF) |
| [`speech-to-text/`](./speech-to-text) | Speech to Text & Subtitles (Whisper) | **engine situs persis**: `src/tools/transkrip/whisper.ts` (Whisper base int8) dibundel jadi `src/engine.js` (`node apify/speech-to-text/build-engine.mjs`), onnxruntime-node, ffmpeg untuk decode; 99 bahasa | `audio-minute` (per menit dimulai) |
| [`stem-separator/`](./stem-separator) | AI Vocal Remover & Stem Splitter | **engine situs persis**: SCNet dari `src/tools/vocal-remover/separate.ts` dibundel jadi `src/engine.js`, onnxruntime-node, ffmpeg | `audio-minute` (per menit dimulai) |
| [`text-to-speech/`](./text-to-speech) | Text to Speech MP3 | potong kalimat dari `src/tools/text-to-speech/tts.ts` (dibundel), Piper `en_US-joe-medium` di onnxruntime-node + eSpeak NG wasm (100+ bahasa), ffmpeg untuk MP3/M4A/OGG | `characters-1k` (per 1.000 karakter dimulai) |
| [`remove-object/`](./remove-object) | AI Object Remover | MI-GAN (`migan.onnx` situs) di onnxruntime-node, metode `src/tools/remove-object/inpaint.ts` di-port ke sharp; mask gambar atau kotak | `object-removed` (per gambar) |
| [`lpse-tenders/`](./lpse-tenders) | LPSE Tender Scraper (Indonesia, SPSE) | scraper `spse.inaproc.id/<slug>/dt/lelang` (DataTable JSON + authenticityToken sesi), cheerio untuk halaman pengumuman, jeda 1 detik sesuai robots.txt | `tender-scraped` (per tender) |
| [`halal-certificates/`](./halal-certificates) | Indonesia Halal Certificate Checker (BPJPH) | pencarian publik `bpjph.halal.go.id/cari/sertifikat` (hasil dibaca dari payload RSC Next.js, 10 per halaman), cari per produk / perusahaan / nomor sertifikat | `product-found` (per produk) |
| [`food-prices/`](./food-prices) | Indonesia Food Prices Daily (Bank Indonesia PIHPS) | GET `bi.go.id/hargapangan/WebSite/TabelHarga/GetGridDataDaerah` (grid lebar per tanggal → satu baris per komoditas per hari), nasional / provinsi / kota, 4 jenis pasar | `price-record` (per baris harga) |

Model empat Actor AI baru (Whisper, SCNet, Piper, MI-GAN) tidak disalin ke
`apify/`: Dockerfile-nya mengambil file model yang sama dari `src/tools/…` di
GitHub (`raw.githubusercontent.com/chalidade/tools/main/…`) saat build, dicek
SHA-256. Kalau model di situs diganti, perbarui checksum di Dockerfile-nya.
`engine.js` mereka dibuat oleh `apify/bundle-engine.mjs` (esbuild; `onnxruntime-web`
diganti `onnxruntime-node`) — jalankan lagi `build-engine.mjs` Actor-nya setelah
kode tool di `src/tools/` berubah.

`pdf-markdown/src/engine.js` adalah hasil build — setelah mengubah
`src/tools/pdf-to-markdown`, `pdf-to-word/convert.ts`, `pdf-to-excel/convert.ts`
atau `src/lib/pdf-text.ts`, jalankan `node apify/pdf-markdown/build-engine.mjs`
(dari root repo, setelah `npm install`) lalu commit hasilnya.

Semua Actor: input `files` (daftar URL), unduh paralel, hasil file disimpan di
key-value store run, satu baris dataset per file (dengan `downloadUrl`). File
yang gagal tetap dapat baris dengan `error`, **tanpa ditagih**. Run berhenti
rapi saat batas biaya user ("Max cost per run") tercapai.

`_shared/batch.js` (dan `_shared/ffmpeg.js` untuk Actor media) dipakai semua Actor — edit di situ lalu jalankan
`node apify/sync-shared.mjs` untuk menyalin ke `src/` tiap Actor (Apify
mem-build tiap folder sendiri-sendiri, jadi tidak bisa import dari folder
sebelah). `samples/` berisi file contoh untuk prefill input.

## Coba lokal

```bash
cd apify/pdf-compress && npm install
mkdir -p storage/key_value_stores/default
echo '{"files":["https://raw.githubusercontent.com/chalidade/tools/main/apify/samples/sample.pdf"]}' \
  > storage/key_value_stores/default/INPUT.json
npm start          # hasil di storage/key_value_stores/default dan storage/datasets/default
```

Atau pakai Apify CLI: `npm i -g apify-cli`, lalu `apify run` di folder Actor.

## Langkah publish (dikerjakan pemilik akun)

1. **Daftar Apify** (gratis) di https://console.apify.com/sign-up, isi profil
   publik (username jadi bagian URL Actor, mis. `toowl`).
2. **Payout**: Console → Settings → *Publishing / Payouts* → isi data
   pembayaran (PayPal atau transfer bank) dan data pajak. Tanpa ini Actor
   berbayar tidak bisa dipublikasikan.
3. **Buat Actor dari GitHub** (sekali per Actor): Console → Actors →
   *Develop new* → *Link Git repository* → `https://github.com/chalidade/tools`
   dengan folder, mis. `#main:apify/pdf-compress`. (Alternatif:
   `cd apify/pdf-compress && apify login && apify push`.)
4. **Build** → tunggu hijau → tab *Input* isi contoh → *Start*. Cek dataset dan
   file hasil. Ulangi untuk `image-convert` dan `qr-reader`.
5. **Monetisasi**: Actor → *Publication* → *Monetization* → pilih
   **Pay per event** dan isi event sesuai tabel harga di bawah (nama event
   harus persis sama). Matikan event sintetis **`apify-default-dataset-item`**
   (baris error tidak boleh ditagih); biarkan `apify-actor-start` default.
6. **Publication**: isi kategori, ikon (pakai `codester/<kit>/icon-200x200.png`
   atau logo toowl), lalu *Publish to Store*. Deskripsi diambil dari
   `README.md` masing-masing Actor (sudah ditulis untuk SEO Store).
7. **Tampilkan di situs**: setelah Actor publik, ubah `published: true` untuk
   tool-nya di `src/lib/apify.ts`. Kartu "Butuh ribuan file sekaligus?" muncul
   di halaman tool itu dan link "API · Apify" di footer, semuanya memakai token
   afiliasi Apify `?fpr=toowl` (komisi 20% tiga bulan pertama, lalu 30%
   berulang, dari pelanggan baru yang daftar lewat link itu).
8. Pasang **auto-build**: di Actor → *Settings* → aktifkan webhook GitHub
   supaya push ke `main` mem-build ulang.

## Harga yang disarankan (pay per event)

Apify memberi developer **80%** dari pendapatan event, dikurangi biaya
platform (compute) run user berbayar. User free plan: biaya platform
ditanggung Apify.

| Actor | Event | Harga | Per 1.000 | Perkiraan biaya compute per item* |
| --- | --- | --- | --- | --- |
| PDF Compressor | `pdf-compressed` (primary) | **$0.005** | $5 | ~$0.0001–0.0005 |
| Image Converter | `image-converted` (primary) | **$0.0015** | $1.50 | ~$0.00002 |
| QR & Barcode Reader | `image-scanned` (primary) | **$0.001** | $1 | ~$0.00001 |
| AI Image Upscaler | `image-upscaled` (primary) | **$0.02** | $20 | ~$0.001–0.01 (CPU, 4 GB; 2 MP di 4× ±30 detik) |
| OCR | `page-ocr` (primary) | **$0.002** | $2 | ~$0.0002 (±1 detik per halaman) |
| PDF to Markdown | `pdf-page-converted` (primary) | **$0.001** | $1 | ~$0.00002 |
| Video Compressor | `video-minute` (primary) | **$0.03** | $30 | ~$0.005–0.02 per menit (1080p x264 veryfast ±50 detik CPU per menit video) |
| Audio Converter | `audio-converted` (primary) | **$0.002** | $2 | ~$0.0002 |
| Image Compressor | `image-compressed` (primary) | **$0.001** | $1 | ~$0.00002 (target KB: ±7 kali encode) |
| Background Remover | `background-removed` (primary) | **$0.01** | $10 | ~$0.001–0.004 (IS-Net 1024², 2–8 detik CPU) |
| Video Frame Extractor | `video-processed` (primary) | **$0.003** | $3 | ~$0.0005 |
| Office Converter | `document-converted` (primary) | **$0.005** | $5 | ~$0.0005–0.002 (LibreOffice 1–5 detik, 2 GB) |
| PDF to Image | `pdf-page-rendered` (primary) | **$0.001** | $1 | ~$0.00005 (150 DPI ±0,2 detik per halaman) |
| Image to SVG | `image-vectorized` (primary) | **$0.005** | $5 | ~$0.0002 (logo ±0,5 detik; foto 2000 px bisa 10–30 detik) |
| PDF Toolkit | `pdf-processed` (primary) | **$0.002** | $2 | ~$0.00005 |
| QR Code Generator | `qr-generated` (primary) | **$0.001** | $1 | ~$0.00001 |
| Barcode Generator | `barcode-generated` (primary) | **$0.001** | $1 | ~$0.00001 |
| Favicon Generator | `favicon-set-generated` (primary) | **$0.01** | $10 | ~$0.0001 |
| PDF to Word & Excel | `pdf-page-converted` (primary) | **$0.002** | $2 | ~$0.00005 |
| HTML to PDF | `pdf-generated` (primary) | **$0.003** | $3 | ~$0.0003–0.001 (Chromium, 1–3 detik) |
| Image to PDF | `image-converted` (primary) | **$0.001** | $1 | ~$0.00003 |
| Bulk Image Watermark | `image-watermarked` (primary) | **$0.001** | $1 | ~$0.00003 |
| PDF Password Protect | `pdf-secured` (primary) | **$0.002** | $2 | ~$0.00002 |
| Speech to Text (Whisper) | `audio-minute` (primary) | **$0.02** | $20 | ~$0.01 (±32 detik CPU per menit audio) |
| AI Vocal Remover | `audio-minute` (primary) | **$0.07** | $70 | ~$0.03 (±80 detik CPU per menit lagu; 4 GB) |
| Text to Speech | `characters-1k` (primary) | **$0.02** | $20 (per 1 juta karakter) | ~$0.005 (Piper ±13 detik CPU per 1.000 karakter; eSpeak jauh lebih murah) |
| AI Object Remover | `object-removed` (primary) | **$0.01** | $10 | ~$0.001 (±1 detik CPU per area) |

Video Compressor menagih **per menit video hasil** (menit pertama ikut baris dataset). OCR, PDF to Markdown dan PDF to Image menagih **per halaman**: halaman pertama ikut baris
dataset, sisanya lewat `Actor.charge` (tetap dalam batas "Max cost per run").
PDF Toolkit mode merge menagih satu event per PDF input (dicek dulu terhadap
batas biaya sebelum mulai).

\* 1 GB RAM, ~0,3–2 detik per file. Margin bersih ±75%.

Actor AI (Whisper, SCNet, Piper, MI-GAN) jalan di CPU. Di Apify CPU ikut
memori (±1 vCPU per 4 GB), jadi biayanya ≈ detik-CPU × 4 GB. Estimasi di
tabel memakai ±$0,3 per compute unit; marginnya ±50–65%, lebih tipis dari
Actor lain, jadi jangan turunkan harganya tanpa mengukur ulang.

Set *minimum max total charge* = $0.01 supaya run tidak mulai dengan budget
kurang dari 1–2 file. Cek harga Actor sejenis di Store sebelum publish dan
sesuaikan. Perubahan harga tidak berlaku seketika (user diberi waktu
pemberitahuan), jadi lebih aman mulai sedikit di bawah pesaing lalu naik.

## Lisensi

Kode Actor ada di repo ini, jadi **AGPL-3.0-only** (pemilik repo pemegang hak
cipta, jadi boleh menjual layanannya). Dependensi yang ikut di image:

| Paket | Lisensi | Catatan |
| --- | --- | --- |
| apify SDK, crawlee | Apache-2.0 | |
| sharp | Apache-2.0 | |
| libvips (`@img/sharp-libvips-*`) | LGPL-3.0-or-later | library dinamis, tidak dimodifikasi — aman |
| @neslinesli93/qpdf-wasm | ISC (qpdf: Apache-2.0) | |
| libheif-js | LGPL-3.0 | wasm tidak dimodifikasi — aman |
| zxing-wasm | MIT (ZXing-C++: Apache-2.0) | |
| onnxruntime-node | MIT | binari CUDA/TensorRT dan platform lain dihapus di Dockerfile |
| realesr-general-x4v3 (model) | BSD-3-Clause | |
| isnet-general-use (model, IS-Net/DIS) | Apache-2.0 | diunduh dari rilis rembg saat build |
| ffmpeg (paket Debian, binari terpisah) | GPL-2.0-or-later (build Debian dengan x264) | dipanggil sebagai proses, tidak di-link; GPL-2+ kompatibel dengan AGPL-3.0 |
| LibreOffice (paket Debian, binari terpisah) | MPL-2.0 | dipanggil sebagai proses |
| Poppler `pdftoppm`/`pdfinfo` (paket Debian, binari terpisah) | GPL-2.0-or-later | dipanggil sebagai proses, tidak di-link |
| Font: Liberation, Carlito, Caladea, Noto, DejaVu | OFL-1.1 / Apache-2.0 / bebas | paket Debian |
| vtracer-wasm (VTracer) | MIT | |
| fflate | MIT | ZIP hasil split, QR, barcode, favicon |
| qrcode | MIT | QR Code Generator |
| bwip-js | MIT | Barcode Generator |
| pdf-lib | MIT | Image to PDF |
| docx, exceljs | MIT | PDF to Word & Excel |
| marked | MIT | HTML to PDF (Markdown) |
| Playwright + Chromium | Apache-2.0 / BSD | HTML to PDF, dari image dasar Apify |
| tesseract.js, tesseract.js-core | Apache-2.0 | |
| @tesseract.js-data/* (tessdata best_int) | Apache-2.0 | |
| pdfjs-dist (+ @napi-rs/canvas, opsional) | Apache-2.0 / MIT | |
| Whisper base (model, `Xenova/whisper-base` int8) | MIT (bobot OpenAI) / Apache-2.0 (konversi) | diambil dari `src/tools/transkrip/model/` saat build |
| SCNet (model, `scnet.fp16.onnx`) | MIT | starrytong/SCNet; diambil dari `src/tools/vocal-remover/` |
| Piper `en_US-joe-medium` (model) | CC0 | diambil dari `src/tools/text-to-speech/` |
| espeak-ng (npm, eSpeak NG wasm) | GPL-3.0-or-later | kompatibel dengan AGPL-3.0 |
| MI-GAN (model, `migan.onnx`) | MIT | Picsart AI Research; diambil dari `src/tools/remove-object/` |
| lain-lain | MIT/BSD/ISC/0BSD/BlueOak; caniuse-lite CC-BY-4.0 (data) | dicek dengan `license-checker` |

Tidak ada Ghostscript (AGPL, lisensi komersial mahal) atau potrace (GPL).
Karena repo publik, orang bisa menjalankan sendiri — yang dijual di Apify
adalah kepraktisan (API, integrasi, tanpa server).
