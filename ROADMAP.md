# Roadmap

Ide tools berikutnya, dibagi per hari supaya tiap hari ada update kecil yang
selesai. Setelah sebuah batch rilis, centang di sini dan catat di
[CHANGELOG.md](CHANGELOG.md). Urutan dan tanggal boleh digeser.

Aturan yang sama berlaku untuk semuanya: jalan penuh di browser, tanpa
upload, dan dwibahasa (ID/EN).

## Prioritas — bisa ditemukan dan langsung dipakai dari Google

Dikerjakan sebelum batch harian berikutnya: sekarang semua tool ada di
`#/<slug>`, yang bagi Google hanya satu halaman, tanpa sitemap dan robots.txt.
Tujuannya: orang mencari "kompres pdf tanpa upload", mengklik hasil Google, dan
tool-nya langsung terbuka siap dipakai.

- [x] **Satu halaman statis per tool** (`/tools/<slug>/index.html`, dibuat saat
  build dari `registry.ts`): judul dan meta description sendiri, canonical, OG,
  JSON-LD `WebApplication`, dan teks yang terbaca tanpa JavaScript (H1, cara
  pakai, FAQ singkat, catatan privasi). Aplikasi membaca slug dari path lalu
  membuka tool itu; link lama `#/<slug>` dialihkan ke path baru. GitHub Pages
  menyajikan `index.html` per folder, jadi reload tidak 404.
- [x] **Versi English** di `/tools/en/<slug>/` dengan `hreflang` id/en dua arah.
- [x] **`sitemap.xml`** semua halaman (dibuat saat build), dan **`robots.txt`**
  di repo `chalidade/chalidade.github.io` (robots hanya dibaca di root domain)
  yang menunjuk ke sitemap itu.
- [x] **Google Search Console** (dikerjakan pemilik akun): verifikasi properti
  `https://chalidade.github.io/tools/` lewat meta tag, kirim sitemap, minta
  indexing untuk halaman utama dan tool terpenting.
- [ ] **Pindah ke domain `toowl.my.id`**: daftarkan properti Domain baru di
  Search Console (TXT DNS), kirim `https://toowl.my.id/sitemap.xml`, lalu
  pakai "Change of address" dari properti lama. `robots.txt` sekarang ikut
  build (`public/robots.txt`).
- [x] **Kata kunci yang sering dicari** di `keywords` registry dan teks
  halamannya: "vn", "voice note", "whatsapp" (Kompres Audio sudah bisa .opus ke
  MP3), "video ke mp3", "rotate pdf", "jpg ke pdf", dan semacamnya.
- [ ] **Cek kecepatan & mobile** halaman tool (Lighthouse/PageSpeed): halaman
  harus cepat dan bisa langsung dipakai di HP, karena itu ikut menentukan
  peringkat.

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

- [x] **Pembuat Password** (`#/password-generator`): panjang, jenis
  karakter, passphrase kata Indonesia/Inggris, dan pengecek kekuatan (estimasi
  waktu tebak). Gunakan `crypto.getRandomValues`.
- [x] **Penghitung Kata** (`#/word-counter`): kata, karakter (dengan/tanpa
  spasi), kalimat, paragraf, waktu baca/bicara, dan batas karakter per platform
  (X, Instagram, meta description).

## Hari 5 — 2026-10-22 · Hitung sehari-hari

- [x] **Konversi Satuan** (`#/unit-converter`): panjang, berat (termasuk
  ons, kuintal), luas (hektare, are, tumbak), volume, suhu, kecepatan, dan data.
- [x] **Kalkulator Tanggal** (`#/date-calculator`): umur tepat, selisih hari,
  hari kerja (dengan libur nasional Indonesia dibundel sebagai JSON), dan
  tambah/kurang hari.

## Hari 6 — 2026-10-23 · Developer

- [x] **Encode / Decode** (`#/encode-decode`): Base64 teks, URL encode,
  HTML entities, dan JWT decode (header + payload, tanpa verifikasi).
- [x] **Generator UUID** (`#/uuid`): v4/v7, banyak sekaligus, dan format
  (huruf besar, tanpa tanda hubung).
- [x] **Bandingkan Teks** (`#/text-diff`): diff per baris/kata dengan warna,
  mode berdampingan atau gabung.

## Hari 7 — 2026-10-24 · Musik lanjutan

- [x] **Progresi Chord** (`#/chord-progression`): susun progresi dari kunci
  dan pola (I–V–vi–IV, ii–V–I, dan lainnya), dengar langsung dengan suara
  gitar/piano yang sudah ada, transpose, lalu buka di Gitar atau Piano Online.
  Pakai helper nada di `src/lib/music.ts`.
- [x] **Perekam Latihan** (`#/practice-recorder`): rekam dari mikrofon
  sambil metronom berbunyi (klik tidak ikut terekam), putar ulang dengan
  klik di atasnya, dan simpan sebagai MP3/WAV. Pakai penjadwal Metronom dan
  encoder dari `src/lib/media.ts`.

## Hari 8 — 2026-10-25 · Tuner lanjutan

- [x] **Tuner: biola & cello** di `#/guitar-tuner`: stem biola (G D A E),
  viola, dan cello (C G D A), dengan rentang deteksi nada yang disesuaikan
  untuk nada rendah cello.
- [x] **Tuner: nada acuan berkelanjutan (drone)**: nada senar atau nada
  bebas yang terus berbunyi sampai dimatikan, untuk menyetem dengan telinga
  atau latihan intonasi.

## Hari 9 — 2026-10-26 · Ibadah

- [x] **Jadwal Sholat** (`#/jadwal-sholat`): waktu sholat dihitung di
  perangkat dari koordinat (sudut Subuh/Isya metode Kemenag, ihtiyat), tanpa
  API. Lokasi dari GPS atau dari daftar kab/kota yang dibundel sebagai JSON;
  tampilan harian dan sebulan, bisa dicetak.
- [x] **Arah Kiblat** (`#/arah-kiblat`): sudut kiblat dari lokasi, plus
  kompas di HP lewat `DeviceOrientationEvent` (izin di iOS), dengan peringatan
  kalibrasi bila sensor tidak akurat.
- [x] **Konversi Hijriah ⇄ Masehi** (`#/hijriah`): lewat kalender
  `islamic-umalqura` bawaan `Intl`, plus hari besar Islam setahun. Beri catatan
  bahwa tanggal resmi Kemenag (rukyat) bisa selisih satu hari.

## Hari 10 — 2026-10-27 · Zakat, tasbih, terbilang

