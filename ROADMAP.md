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

## Hari 9 — 2026-10-26 · Ibadah

- [ ] **Jadwal Sholat** (`#/jadwal-sholat`): waktu sholat dihitung di
  perangkat dari koordinat (sudut Subuh/Isya metode Kemenag, ihtiyat), tanpa
  API. Lokasi dari GPS atau dari daftar kab/kota yang dibundel sebagai JSON;
  tampilan harian dan sebulan, bisa dicetak.
- [ ] **Arah Kiblat** (`#/arah-kiblat`): sudut kiblat dari lokasi, plus
  kompas di HP lewat `DeviceOrientationEvent` (izin di iOS), dengan peringatan
  kalibrasi bila sensor tidak akurat.
- [ ] **Konversi Hijriah ⇄ Masehi** (`#/hijriah`): lewat kalender
  `islamic-umalqura` bawaan `Intl`, plus hari besar Islam setahun. Beri catatan
  bahwa tanggal resmi Kemenag (rukyat) bisa selisih satu hari.

## Hari 10 — 2026-10-27 · Zakat, tasbih, terbilang

- [ ] **Kalkulator Zakat** (`#/zakat`): zakat mal, emas/perak, penghasilan,
  dan fitrah. Nisab dihitung dari harga emas yang diisi pengguna (tidak
  diambil dari internet), dengan rumus dan sumber ketentuan yang ditampilkan.
- [ ] **Tasbih Digital** (`#/tasbih`): penghitung besar dengan target
  33/99/bebas, getar saat target tercapai (`navigator.vibrate`), pintasan
  keyboard, dan riwayat tersimpan di perangkat.
