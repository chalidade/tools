# Roadmap

Ide tools berikutnya, dibagi per hari supaya tiap hari ada update kecil yang
selesai. Setelah sebuah batch rilis, centang di sini dan catat di
[CHANGELOG.md](CHANGELOG.md). Urutan dan tanggal boleh digeser.

Aturan yang sama berlaku untuk semuanya: jalan penuh di browser, tanpa
upload, dan dwibahasa (ID/EN).

## Hari 2 — 2026-10-19 · Foto & gambar

- [ ] **Ubah Format Gambar** (`#/convert-image`): HEIC/WebP/PNG/JPG/AVIF ke
  JPG/PNG/WebP, banyak file sekaligus. HEIC (foto iPhone) butuh decoder wasm
  yang di-host sendiri, jangan dari CDN. Pakai `decodeImage`/`canvasBlob` dari
  `src/lib/image.ts`.
- [ ] **Pas Foto** (`#/pas-foto`): potong ke 2×3, 3×4, 4×6 dengan latar
  merah/biru/putih, lalu disusun di kertas 4R/A4 siap cetak. Pakai mesin
  `remove-background` yang sudah ada.
- [ ] **Hapus Metadata Foto** (`#/strip-exif`): tampilkan EXIF (kamera,
  tanggal, lokasi GPS di peta teks), lalu simpan ulang tanpa metadata.

## Hari 3 — 2026-10-20 · PDF

- [ ] **Atur Halaman PDF** (`#/organize-pdf`): susun ulang (drag), hapus,
  putar, dan duplikat halaman dengan thumbnail. Pakai `src/lib/pdf-doc.ts`
  (`pageThumbs`, `openPdfDoc`).
- [ ] **Nomor Halaman PDF** (`#/page-numbers`): posisi, format ("1", "1 / 10",
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

## Simpanan (belum dijadwalkan)

- Musik lanjutan: piano virtual, pembuat progresi chord, dan perekam latihan
  dengan metronom.
- Tuner: mode biola/cello, dan nada acuan berkelanjutan (drone).