- [x] **Kalkulator Zakat** (`#/zakat`): zakat mal, emas/perak, penghasilan,
  dan fitrah. Nisab dihitung dari harga emas yang diisi pengguna (tidak
  diambil dari internet), dengan rumus dan sumber ketentuan yang ditampilkan.
- [x] **Tasbih Digital** (`#/tasbih`): penghitung besar dengan target
  33/99/bebas, getar saat target tercapai (`navigator.vibrate`), pintasan
  keyboard, dan riwayat tersimpan di perangkat.
- [x] **Terbilang** (`#/terbilang`): angka ke teks Indonesia ("satu juta dua
  ratus ribu rupiah") dan Inggris, dengan pilihan huruf besar dan akhiran
  rupiah, untuk kwitansi dan cek.

## Hari 11 — 2026-10-28 · Usaha kecil

- [x] **QRIS Nominal** (`#/qris`): baca QRIS statis toko (dari gambar atau
  kamera, pakai pembaca di `src/tools/qr/`), sisipkan nominal (tag 54), hitung
  ulang CRC, lalu tampilkan QR baru siap dipindai. Tidak ada yang dikirim ke
  mana pun.
- [x] **Kwitansi & Invoice** (`#/kwitansi`): isi penerima, item, dan total
  (nominal terbilang otomatis dari tool Terbilang), lalu unduh PDF lewat
  pdf-lib. Data terakhir tersimpan di perangkat untuk dipakai lagi.

## Hari 12 — 2026-10-29 · Keuangan

- [x] **Kalkulator Cicilan** (`#/cicilan`): bunga flat dan anuitas
  (efektif), tabel angsuran per bulan, total bunga, dan ekspor CSV.
- [x] **Kalkulator Gaji Bersih** (`#/gaji-bersih`): PPh 21 (tarif efektif
  rata-rata) dan potongan BPJS Kesehatan serta Ketenagakerjaan. Semua tarif dan
  batas upah di satu file dengan tanggal berlakunya, dan hasil diberi catatan
  bahwa ini perkiraan, bukan nasihat pajak.

Urutan di bawah ini menurut prioritas (2026-10-29): yang paling sering
dibutuhkan sehari-hari dan paling banyak dicari di depan.

## Hari 13 — 2026-10-30 · Harian: chat & belanja

- [x] **Link WhatsApp** (`#/link-wa`): nomor (08…, +62…, spasi/strip
  dibersihkan ke format `62…`) dan pesan opsional → tombol "Chat sekarang"
  tanpa simpan kontak, link `wa.me` siap salin, dan QR-nya (pakai ulang QR
  generator). Nomor terakhir tidak disimpan kecuali diminta.
- [x] **Kalkulator Persen & Diskon** (`#/persen`): X% dari Y, Y itu berapa %
  dari Z, naik/turun berapa %, dan diskon bertingkat (50% + 20% = 60%, bukan
  70%) dengan rincian tiap langkah dan jumlah yang dihemat.
- [x] **Mana Lebih Murah** (`#/mana-lebih-murah`): beberapa kemasan (harga ×
  isi, satuan g/kg/ml/L/pcs) → harga per satuan yang sama, termurah ditandai
  dan selisihnya dalam persen. Dibuat untuk dipakai satu tangan di minimarket.

## Hari 14 — 2026-10-31 · Surat

- [x] **Generator Surat** (`#/surat`): surat lamaran kerja, izin sakit /
  tidak masuk (kerja dan sekolah), surat kuasa, surat pernyataan, dan surat
  pengunduran diri. Isi formulir → pratinjau langsung → unduh PDF (jsPDF) atau
  Word (`docx`). Template di satu file data per jenis surat, isian terakhir
  disimpan di perangkat untuk dipakai lagi.

## Hari 15 — 2026-11-01 · Formulir & teks

- [x] **Kompres ke Ukuran Target** di `#/compress-image`: mode "maksimal
  N KB" (mis. 200 KB untuk CPNS/SNBT) yang mencari kualitas dan, bila perlu,
  dimensi terbesar yang masih di bawah batas. Pakai `canvasBlob` dari
  `src/lib/image.ts`.
- [x] **Ubah Huruf** (`#/ubah-huruf`): HURUF BESAR, huruf kecil, Judul Tiap
  Kata, Kalimat biasa, hapus spasi ganda/baris kosong, dan satukan baris;
  sekali ketuk lalu salin. Tautkan dari Penghitung Kata.

## Hari 16 — 2026-11-02 · Scan & OCR

- [x] **Scan Dokumen** (`#/scan`): foto kertas dari kamera atau galeri,
  tarik empat sudut (deteksi tepi otomatis sebagai tebakan awal), luruskan
  perspektif dengan homografi di canvas (tanpa OpenCV), mode hitam-putih
  tajam/abu-abu/warna, lalu gabung beberapa halaman jadi satu PDF.
- [x] **OCR — Foto ke Teks** (`#/ocr`): Tesseract (wasm) dengan bahasa
  Indonesia dan Inggris. Worker, core wasm, dan data bahasa di-host sendiri,
  jangan dari CDN bawaannya, dan hanya dimuat saat tool dibuka. Hasil bisa
  disalin atau diunduh sebagai TXT; nanti bisa dipakai juga oleh Scan Dokumen.

## Hari 17 — 2026-11-03 · CV

- [x] **Pembuat CV** (`#/cv`): CV satu halaman yang ramah ATS (teks asli,
  bukan gambar; satu kolom; heading standar), bagian yang bisa diurutkan,
  2–3 tata letak, ekspor PDF dan Word. Data disimpan di perangkat dan bisa
  diekspor/impor sebagai JSON. Contoh isian Indonesia dan Inggris.

## Hari 18 — 2026-11-04 · Listrik & gaji

- [x] **Kalkulator Token Listrik** (`#/token-listrik`): nominal → kWh per
  golongan tarif PLN (R-1 900 VA, 1.300 VA, …) setelah PPJ (beda per daerah,
  bisa diatur) dan PPN bila berlaku, plus perkiraan berapa hari habis dari
  pemakaian harian. Tarif dan tanggal berlakunya di satu file data; hasil
  ditandai perkiraan.
- [x] **Kalkulator THR & Lembur** (`#/thr-lembur`): THR penuh atau prorata
  (masa kerja/12 × upah) dan upah lembur menurut PP 35/2021 (upah sejam =
  1/173 upah sebulan; hari kerja vs hari libur, 5 atau 6 hari kerja), dengan
  rincian per jam. Aturan di satu file dengan sumbernya.

## Hari 19 — 2026-11-05 · Edit PDF

- [x] **Edit PDF** (`#/edit-pdf`): tambah teks (font, ukuran, warna), gambar,
  kotak, garis, centang, dan coretan di halaman mana saja, untuk formulir yang
  bukan AcroForm. Pakai ulang pratinjau dan penempatan dari Tanda Tangan PDF
  (`uprightPage` di `src/lib/pdf-doc.ts`).

## Hari 20 — 2026-11-06 · Cek perangkat

- [x] **Cek HP/Laptop Bekas** (`#/cek-perangkat`): daftar tes yang dicentang
  satu per satu — layar (warna penuh untuk dead pixel), sentuh (gambar di
  seluruh layar), speaker kiri/kanan, mikrofon (rekam + putar), kamera depan/
  belakang, getar, sensor gerak/orientasi, keyboard (tombol yang sudah ditekan
  menyala), dan info yang bisa dibaca browser (resolusi, baterai bila ada).
  Hasil akhir bisa disalin sebagai ringkasan. Juga berguna untuk tes kamera
  dan mic sebelum rapat online.

## Hari 21 — 2026-11-07 · Kesehatan

- [x] **Hitung HPL Kehamilan** (`#/hpl`): dari HPHT (rumus Naegele, panjang
  siklus bisa diatur) atau dari tanggal USG → HPL, usia kehamilan dalam
  minggu + hari, trimester, dan tonggak penting. Bilang bahwa ini perkiraan
  dan bidan/dokter yang menentukan.
- [x] **BMI & Berat Ideal** (`#/bmi`): BMI dengan kategori Asia-Pasifik
  (WHO 2000 / Kemenkes, beda dari ambang global), rentang berat ideal, dan
  kebutuhan kalori harian (Mifflin-St Jeor × tingkat aktivitas). Sumber
  ambang di satu file data; bilang bahwa ini skrining, bukan diagnosis.

## Hari 22 — 2026-11-08 · Darurat

Kategori baru **Darurat**. Halaman-halamannya harus tetap jalan offline
(service worker sudah menyimpan app shell; tool ini jangan bergantung pada
jaringan) dan tombol utamanya besar, bisa ditekan tanpa membaca.

- [x] **SOS** (`#/sos`): satu tombol besar — senter HP berkedip pola morse
  SOS (torch lewat `MediaStreamTrack.applyConstraints({ advanced: [{ torch }] })`,
  ada di Chrome Android; iPhone tidak punya, jadi di sana layar saja), layar
  putih penuh yang berkedip, dan sirene keras dari Web Audio. Bisa juga jadi
  senter biasa (nyala terus). Minta Wake Lock supaya layar tidak mati.
- [x] **Info Darurat** (`#/darurat`): nomor darurat Indonesia sebagai tombol
  `tel:` (112, polisi, pemadam, ambulans, Basarnas, …) — verifikasi daftarnya
  dari sumber resmi dan tulis tanggal pengecekan di satu file data. Plus
  "Bagikan lokasiku": koordinat GPS → teks siap kirim dengan link Maps,
  dibagikan lewat Web Share atau tautan WhatsApp; akurasi GPS ditampilkan.

## Hari 23 — 2026-11-09 · WhatsApp & foto

- [x] **Potong Video untuk Status WhatsApp** (`#/status-wa`): pecah video
  panjang jadi potongan berurutan dengan durasi maksimal Status WhatsApp (cek
  batas terbaru saat dibangun), kompres agar muat, lalu unduh semua sekaligus.
  Pakai `convertMedia` dengan `trim` dari `src/lib/media.ts`.
- [x] **Kolase Foto** (`#/kolase`): 2–9 foto dengan beberapa tata letak
  (grid, strip, satu besar), jarak dan sudut membulat, rasio 1:1/4:5/9:16, lalu
  unduh JPG/PNG.

## Hari 24 — 2026-11-10 · Privasi foto

- [x] **Watermark KTP & Dokumen Identitas** (`#/watermark-ktp`): teks
  melintang berulang di foto KTP/SIM/paspor ("Hanya untuk verifikasi …",
  tanggal otomatis), atur ukuran, sudut, dan transparansi, lalu simpan ulang
  tanpa EXIF. Pakai `decodeImage`/`canvasBlob` dari `src/lib/image.ts`.
- [x] **Sensor Foto** (`#/sensor-foto`): tutup bagian foto (NIK, wajah, plat
  nomor, alamat) dengan kotak atau kuas, model blok hitam, piksel besar, atau
  blur. Gambar disimpan ulang sehingga bagian yang ditutup benar-benar hilang.
  Beri peringatan bahwa blur tipis pada teks kecil bisa ditebak, jadi default
  ke blok hitam.

## Hari 25 — 2026-11-11 · Bareng teman

- [x] **Patungan** (`#/patungan`): item per orang atau dibagi rata, pajak dan
  service dibagi proporsional, pembulatan yang jumlahnya tetap pas, lalu
  rangkuman siap kirim ke WhatsApp.
- [x] **Undian & Arisan** (`#/undian`): acak nama dengan
  `crypto.getRandomValues` dan animasi, mode arisan yang mengecualikan
  pemenang sebelumnya sampai semua dapat giliran, riwayat tersimpan di
  perangkat, dan hasil siap dibagikan.

## Hari 26 — 2026-11-12 · Kuliah & tabungan

- [x] **Hitung IPK** (`#/ipk`): IPS per semester dan IPK dari SKS × nilai
  huruf (skala bisa diatur: A/AB/B/…, atau A/A-/B+/…), plus simulasi "butuh
  rata-rata nilai berapa di sisa SKS supaya IPK jadi X". Nilai rapor (rata-rata
  berbobot) sebagai mode kedua. Tersimpan di perangkat.
