# Roadmap

Ide tools berikutnya, dibagi per hari supaya tiap hari ada update kecil yang
selesai. Setelah sebuah batch rilis, centang di sini dan catat di
[CHANGELOG.md](CHANGELOG.md). Urutan dan tanggal boleh digeser.

Aturan yang sama berlaku untuk semuanya: jalan penuh di browser, tanpa
upload, dan dwibahasa (ID/EN).

## Hari 2 — 2026-10-19 · Foto & gambar

- [x] **Ubah Format Gambar** (`#/convert-image`): HEIC/WebP/PNG/JPG/AVIF ke
  JPG/PNG/WebP, banyak file sekaligus. HEIC (foto iPhone) butuh decoder wasm
  yang di-host sendiri, jangan dari CDN. Pakai `decodeImage`/`canvasBlob` dari
  `src/lib/image.ts`.
- [x] **Pas Foto** (`#/pas-foto`): potong ke 2×3, 3×4, 4×6 dengan latar
  merah/biru/putih, lalu disusun di kertas 4R/A4 siap cetak. Pakai mesin
  `remove-background` yang sudah ada.
- [x] **Hapus Metadata Foto** (`#/strip-exif`): tampilkan EXIF (kamera,
  tanggal, lokasi GPS di peta teks), lalu simpan ulang tanpa metadata.

## Hari 3 — 2026-10-20 · PDF

- [x] **Atur Halaman PDF** (`#/organize-pdf`): susun ulang (drag), hapus,
  putar, dan duplikat halaman dengan thumbnail. Pakai `src/lib/pdf-doc.ts`
  (`pageThumbs`, `openPdfDoc`).
- [x] **Nomor Halaman PDF** (`#/page-numbers`): posisi, format ("1", "1 / 10",
  "Halaman 1"), dan halaman awal.

## Hari 4 — 2026-10-21 · Teks & keamanan

- [ ] **Pembuat Password** (`#/password-generator`): panjang, jenis
  karakter, passphrase kata Indonesia/Inggris, dan pengecek kekuatan (estimasi
  waktu tebak). Gunakan `crypto.getRandomValues`.
- [ ] **Penghitung Kata** (`#/word-counter`): kata, karakter (dengan/tanpa
  spasi), kalimat, paragraf, waktu baca/bicara, dan batas karakter per platform
  (X, Instagram, meta description).

## Hari 5 — 2026-10-22 · Hitung sehari-hari

- [ ] **Konversi Satuan** (`#/unit-converter`): panjang, berat (termasuk
  ons, kuintal), luas (hektare, are, tumbak), volume, suhu, kecepatan, dan data.
- [ ] **Kalkulator Tanggal** (`#/date-calculator`): umur tepat, selisih hari,
  hari kerja (dengan libur nasional Indonesia dibundel sebagai JSON), dan
  tambah/kurang hari.

## Hari 6 — 2026-10-23 · Developer

- [ ] **Encode / Decode** (`#/encode-decode`): Base64 teks, URL encode,
  HTML entities, dan JWT decode (header + payload, tanpa verifikasi).
- [ ] **Generator UUID** (`#/uuid`): v4/v7, banyak sekaligus, dan format
  (huruf besar, tanpa tanda hubung).
- [ ] **Bandingkan Teks** (`#/text-diff`): diff per baris/kata dengan warna,
  mode berdampingan atau gabung.

## Hari 7 — 2026-10-24 · Musik lanjutan

- [ ] **Progresi Chord** (`#/chord-progression`): susun progresi dari kunci
  dan pola (I–V–vi–IV, ii–V–I, dan lainnya), dengar langsung dengan suara
  gitar/piano yang sudah ada, transpose, lalu buka di Gitar atau Piano Online.
  Pakai helper nada di `src/lib/music.ts`.
- [ ] **Perekam Latihan** (`#/practice-recorder`): rekam dari mikrofon
  sambil metronom berbunyi (klik tidak ikut terekam), putar ulang dengan
  klik di atasnya, dan simpan sebagai MP3/WAV. Pakai penjadwal Metronom dan
  encoder dari `src/lib/media.ts`.

## Hari 8 — 2026-10-25 · Tuner lanjutan

- [ ] **Tuner: biola & cello** di `#/guitar-tuner`: stem biola (G D A E),
  viola, dan cello (C G D A), dengan rentang deteksi nada yang disesuaikan
  untuk nada rendah cello.
- [ ] **Tuner: nada acuan berkelanjutan (drone)**: nada senar atau nada
  bebas yang terus berbunyi sampai dimatikan, untuk menyetem dengan telinga
  atau latihan intonasi.