- [ ] **Terbilang** (`#/terbilang`): angka ke teks Indonesia ("satu juta dua
  ratus ribu rupiah") dan Inggris, dengan pilihan huruf besar dan akhiran
  rupiah, untuk kwitansi dan cek.

## Hari 11 — 2026-10-28 · Usaha kecil

- [ ] **QRIS Nominal** (`#/qris`): baca QRIS statis toko (dari gambar atau
  kamera, pakai pembaca di `src/tools/qr/`), sisipkan nominal (tag 54), hitung
  ulang CRC, lalu tampilkan QR baru siap dipindai. Tidak ada yang dikirim ke
  mana pun.
- [ ] **Kwitansi & Invoice** (`#/kwitansi`): isi penerima, item, dan total
  (nominal terbilang otomatis dari tool Terbilang), lalu unduh PDF lewat
  pdf-lib. Data terakhir tersimpan di perangkat untuk dipakai lagi.

## Hari 12 — 2026-10-29 · Keuangan

- [ ] **Kalkulator Cicilan** (`#/cicilan`): bunga flat dan anuitas
  (efektif), tabel angsuran per bulan, total bunga, dan ekspor CSV.
- [ ] **Kalkulator Gaji Bersih** (`#/gaji-bersih`): PPh 21 (tarif efektif
  rata-rata) dan potongan BPJS Kesehatan serta Ketenagakerjaan. Semua tarif dan
  batas upah di satu file dengan tanggal berlakunya, dan hasil diberi catatan
  bahwa ini perkiraan, bukan nasihat pajak.

## Hari 13 — 2026-10-30 · Foto untuk formulir

- [ ] **Kompres ke Ukuran Target** di `#/compress-image`: mode "maksimal
  N KB" (mis. 200 KB untuk CPNS/SNBT) yang mencari kualitas dan, bila perlu,
  dimensi terbesar yang masih di bawah batas. Pakai `canvasBlob` dari
  `src/lib/image.ts`.

## Hari 14 — 2026-10-31 · Scan & OCR

- [ ] **Scan Dokumen** (`#/scan`): foto kertas dari kamera atau galeri,
  tarik empat sudut (deteksi tepi otomatis sebagai tebakan awal), luruskan
  perspektif dengan homografi di canvas (tanpa OpenCV), mode hitam-putih
  tajam/abu-abu/warna, lalu gabung beberapa halaman jadi satu PDF.
- [ ] **OCR — Foto ke Teks** (`#/ocr`): Tesseract (wasm) dengan bahasa
  Indonesia dan Inggris. Worker, core wasm, dan data bahasa di-host sendiri,
  jangan dari CDN bawaannya, dan hanya dimuat saat tool dibuka. Hasil bisa
  disalin atau diunduh sebagai TXT; nanti bisa dipakai juga oleh Scan Dokumen.

## Hari 15 — 2026-11-01 · Barcode & subtitle

- [ ] **Generator Barcode** (`#/barcode`): EAN-13, EAN-8, UPC-A, Code 128,
  dan Code 39, dengan validasi digit cek, ukuran dan teks di bawahnya, unduh
  PNG/SVG, dan lembar label banyak sekaligus siap cetak.
- [ ] **Subtitle** (`#/subtitle`): buka SRT/VTT, geser semua waktu
  (maju/mundur), regangkan untuk beda frame rate, gabung dua file, dan ubah
  SRT ⇄ VTT, dengan pratinjau di atas video milik pengguna.

## Hari 16 — 2026-11-02 · Bareng teman

- [ ] **Undian & Arisan** (`#/undian`): acak nama dengan
  `crypto.getRandomValues` dan animasi, mode arisan yang mengecualikan
  pemenang sebelumnya sampai semua dapat giliran, riwayat tersimpan di
  perangkat, dan hasil siap dibagikan.
- [ ] **Patungan** (`#/patungan`): item per orang atau dibagi rata, pajak dan
  service dibagi proporsional, pembulatan yang jumlahnya tetap pas, lalu
  rangkuman siap kirim ke WhatsApp.

## Hari 17 — 2026-11-03 · Waktu

- [ ] **Timer Pomodoro** (`#/pomodoro`): fokus/istirahat yang bisa diatur,
  hitungan dari jam (bukan interval, jadi tetap tepat saat tab di latar),
  notifikasi dan bunyi saat sesi selesai, dan layar tetap menyala lewat Wake
  Lock bila didukung.
- [ ] **Stopwatch & Timer** (`#/stopwatch`): stopwatch dengan lap, timer
  hitung mundur, dan tampilan layar penuh angka besar.

## Hari 18 — 2026-11-04 · Privasi foto

- [ ] **Watermark KTP & Dokumen Identitas** (`#/watermark-ktp`): teks
  melintang berulang di foto KTP/SIM/paspor ("Hanya untuk verifikasi …",
  tanggal otomatis), atur ukuran, sudut, dan transparansi, lalu simpan ulang
  tanpa EXIF. Pakai `decodeImage`/`canvasBlob` dari `src/lib/image.ts`.
- [ ] **Sensor Foto** (`#/sensor-foto`): tutup bagian foto (NIK, wajah, plat
  nomor, alamat) dengan kotak atau kuas, model blok hitam, piksel besar, atau
  blur. Gambar disimpan ulang sehingga bagian yang ditutup benar-benar hilang.
  Beri peringatan bahwa blur tipis pada teks kecil bisa ditebak, jadi default
  ke blok hitam.

## Hari 19 — 2026-11-05 · Privasi file

- [ ] **Redaksi PDF** (`#/redact-pdf`): tandai area di halaman, lalu halaman
  yang ditandai dirender ulang jadi gambar (pdf.js) dengan area itu dihitamkan,
  sehingga teks aslinya hilang dari file, bukan cuma tertutup. Halaman lain
  tetap utuh. Beri tahu bahwa teks di halaman yang diredaksi tidak bisa
  disalin lagi.
- [ ] **Enkripsi & Dekripsi File** (`#/encrypt-file`): kunci file apa saja
  dengan password lewat WebCrypto (AES-256-GCM, kunci dari PBKDF2-SHA-256
  dengan iterasi tinggi dan salt acak), nama file asli disimpan di dalamnya,
  dan buka lagi di tool yang sama. Tegaskan bahwa password yang lupa tidak bisa
  dipulihkan.

## Hari 20 — 2026-11-06 · PDF

- [ ] **PDF Hemat Tinta** (`#/pdf-grayscale`): ubah ke abu-abu atau
  hitam-putih (dengan ambang yang bisa diatur dan opsi latar jadi putih)
  sebelum dicetak. Halaman dirender ulang, jadi beri tahu bahwa teksnya jadi
  gambar.
- [ ] **Ekstrak Gambar dari PDF** (`#/pdf-extract-images`): ambil semua
  gambar yang tertanam di PDF. Gambar JPEG disimpan apa adanya (tanpa kompres
  ulang), yang lain diekspor sebagai PNG; unduh satu per satu atau ZIP.

## Hari 21 — 2026-11-07 · Arsip & suara

- [ ] **ZIP** (`#/zip`): buat ZIP dari banyak file (atau satu folder), dan
  buka ZIP untuk melihat dan mengambil isinya satu per satu. Pakai library
  kecil yang di-bundel; RAR/7z menyusul lewat wasm yang di-host sendiri bila
  ukurannya masuk akal.
- [ ] **Teks ke Suara** (`#/text-to-speech`): bacakan teks dengan suara
  bawaan perangkat (`speechSynthesis`), pilih suara, kecepatan, dan nada. Hanya
  tampilkan suara dengan `localService === true`: suara "Google …" di Chrome
  dikirim ke server dan melanggar janji tools. API ini tidak bisa merekam, jadi
  hanya diputar, tanpa unduh audio.

## Hari 22 — 2026-11-08 · Video

- [ ] **Edit Video Ringan** (`#/edit-video`): putar 90°, crop, hapus suara,
  dan gabung beberapa klip jadi satu MP4. Pakai Mediabunny lewat
  `src/lib/media.ts` (`probeMedia`, `convertMedia`), sama seperti Potong Video.