- [x] **Kalkulator Tabungan & Investasi** (`#/tabungan`): bunga majemuk
  (deposito, frekuensi bunga bisa diatur, pajak bunga 20% bisa dinyalakan),
  menabung rutin per bulan, dan target dana ("Rp100 juta dalam 5 tahun → nabung
  berapa per bulan"), dengan grafik pertumbuhan (Recharts tidak ada di repo ini
  — gambar SVG sendiri) dan tabel per tahun. Ditandai perkiraan.

## Hari 27 — 2026-11-13 · Darurat: medis

- [x] **Kartu Medis / ICE** (`#/kartu-medis`): golongan darah, alergi, obat
  rutin, kondisi medis, dan kontak darurat — disimpan di perangkat saja
  (`src/lib/local-store.ts`). Bisa diekspor jadi gambar wallpaper lock screen
  (ukuran layar HP, area aman jam/notifikasi) supaya penolong bisa membacanya
  tanpa membuka kunci HP.
- [x] **Panduan CPR** (`#/cpr`): ketukan 100–120/menit (pakai klik dari
  metronom), hitungan 30 tekanan : 2 napas, langkah singkat bergambar (SVG),
  dan pengingat menelepon 112/119 lebih dulu. Wake Lock aktif. Teksnya
  mengikuti pedoman resmi (AHA/PMI) dan bilang bahwa ini bukan pengganti
  pelatihan.

## Hari 28 — 2026-11-14 · Darurat: P3K & aman

- [x] **Panduan P3K** (`#/p3k`): kartu langkah bergambar (SVG) untuk tersedak
  (Heimlich, termasuk bayi), luka bakar, pendarahan, pingsan, kejang, gigitan
  ular, dan patah tulang. Teks mengikuti pedoman PMI/WHO (sumber dan tanggal
  di satu file data), tombol 112/119 selalu terlihat, dan bilang bahwa ini
  bukan pengganti pelatihan. Tautkan dengan Panduan CPR.
- [x] **Panggilan Palsu** (`#/panggilan-palsu`): layar telepon masuk tiruan
  (nama penelepon bisa diatur) dengan nada dering dari Web Audio dan getar,
  dipicu langsung atau dengan timer. Layar penuh + Wake Lock; tombol angkat
  menampilkan durasi panggilan berjalan.

## Hari 29 — 2026-11-15 · Kalender & data

- [x] **Hitung Weton** (`#/weton`): tanggal → hari pasaran Jawa (Legi,
  Pahing, Pon, Wage, Kliwon), neptu hari + pasaran, wuku, dan tanggal Jawa;
  plus kebalikannya (cari tanggal dengan weton tertentu). Hitungan kalender
  murni, diuji dengan beberapa tanggal yang diketahui; bagian ramalan/primbon
  tidak dibuat.
- [x] **Cek NIK** (`#/cek-nik`): baca format NIK — kode provinsi/kabupaten/
  kecamatan (data wilayah dibundel, nama di-title-case), tanggal lahir, dan
  jenis kelamin (tanggal + 40 untuk perempuan). Jelas ditulis bahwa ini hanya
  membaca format, bukan memastikan NIK terdaftar di Dukcapil, dan NIK tidak
  pernah disimpan atau dikirim.

## Hari 30 — 2026-11-16 · Tanda tangan & cetak

- [x] **Tanda Tangan ke PNG** (`#/signature-png`): gambar tanda tangan atau
  foto tanda tangan di kertas, latarnya dibuang (ambang + pembersih noise),
  warna tinta bisa diganti, lalu PNG transparan siap tempel. Pakai ulang kanvas
  gambar dari Tanda Tangan PDF.
- [x] **PDF Hemat Tinta** (`#/pdf-grayscale`): ubah ke abu-abu atau
  hitam-putih (dengan ambang yang bisa diatur dan opsi latar jadi putih)
  sebelum dicetak. Halaman dirender ulang, jadi beri tahu bahwa teksnya jadi
  gambar.

## Hari 31 — 2026-11-17 · Privasi file

- [x] **Redaksi PDF** (`#/redact-pdf`): tandai area di halaman, lalu halaman
  yang ditandai dirender ulang jadi gambar (pdf.js) dengan area itu dihitamkan,
  sehingga teks aslinya hilang dari file, bukan cuma tertutup. Halaman lain
  tetap utuh. Beri tahu bahwa teks di halaman yang diredaksi tidak bisa
  disalin lagi.
- [x] **Enkripsi & Dekripsi File** (`#/encrypt-file`): kunci file apa saja
  dengan password lewat WebCrypto (AES-256-GCM, kunci dari PBKDF2-SHA-256
  dengan iterasi tinggi dan salt acak), nama file asli disimpan di dalamnya,
  dan buka lagi di tool yang sama. Tegaskan bahwa password yang lupa tidak bisa
  dipulihkan.

## Hari 32 — 2026-11-18 · Darurat: dokumen

- [ ] **Brankas Dokumen** (`#/brankas`): simpan foto/PDF KTP, KK, BPJS, polis
  di perangkat (IndexedDB), terenkripsi dengan password — WebCrypto AES-GCM,
  kunci dari PBKDF2 (≥ 600 ribu iterasi) dengan salt acak, IV baru tiap file.
  Password tidak pernah disimpan; lupa password = data tidak bisa dibuka, dan
  ini dikatakan dengan jelas sebelum brankas dibuat. Kunci otomatis saat tab
  disembunyikan. Ekspor/impor brankas terenkripsi sebagai satu file untuk
  cadangan di tempat lain. Tes enkripsi → dekripsi wajib sebelum rilis.

## Jadwal berikutnya — urut dari prioritas tertinggi

Disusun ulang 2026-11-19: batch paling atas paling dibutuhkan (paling banyak
dicari dan berguna untuk paling banyak orang), makin ke bawah makin khusus.
Urutan prioritas ini perkiraan, belum dari data pencarian; geser bila data
Search Console berkata lain. Tool yang bergantung pada tool lain (Ganti Nama
Banyak File butuh ZIP, Frasa Darurat Bersuara butuh Papan Pesan) dijadwalkan
sesudahnya.

## Hari 33 — 2026-11-19 · Foto: bingkai & identitas

- [ ] **Twibbon** (`#/twibbon`): buka bingkai PNG transparan dari pembuat
  acara, masukkan foto, lalu geser, perbesar (cubit di HP), dan putar sampai
  pas di lubang bingkai. Unduh PNG/JPG pada ukuran asli bingkai, atau bagikan
  langsung lewat `navigator.share` bila didukung. Foto dibaca dengan
  `decodeImage`. Tool ini tidak punya galeri twibbon (itu butuh server);
  bingkai selalu berasal dari file pengguna.
- [ ] **Cetak KTP Ukuran Asli** (`#/cetak-ktp`): foto depan dan belakang KTP
  (atau kartu lain berukuran sama: SIM, NPWP, BPJS) diluruskan dengan
  homografi dari Scan Dokumen, lalu disusun di satu lembar A4 pada ukuran
  kartu sebenarnya (85,6 × 53,98 mm) seperti hasil fotokopi. Pilihan warna
  atau hitam-putih, beberapa salinan per lembar, dan watermark "hanya untuk
  …" dengan memakai ulang Watermark KTP. Unduh PDF lewat pdf-lib; ingatkan
  untuk mencetak pada skala 100%.

## Hari 34 — 2026-11-20 · AI di perangkat: latar foto

- [ ] **Hapus Latar Otomatis** di `#/remove-background`: mode sekali ketuk
  dengan model segmentasi lewat ONNX Runtime Web (WebGPU bila ada, wasm
  sebagai cadangan), model dan runtime di-host sendiri dan hanya diunduh saat
  mode ini dipilih, dengan ukurannya ditampilkan di awal. Hasilnya tetap bisa
  dirapikan dengan kuas dan lasso yang sudah ada, plus opsi blur latar.
  Periksa lisensi model sebelum dipakai: beberapa model populer hanya untuk
  non-komersial, jadi pilih yang cocok dengan MIT (mis. Apache-2.0).

## Hari 35 — 2026-11-21 · PDF: formulir & cetak

- [ ] **Isi Formulir PDF** (`#/fill-pdf`): kenali kolom AcroForm lewat
  pdf-lib (`getForm`): teks, centang, pilihan, dan tombol radio, isi di
  samping pratinjau halaman, lalu simpan, dengan opsi "ratakan" supaya isian
  tidak bisa diubah lagi. Formulir XFA tidak didukung dan dikatakan dengan
  jelas; PDF tanpa kolom diarahkan ke Edit PDF. Buka lewat `openPdfDoc`.
- [ ] **Cetak Hemat Kertas** (`#/pdf-n-up`): 2, 4, atau 8 halaman PDF per
  lembar, susunan buku (booklet) yang tinggal dilipat, dan ubah ukuran
  halaman ke A4, F4 (215 × 330 mm), atau Letter. Halaman disematkan dengan
  `embedPage` pdf-lib, jadi teks tetap tajam dan bisa dipilih. Pakai
  `uprightPage` supaya halaman yang diputar tetap benar.

## Hari 36 — 2026-11-22 · Arsip & PDF

- [ ] **ZIP** (`#/zip`): buat ZIP dari banyak file (atau satu folder), dan
  buka ZIP untuk melihat dan mengambil isinya satu per satu. Pakai library
  kecil yang di-bundel; RAR/7z menyusul lewat wasm yang di-host sendiri bila
  ukurannya masuk akal.
- [ ] **Ekstrak Gambar dari PDF** (`#/pdf-extract-images`): ambil semua
  gambar yang tertanam di PDF. Gambar JPEG disimpan apa adanya (tanpa kompres
  ulang), yang lain diekspor sebagai PNG; unduh satu per satu atau ZIP.

## Hari 37 — 2026-11-23 · AI di perangkat: suara & subtitle

- [ ] **Transkrip Suara ke Teks** (`#/transkrip`): audio atau video jadi
  teks dengan model pengenal suara yang jalan di perangkat (Whisper lewat
  wasm/WebGPU, di-host sendiri), bahasa Indonesia dan Inggris. Hasil bisa
  diedit, disalin, atau diunduh sebagai TXT, SRT, dan VTT dengan cap waktu,
  jadi tersambung ke tool Subtitle. Audio diambil lewat `src/lib/media.ts`
  dan di-resample ke 16 kHz; pengenalan jalan di Web Worker dengan progres
  dan tombol batal. **Uji dulu sebelum dikerjakan**: bandingkan ukuran model
  dan akurasi bahasa Indonesia (tiny vs base). Perhatikan batas GitHub
  (file di repo maksimal 100 MB, situs Pages maksimal 1 GB). Model hanya
  diunduh saat tool dibuka dengan ukuran ditampilkan di awal, dan tidak
  ikut di-precache. Bila akurasinya tidak layak pada ukuran yang masuk
  akal, batalkan dan catat alasannya di sini.
- [ ] **Subtitle** (`#/subtitle`): buka SRT/VTT, geser semua waktu
  (maju/mundur), regangkan untuk beda frame rate, gabung dua file, dan ubah
  SRT ⇄ VTT, dengan pratinjau di atas video milik pengguna.

## Hari 38 — 2026-11-24 · Konten sosial media

- [ ] **Foto ke Video** (`#/foto-ke-video`): beberapa foto plus musik jadi
  MP4 untuk status WA, Reels, atau TikTok. Urutkan dengan seret, durasi per
  foto, transisi pudar, efek zoom pelan, rasio 9:16/1:1/16:9, dan musik
  dipotong pas atau diulang. Frame digambar di canvas lalu di-encode lewat
  Mediabunny (`src/lib/media.ts`); panggil `ensureAudioEncoder` untuk AAC.
- [ ] **Potong Foto untuk Grid & Carousel** (`#/grid-instagram`): satu foto
  dipecah jadi 3, 6, atau 9 kotak untuk feed Instagram, atau jadi beberapa
  slide 4:5/1:1 yang nyambung untuk carousel panorama. Pratinjau urutan
  unggahnya (dari kanan bawah), unduh satu per satu atau ZIP.

## Hari 39 — 2026-11-25 · Jualan online

- [ ] **Kalkulator Harga Jual & HPP** (`#/harga-jual`): HPP per unit dari
  bahan, kemasan, tenaga, dan biaya lain dibagi jumlah produksi; lalu harga
  jual dari margin atau markup yang diinginkan (bedakan keduanya dengan
  jelas). Potongan admin marketplace, biaya layanan, diskon, dan pajak diisi
  pengguna sebagai persen atau rupiah. Jangan menanam tarif marketplace di
  kode karena sering berubah. Hasil: harga jual, laba per unit, dan titik
  impas (unit). Isian terakhir tersimpan di perangkat.
- [ ] **Label Pengiriman** (`#/label-pengiriman`): isi pengirim sekali,
  lalu banyak penerima (ketik atau tempel dari Excel/CSV), susun banyak label
  per lembar (A4, atau ukuran stiker label yang umum) atau satu label A6 per
  halaman, lalu unduh PDF. Kolom no. resi dan isi paket opsional. Data
  pengirim tersimpan di perangkat.

## Hari 40 — 2026-11-26 · Foto produk & barcode

- [ ] **Watermark Foto Massal** (`#/watermark-foto`): logo atau teks toko
  ke banyak foto produk sekaligus, dengan posisi, ukuran relatif, opasitas,
  dan pola berulang. Pratinjau satu foto, lalu proses semua di Web Worker dan
  unduh ZIP. Foto dibaca dengan `decodeImage` dan metadata ikut dibuang.
- [ ] **Generator Barcode** (`#/barcode`): EAN-13, EAN-8, UPC-A, Code 128,
  dan Code 39, dengan validasi digit cek, ukuran dan teks di bawahnya, unduh
  PNG/SVG, dan lembar label banyak sekaligus siap cetak.

## Hari 41 — 2026-11-27 · Kerja & anak

- [ ] **Kalkulator Pesangon** (`#/pesangon`): uang pesangon, penghargaan
  masa kerja, dan penggantian hak menurut PP 35/2021 untuk tiap alasan PHK,
  dari masa kerja dan upah. Rumus dan pasalnya disebut di layar, dengan
  catatan bahwa perjanjian kerja atau PKB bisa memberi lebih, dan ini bukan
  nasihat hukum. Tanggal berlakunya aturan ditulis di file data supaya mudah
  diperbarui.
- [ ] **Cek Stunting & Kurva Tumbuh Anak** (`#/kurva-tumbuh`): umur, jenis
  kelamin, berat, tinggi/panjang, dan lingkar kepala → z-score dan
  kategorinya (BB/U, TB/U, BB/TB, IMT/U) menurut Standar Pertumbuhan Anak
  WHO 0–5 tahun yang dipakai Permenkes 2/2020, dengan tabel LMS WHO di satu
  file data. Grafik kurva dengan titik pengukuran, riwayat tersimpan di
  perangkat. Tulis jelas bahwa ini skrining, bukan diagnosis.

## Hari 42 — 2026-11-28 · Kesehatan

- [ ] **Kalkulator Masa Subur & Haid** (`#/masa-subur`): dari hari pertama
  haid terakhir dan panjang siklus (atau beberapa tanggal haid untuk
  menghitung rata-rata dan rentangnya) → perkiraan ovulasi, jendela subur,
  dan haid berikutnya dalam kalender tiga bulan. Berbagi hitungan tanggal
  dengan Hitung HPL. Riwayat hanya tersimpan di perangkat dan bisa dihapus
  dengan satu tombol. Tulis jelas bahwa ini perkiraan metode kalender, bukan
  alat kontrasepsi dan bukan nasihat medis, dan sebut sumber rumusnya.
- [ ] **Tes Buta Warna** (`#/tes-buta-warna`): pelat titik-titik berwarna
  yang dibuat sendiri secara prosedural (bukan salinan pelat Ishihara yang
  berhak cipta), untuk merah-hijau dan biru-kuning, dengan hasil perkiraan
  di akhir. Tulis jelas bahwa layar yang belum dikalibrasi memengaruhi hasil
  dan ini bukan pengganti tes resmi untuk SIM atau kerja.

## Hari 43 — 2026-11-29 · Dokumen

- [ ] **Gabung & Pisah Excel/CSV** (`#/merge-excel`): gabung banyak file atau
  sheet jadi satu (kolom dicocokkan dari judulnya), atau pecah satu sheet per
  nilai sebuah kolom jadi beberapa file/sheet.
- [ ] **Markdown & Teks ke PDF / Word** (`#/markdown-to-pdf`): tulis atau buka
  Markdown/TXT, pratinjau, lalu unduh PDF atau DOCX. Pakai ulang mesin
  paginasi Word ke PDF. Kebalikan dari PDF ke Markdown.

## Hari 44 — 2026-11-30 · Dokumen kantor

- [ ] **Kompres Word & PowerPoint** (`#/compress-office`): kecilkan gambar di
  dalam `.docx`/`.pptx` (folder `media/` di ZIP-nya) dengan kualitas dan lebar
  maksimum yang bisa dipilih, tanpa menyentuh isi dokumen. Tampilkan ukuran
  sebelum/sesudah dengan `SizeResult`.
- [ ] **Hapus Metadata PDF & Office** (`#/strip-metadata`): tampilkan lalu
  hapus penulis, perusahaan, software, tanggal, komentar, dan riwayat revisi
  dari PDF, DOCX, XLSX, dan PPTX sebelum dikirim. PDF lewat pdf-lib (Info dan
  XMP), Office dengan menyunting `docProps/` di dalam ZIP-nya. Pasangan dari
  Hapus Metadata Foto.

## Hari 45 — 2026-12-01 · Video & nada

- [ ] **Edit Video Ringan** (`#/edit-video`): putar 90°, crop, hapus suara,
  dan gabung beberapa klip jadi satu MP4. Pakai Mediabunny lewat
  `src/lib/media.ts` (`probeMedia`, `convertMedia`), sama seperti Potong Video.
- [ ] **Ubah Nada Lagu** (`#/ubah-nada`): naik atau turunkan kunci per
  semiton (−12 sampai +12) tanpa mengubah tempo, untuk karaoke atau latihan
  di kunci yang lebih nyaman. Pakai ulang `TimeStretch` dan `Resample` dari
  Ubah Kecepatan (ubah nada = regangkan waktu lalu resample). Pratinjau
  sebelum disimpan, tampilkan kunci baru bila kunci asal dikenali oleh
  Deteksi BPM & Kunci Lagu, simpan MP3/WAV (`ensureAudioEncoder` untuk MP3).

## Hari 46 — 2026-12-02 · Audio & suara

- [ ] **Penghapus Vokal** (`#/vocal-remover`): hilangkan vokal yang ada di
  tengah stereo (kiri − kanan, dengan bass dijaga lewat filter), pratinjau, lalu
  simpan MP3/WAV. Jelaskan bahwa hasilnya bergantung pada cara lagu dimixing.
- [ ] **Teks ke Suara** (`#/text-to-speech`): bacakan teks dengan suara
  bawaan perangkat (`speechSynthesis`), pilih suara, kecepatan, dan nada. Hanya
  tampilkan suara dengan `localService === true`: suara "Google …" di Chrome
  dikirim ke server dan melanggar janji tools. API ini tidak bisa merekam, jadi
  hanya diputar, tanpa unduh audio.

## Hari 47 — 2026-12-03 · Kelas & latihan

- [ ] **Roda Putar & Bagi Kelompok** di `#/undian`: mode roda yang diputar
  (animasi CSS, hasil tetap dari angka acak aman yang dipilih lebih dulu) dan
  mode bagi kelompok (jumlah kelompok atau jumlah orang per kelompok, bisa
  diacak ulang dan disalin). Cocok untuk guru dan acara kantor.
- [ ] **Tes Mengetik** (`#/tes-mengetik`): tes 15/30/60 detik dengan kata
  umum bahasa Indonesia atau Inggris (daftar kata di satu file data), hasil
  kata per menit dan akurasi, kesalahan disorot saat mengetik, riwayat dan
  rekor tersimpan di perangkat. Waktu dihitung dari jam, bukan interval.

## Hari 49 — 2026-12-05 · Waktu

- [ ] **Timer Pomodoro** (`#/pomodoro`): fokus/istirahat yang bisa diatur,
  hitungan dari jam (bukan interval, jadi tetap tepat saat tab di latar),
  notifikasi dan bunyi saat sesi selesai, dan layar tetap menyala lewat Wake
  Lock bila didukung.
- [ ] **Stopwatch & Timer** (`#/stopwatch`): stopwatch dengan lap, timer
  hitung mundur, dan tampilan layar penuh angka besar.

## Hari 50 — 2026-12-06 · Foto: vektor & duplikat

- [x] **Gambar ke SVG** (`#/image-to-svg`): jiplak logo, tanda tangan, atau
  gambar garis jadi vektor. Mode hitam-putih (ambang bisa diatur) dan mode
  beberapa warna (palet dikuantisasi), penghalusan sudut, pratinjau
  berdampingan, unduh SVG. Penjiplakan jalan di Web Worker. Periksa lisensi
  library sebelum dipakai: potrace berlisensi GPL sedangkan repo ini MIT,
  jadi pilih yang lisensinya cocok atau tulis sendiri. Jelaskan bahwa foto
  biasa tidak cocok dijiplak.
- [ ] **Cari Foto Duplikat** (`#/duplicate-photos`): pilih banyak foto atau
  satu folder, kelompokkan yang sama/mirip dengan perceptual hash (dHash) di Web
  Worker, lalu pilih mana yang disimpan. Tool tidak bisa menghapus file di
  perangkat; yang dipilih diunduh sebagai ZIP.

## Hari 51 — 2026-12-07 · Utilitas

- [ ] **Ganti Nama Banyak File** (`#/batch-rename`): pola nama dengan nomor
  urut, teks, tanggal file, atau tanggal foto dari EXIF, pratinjau nama baru,
  lalu unduh sebagai ZIP (pakai tool ZIP dari Hari 36).
- [ ] **Tulisan Keren** (`#/tulisan-keren`): ubah teks ke huruf Unicode
  bergaya (tebal, miring, script, double-struck, bulat, dan lainnya) untuk bio
  IG/TikTok, salin dengan satu ketukan. Beri tahu bahwa pembaca layar dan
  pencarian tidak membacanya sebagai huruf biasa.

## Hari 52 — 2026-12-08 · Developer: data

- [ ] **CSV ⇄ JSON** (`#/csv-json`): pemisah dikenali otomatis (koma, titik
  koma seperti ekspor Excel berbahasa Indonesia, atau tab), sel berkutip dan
  baris baru di dalam sel ditangani, baris pertama jadi kunci, pratinjau
  tabel, lalu salin atau unduh. Pindahkan `parseCsv` dari Excel ke PDF ke
  `src/lib/` supaya dipakai bersama.
- [ ] **YAML ⇄ JSON** (`#/yaml-json`): ubah dua arah dengan pesan galat
  yang menunjuk baris dan kolom, pilihan indentasi, dan dukungan beberapa
  dokumen dalam satu file YAML (`---`). Pakai library YAML kecil berlisensi
  MIT/ISC yang di-bundel dan dimuat lewat `import()` saat tool dibuka.
- [ ] **SQL Formatter** (`#/sql-formatter`): rapikan atau padatkan query
  dengan pilihan dialek (MySQL, PostgreSQL, SQLite, SQL Server, BigQuery),
  huruf besar untuk kata kunci, dan indentasi. Pakai library formatter
  berlisensi MIT lewat `import()`. Query tidak pernah dijalankan.

## Hari 53 — 2026-12-09 · Developer: teks & kode

- [ ] **Generator Hash** (`#/hash`): MD5, SHA-1, SHA-256, SHA-384, dan
  SHA-512 untuk teks atau file, plus kotak untuk mencocokkan dengan checksum
  yang ditempel. SHA lewat WebCrypto; MD5 ditulis sendiri karena WebCrypto
  tidak punya. File besar dihitung bertahap di Web Worker supaya tidak
  memuat seluruh file ke memori. Beri tahu bahwa MD5 dan SHA-1 tidak aman
  untuk keamanan, hanya untuk cek keutuhan file.
- [ ] **Regex Tester** (`#/regex`): pola dan flag, kecocokan disorot
  langsung di teks uji, daftar grup tangkapan, mode ganti (replace), contekan
  singkat, dan contoh siap pakai (email, nomor HP Indonesia, tanggal).
  Pencocokan jalan di Web Worker dengan batas waktu, supaya pola yang
  macet (catastrophic backtracking) tidak membekukan tab. Sebut bahwa
  mesinnya RegExp JavaScript.
- [ ] **Minify HTML/CSS/JS** (`#/minify`): kecilkan kode dan tampilkan
  ukuran sebelum/sesudah (dan perkiraan gzip) dengan `SizeResult`, plus mode
  rapikan (beautify) untuk kebalikannya. Minifier di-bundel dan dimuat lewat
  `import()` hanya untuk bahasa yang dipilih, dan jalan di Web Worker supaya
  file besar tidak membekukan tab. Kesalahan sintaks ditunjukkan barisnya.

## Hari 54 — 2026-12-10 · Developer: waktu & tampilan

- [ ] **Unix Timestamp** (`#/timestamp`): epoch (detik atau milidetik,
  dikenali otomatis) ⇄ tanggal dalam WIB, WITA, WIT, UTC, dan zona
  perangkat, format ISO 8601, jam "sekarang" yang berjalan, dan selisih
  relatif ("3 hari lalu"). Pakai `Intl.DateTimeFormat` dengan `locale()`.
- [ ] **Penjelas Cron** (`#/cron`): ekspresi cron (5 kolom, plus 6 kolom
  dengan detik) dijelaskan dalam kalimat bahasa Indonesia atau Inggris, lima
  jadwal berikutnya dalam zona perangkat dan UTC, serta pembuat ekspresi lewat
  pilihan (tiap N menit, hari tertentu, dan sebagainya). Kolom yang salah
  ditandai. Penjelasan kalimat ditulis sendiri supaya dwibahasa.
- [ ] **Cek Kontras Warna** (`#/kontras-warna`): rasio kontras teks dan
  latar menurut WCAG 2.2 dengan status AA/AAA untuk teks biasa dan besar,
  pratinjau teks, dan saran warna terdekat yang lolos. Terima HEX, RGB, HSL,
  dan OKLCH, dan bisa ambil warna dari layar lewat EyeDropper API bila ada.
  Pakai ulang konversi warna dari Color Picker.

## Hari 55 — 2026-12-11 · Developer: aset

- [ ] **Lorem Ipsum** (`#/lorem-ipsum`): paragraf, kalimat, atau kata
  dengan jumlah yang bisa diatur, pilihan teks contoh berbahasa Indonesia,
  opsi dibungkus `<p>`, dan salin dengan satu ketukan.
- [ ] **Mockup Screenshot** (`#/mockup`): taruh tangkapan layar di dalam
  bingkai HP, laptop, atau jendela browser, atur latar (warna polos atau
  gambar sendiri), bayangan, dan rasio, lalu unduh PNG untuk presentasi atau
  promosi. Bingkai digambar sendiri sebagai SVG, tanpa aset merek.

## Hari 56 — 2026-12-12 · Hitung rumah & keluarga

- [ ] **Kalkulator Waris Islam** (`#/waris`): pilih ahli waris yang ada,
  isi harta setelah utang dan wasiat (maksimal sepertiga), lalu dapatkan
  bagian tiap ahli waris menurut faraid, termasuk hijab, 'aul, dan radd.
  Sebut sumber rumusnya (KHI dan fikih yang dipakai), uji dengan kasus contoh
  yang diketahui, dan sarankan berkonsultasi ke ahli atau Pengadilan Agama.
- [ ] **Kalkulator Bahan Bangunan** (`#/bahan-bangunan`): dari ukuran
  ruangan → kebutuhan keramik (per dus, dengan sisa potong), cat (liter per
  lapis dikali jumlah lapis), bata/hebel, dan semen-pasir plesteran. Angka
  koefisien dan sumbernya di satu file data, persen cadangan bisa diatur, dan
  ada catatan bahwa ini perkiraan untuk belanja awal.

## Hari 57 — 2026-12-13 · Darurat: arah & pesan

- [ ] **Papan Pesan** (`#/papan-pesan`): teks raksasa satu layar penuh yang
  menyesuaikan ukuran supaya muat, untuk ditunjukkan ke orang lain. Frasa siap
  pakai ID/EN ("Tolong panggil ambulans", "Saya tuli", "Saya alergi …"), bisa
  menambah frasa sendiri (disimpan di perangkat), mode kontras tinggi, Wake Lock.
- [ ] **Frasa Darurat Bersuara** di `#/papan-pesan`: bacakan frasa lewat
  Web Speech (`speechSynthesis`) dalam bahasa yang suaranya tersedia di
  perangkat (ID, EN, AR, JA, …); frasa siap pakai diterjemahkan ke beberapa
  bahasa di satu file data. Bahasa tanpa suara di perangkat tetap tampil
  sebagai teks.
- [ ] **Kembali ke Titik** (`#/kembali-ke-titik`): simpan beberapa lokasi
  bernama (titik kumpul keluarga, mobil, tenda) di perangkat, lalu tampilkan
  panah kompas dan jarak ke titik itu. Pakai ulang pembacaan kompas dari Arah
  Kiblat; tampilkan akurasi GPS dan beri tahu bahwa kompas HP perlu kalibrasi.

## Hari 58 — 2026-12-14 · Darurat: siaga

- [ ] **Checklist Tas Siaga Bencana** (`#/tas-siaga`): daftar isi tas siaga
  mengikuti panduan BNPB (sebut sumber dan tanggalnya), bisa dicentang,
  ditambah, dan diberi tanggal kedaluwarsa (obat, makanan, baterai) — yang
  hampir kedaluwarsa ditandai. Tersimpan di perangkat, bisa dicetak.
- [ ] **Kode Morse** (`#/morse`): teks ⇄ morse, kirim lewat bunyi, kedipan
  layar, atau senter (fungsi torch yang sama dengan SOS — taruh di satu
  modul bersama), kecepatan bisa diatur (WPM).
- [ ] **Jarak Petir** (`#/jarak-petir`): ketuk saat kilat, ketuk lagi saat
  guntur → jarak (≈ 343 m/s) dan saran berlindung bila di bawah ±10 km
  (aturan 30-30). Simpan beberapa hitungan terakhir untuk melihat badai
  mendekat atau menjauh.

## Hari 59 — 2026-12-15 · Darurat: lokasi & posko

- [ ] **Koordinat Saya** (`#/koordinat`): lokasi dalam desimal, DMS, UTM,
  dan Plus Code sekaligus, plus ketinggian dan akurasi GPS, masing-masing
  bisa disalin, dengan cara membacanya lewat telepon ke petugas SAR. Konversi
  dihitung sendiri (tanpa library peta). Tautkan dari Info Darurat.
- [ ] **Kalkulator Logistik Pengungsian** (`#/logistik-pengungsian`): jumlah
  orang (dengan bayi, lansia, perempuan) × hari → kebutuhan air, pangan,
  selimut, pembalut, popok, dan lainnya menurut standar Sphere / BNPB (sumber
  dan angka di satu file data). Hasil bisa dicetak atau disalin sebagai daftar
  kebutuhan untuk penggalangan donasi.

## Hari 60 — 2026-12-16 · Layar penuh

- [ ] **Papan Skor** (`#/papan-skor`): dua tim (atau lebih) dengan nama dan
  warna, ketuk untuk menambah dan geser untuk mengurangi, set/babak, dan
  pengatur waktu. Layar penuh lewat `Stage`, Wake Lock, dan skor tersimpan di
  perangkat kalau tab tertutup. Untuk futsal, bulu tangkis, voli, atau lomba
  17-an.
- [ ] **Teleprompter** (`#/teleprompter`): teks bergulir dengan kecepatan,
  ukuran huruf, dan margin yang bisa diatur, mode cermin untuk kaca
  teleprompter, hitung mundur sebelum mulai, dan kontrol lewat ketuk atau
  keyboard. Layar penuh lewat `Stage`, Wake Lock, teks tersimpan di
  perangkat.

## Hari 61 — 2026-12-17 · Sensor & konversi

- [ ] **Waterpass & Meter Desibel** (`#/waterpass`): waterpass dari sensor
  orientasi HP (gelembung dan sudut, bisa dikalibrasi di permukaan rata; di
  iPhone perlu izin sensor) dan perkiraan tingkat suara dari mikrofon dalam
  dB. Tulis jelas bahwa angka desibel tidak terkalibrasi dan hanya untuk
  perbandingan.
- [ ] **Angka Romawi & Ukuran Baju/Sepatu** di `#/unit-converter`: Romawi ⇄
  angka (1–3999, validasi bentuk yang salah seperti IIII), dan tabel ukuran
  sepatu (EU/US/UK/cm, pria/wanita/anak) serta baju (S–XXL ⇄ lingkar dada)
  dengan catatan bahwa ukuran tiap merek bisa beda.
