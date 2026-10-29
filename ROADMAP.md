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

- [ ] **Link WhatsApp** (`#/link-wa`): nomor (08…, +62…, spasi/strip
  dibersihkan ke format `62…`) dan pesan opsional → tombol "Chat sekarang"
  tanpa simpan kontak, link `wa.me` siap salin, dan QR-nya (pakai ulang QR
  generator). Nomor terakhir tidak disimpan kecuali diminta.
- [ ] **Kalkulator Persen & Diskon** (`#/persen`): X% dari Y, Y itu berapa %
  dari Z, naik/turun berapa %, dan diskon bertingkat (50% + 20% = 60%, bukan
  70%) dengan rincian tiap langkah dan jumlah yang dihemat.
- [ ] **Mana Lebih Murah** (`#/mana-lebih-murah`): beberapa kemasan (harga ×
  isi, satuan g/kg/ml/L/pcs) → harga per satuan yang sama, termurah ditandai
  dan selisihnya dalam persen. Dibuat untuk dipakai satu tangan di minimarket.

## Hari 14 — 2026-10-31 · Surat

- [ ] **Generator Surat** (`#/surat`): surat lamaran kerja, izin sakit /
  tidak masuk (kerja dan sekolah), surat kuasa, surat pernyataan, dan surat
  pengunduran diri. Isi formulir → pratinjau langsung → unduh PDF (jsPDF) atau
  Word (`docx`). Template di satu file data per jenis surat, isian terakhir
  disimpan di perangkat untuk dipakai lagi.

## Hari 15 — 2026-11-01 · Formulir & teks

- [ ] **Kompres ke Ukuran Target** di `#/compress-image`: mode "maksimal
  N KB" (mis. 200 KB untuk CPNS/SNBT) yang mencari kualitas dan, bila perlu,
  dimensi terbesar yang masih di bawah batas. Pakai `canvasBlob` dari
  `src/lib/image.ts`.
- [ ] **Ubah Huruf** (`#/ubah-huruf`): HURUF BESAR, huruf kecil, Judul Tiap
  Kata, Kalimat biasa, hapus spasi ganda/baris kosong, dan satukan baris;
  sekali ketuk lalu salin. Tautkan dari Penghitung Kata.

## Hari 16 — 2026-11-02 · Scan & OCR

- [ ] **Scan Dokumen** (`#/scan`): foto kertas dari kamera atau galeri,
  tarik empat sudut (deteksi tepi otomatis sebagai tebakan awal), luruskan
  perspektif dengan homografi di canvas (tanpa OpenCV), mode hitam-putih
  tajam/abu-abu/warna, lalu gabung beberapa halaman jadi satu PDF.
- [ ] **OCR — Foto ke Teks** (`#/ocr`): Tesseract (wasm) dengan bahasa
  Indonesia dan Inggris. Worker, core wasm, dan data bahasa di-host sendiri,
  jangan dari CDN bawaannya, dan hanya dimuat saat tool dibuka. Hasil bisa
  disalin atau diunduh sebagai TXT; nanti bisa dipakai juga oleh Scan Dokumen.

## Hari 17 — 2026-11-03 · CV

- [ ] **Pembuat CV** (`#/cv`): CV satu halaman yang ramah ATS (teks asli,
  bukan gambar; satu kolom; heading standar), bagian yang bisa diurutkan,
  2–3 tata letak, ekspor PDF dan Word. Data disimpan di perangkat dan bisa
  diekspor/impor sebagai JSON. Contoh isian Indonesia dan Inggris.

## Hari 18 — 2026-11-04 · Listrik & gaji

- [ ] **Kalkulator Token Listrik** (`#/token-listrik`): nominal → kWh per
  golongan tarif PLN (R-1 900 VA, 1.300 VA, …) setelah PPJ (beda per daerah,
  bisa diatur) dan PPN bila berlaku, plus perkiraan berapa hari habis dari
  pemakaian harian. Tarif dan tanggal berlakunya di satu file data; hasil
  ditandai perkiraan.
- [ ] **Kalkulator THR & Lembur** (`#/thr-lembur`): THR penuh atau prorata
  (masa kerja/12 × upah) dan upah lembur menurut PP 35/2021 (upah sejam =
  1/173 upah sebulan; hari kerja vs hari libur, 5 atau 6 hari kerja), dengan
  rincian per jam. Aturan di satu file dengan sumbernya.

## Hari 19 — 2026-11-05 · Edit PDF

- [ ] **Edit PDF** (`#/edit-pdf`): tambah teks (font, ukuran, warna), gambar,
  kotak, garis, centang, dan coretan di halaman mana saja, untuk formulir yang
  bukan AcroForm. Pakai ulang pratinjau dan penempatan dari Tanda Tangan PDF
  (`uprightPage` di `src/lib/pdf-doc.ts`).

## Hari 20 — 2026-11-06 · Cek perangkat

- [ ] **Cek HP/Laptop Bekas** (`#/cek-perangkat`): daftar tes yang dicentang
  satu per satu — layar (warna penuh untuk dead pixel), sentuh (gambar di
  seluruh layar), speaker kiri/kanan, mikrofon (rekam + putar), kamera depan/
  belakang, getar, sensor gerak/orientasi, keyboard (tombol yang sudah ditekan
  menyala), dan info yang bisa dibaca browser (resolusi, baterai bila ada).
  Hasil akhir bisa disalin sebagai ringkasan. Juga berguna untuk tes kamera
  dan mic sebelum rapat online.

## Hari 21 — 2026-11-07 · Kesehatan

- [ ] **Hitung HPL Kehamilan** (`#/hpl`): dari HPHT (rumus Naegele, panjang
  siklus bisa diatur) atau dari tanggal USG → HPL, usia kehamilan dalam
  minggu + hari, trimester, dan tonggak penting. Bilang bahwa ini perkiraan
  dan bidan/dokter yang menentukan.
- [ ] **BMI & Berat Ideal** (`#/bmi`): BMI dengan kategori Asia-Pasifik
  (WHO 2000 / Kemenkes, beda dari ambang global), rentang berat ideal, dan
  kebutuhan kalori harian (Mifflin-St Jeor × tingkat aktivitas). Sumber
  ambang di satu file data; bilang bahwa ini skrining, bukan diagnosis.

## Hari 22 — 2026-11-08 · Darurat

Kategori baru **Darurat**. Halaman-halamannya harus tetap jalan offline
(service worker sudah menyimpan app shell; tool ini jangan bergantung pada
jaringan) dan tombol utamanya besar, bisa ditekan tanpa membaca.

- [ ] **SOS** (`#/sos`): satu tombol besar — senter HP berkedip pola morse
  SOS (torch lewat `MediaStreamTrack.applyConstraints({ advanced: [{ torch }] })`,
  ada di Chrome Android; iPhone tidak punya, jadi di sana layar saja), layar
  putih penuh yang berkedip, dan sirene keras dari Web Audio. Bisa juga jadi
  senter biasa (nyala terus). Minta Wake Lock supaya layar tidak mati.
- [ ] **Info Darurat** (`#/darurat`): nomor darurat Indonesia sebagai tombol
  `tel:` (112, polisi, pemadam, ambulans, Basarnas, …) — verifikasi daftarnya
  dari sumber resmi dan tulis tanggal pengecekan di satu file data. Plus
  "Bagikan lokasiku": koordinat GPS → teks siap kirim dengan link Maps,
  dibagikan lewat Web Share atau tautan WhatsApp; akurasi GPS ditampilkan.

## Hari 23 — 2026-11-09 · WhatsApp & foto

- [ ] **Potong Video untuk Status WhatsApp** (`#/status-wa`): pecah video
  panjang jadi potongan berurutan dengan durasi maksimal Status WhatsApp (cek
  batas terbaru saat dibangun), kompres agar muat, lalu unduh semua sekaligus.
  Pakai `convertMedia` dengan `trim` dari `src/lib/media.ts`.
- [ ] **Kolase Foto** (`#/kolase`): 2–9 foto dengan beberapa tata letak
  (grid, strip, satu besar), jarak dan sudut membulat, rasio 1:1/4:5/9:16, lalu
  unduh JPG/PNG.

## Hari 24 — 2026-11-10 · Privasi foto

- [ ] **Watermark KTP & Dokumen Identitas** (`#/watermark-ktp`): teks
  melintang berulang di foto KTP/SIM/paspor ("Hanya untuk verifikasi …",
  tanggal otomatis), atur ukuran, sudut, dan transparansi, lalu simpan ulang
  tanpa EXIF. Pakai `decodeImage`/`canvasBlob` dari `src/lib/image.ts`.
- [ ] **Sensor Foto** (`#/sensor-foto`): tutup bagian foto (NIK, wajah, plat
  nomor, alamat) dengan kotak atau kuas, model blok hitam, piksel besar, atau
  blur. Gambar disimpan ulang sehingga bagian yang ditutup benar-benar hilang.
  Beri peringatan bahwa blur tipis pada teks kecil bisa ditebak, jadi default
  ke blok hitam.

## Hari 25 — 2026-11-11 · Bareng teman

- [ ] **Patungan** (`#/patungan`): item per orang atau dibagi rata, pajak dan
  service dibagi proporsional, pembulatan yang jumlahnya tetap pas, lalu
  rangkuman siap kirim ke WhatsApp.
- [ ] **Undian & Arisan** (`#/undian`): acak nama dengan
  `crypto.getRandomValues` dan animasi, mode arisan yang mengecualikan
  pemenang sebelumnya sampai semua dapat giliran, riwayat tersimpan di
  perangkat, dan hasil siap dibagikan.

## Hari 26 — 2026-11-12 · Kuliah & tabungan

- [ ] **Hitung IPK** (`#/ipk`): IPS per semester dan IPK dari SKS × nilai
  huruf (skala bisa diatur: A/AB/B/…, atau A/A-/B+/…), plus simulasi "butuh
  rata-rata nilai berapa di sisa SKS supaya IPK jadi X". Nilai rapor (rata-rata
  berbobot) sebagai mode kedua. Tersimpan di perangkat.
- [ ] **Kalkulator Tabungan & Investasi** (`#/tabungan`): bunga majemuk
  (deposito, frekuensi bunga bisa diatur, pajak bunga 20% bisa dinyalakan),
  menabung rutin per bulan, dan target dana ("Rp100 juta dalam 5 tahun → nabung
  berapa per bulan"), dengan grafik pertumbuhan (Recharts tidak ada di repo ini
  — gambar SVG sendiri) dan tabel per tahun. Ditandai perkiraan.

## Hari 27 — 2026-11-13 · Darurat: medis

- [ ] **Kartu Medis / ICE** (`#/kartu-medis`): golongan darah, alergi, obat
  rutin, kondisi medis, dan kontak darurat — disimpan di perangkat saja
  (`src/lib/local-store.ts`). Bisa diekspor jadi gambar wallpaper lock screen
  (ukuran layar HP, area aman jam/notifikasi) supaya penolong bisa membacanya
  tanpa membuka kunci HP.
- [ ] **Panduan CPR** (`#/cpr`): ketukan 100–120/menit (pakai klik dari
  metronom), hitungan 30 tekanan : 2 napas, langkah singkat bergambar (SVG),
  dan pengingat menelepon 112/119 lebih dulu. Wake Lock aktif. Teksnya
  mengikuti pedoman resmi (AHA/PMI) dan bilang bahwa ini bukan pengganti
  pelatihan.

## Hari 28 — 2026-11-14 · Darurat: P3K & aman

- [ ] **Panduan P3K** (`#/p3k`): kartu langkah bergambar (SVG) untuk tersedak
  (Heimlich, termasuk bayi), luka bakar, pendarahan, pingsan, kejang, gigitan
  ular, dan patah tulang. Teks mengikuti pedoman PMI/WHO (sumber dan tanggal
  di satu file data), tombol 112/119 selalu terlihat, dan bilang bahwa ini
  bukan pengganti pelatihan. Tautkan dengan Panduan CPR.
- [ ] **Panggilan Palsu** (`#/panggilan-palsu`): layar telepon masuk tiruan
  (nama penelepon bisa diatur) dengan nada dering dari Web Audio dan getar,
  dipicu langsung atau dengan timer. Layar penuh + Wake Lock; tombol angkat
  menampilkan durasi panggilan berjalan.

## Hari 29 — 2026-11-15 · Kalender & data

- [ ] **Hitung Weton** (`#/weton`): tanggal → hari pasaran Jawa (Legi,
  Pahing, Pon, Wage, Kliwon), neptu hari + pasaran, wuku, dan tanggal Jawa;
  plus kebalikannya (cari tanggal dengan weton tertentu). Hitungan kalender
  murni, diuji dengan beberapa tanggal yang diketahui; bagian ramalan/primbon
  tidak dibuat.
- [ ] **Cek NIK** (`#/cek-nik`): baca format NIK — kode provinsi/kabupaten/
  kecamatan (data wilayah dibundel, nama di-title-case), tanggal lahir, dan
  jenis kelamin (tanggal + 40 untuk perempuan). Jelas ditulis bahwa ini hanya
  membaca format, bukan memastikan NIK terdaftar di Dukcapil, dan NIK tidak
  pernah disimpan atau dikirim.

## Hari 30 — 2026-11-16 · Tanda tangan & cetak

- [ ] **Tanda Tangan ke PNG** (`#/signature-png`): gambar tanda tangan atau
  foto tanda tangan di kertas, latarnya dibuang (ambang + pembersih noise),
  warna tinta bisa diganti, lalu PNG transparan siap tempel. Pakai ulang kanvas
  gambar dari Tanda Tangan PDF.
- [ ] **PDF Hemat Tinta** (`#/pdf-grayscale`): ubah ke abu-abu atau
  hitam-putih (dengan ambang yang bisa diatur dan opsi latar jadi putih)
  sebelum dicetak. Halaman dirender ulang, jadi beri tahu bahwa teksnya jadi
  gambar.

## Hari 31 — 2026-11-17 · Privasi file

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

## Hari 32 — 2026-11-18 · Darurat: dokumen

- [ ] **Brankas Dokumen** (`#/brankas`): simpan foto/PDF KTP, KK, BPJS, polis
  di perangkat (IndexedDB), terenkripsi dengan password — WebCrypto AES-GCM,
  kunci dari PBKDF2 (≥ 600 ribu iterasi) dengan salt acak, IV baru tiap file.
  Password tidak pernah disimpan; lupa password = data tidak bisa dibuka, dan
  ini dikatakan dengan jelas sebelum brankas dibuat. Kunci otomatis saat tab
  disembunyikan. Ekspor/impor brankas terenkripsi sebagai satu file untuk
  cadangan di tempat lain. Tes enkripsi → dekripsi wajib sebelum rilis.

## Hari 33 — 2026-11-19 · Dokumen

- [ ] **Gabung & Pisah Excel/CSV** (`#/merge-excel`): gabung banyak file atau
  sheet jadi satu (kolom dicocokkan dari judulnya), atau pecah satu sheet per
  nilai sebuah kolom jadi beberapa file/sheet.
- [ ] **Markdown & Teks ke PDF / Word** (`#/markdown-to-pdf`): tulis atau buka
  Markdown/TXT, pratinjau, lalu unduh PDF atau DOCX. Pakai ulang mesin
  paginasi Word ke PDF. Kebalikan dari PDF ke Markdown.

## Hari 34 — 2026-11-20 · Dokumen kantor

- [ ] **Kompres Word & PowerPoint** (`#/compress-office`): kecilkan gambar di
  dalam `.docx`/`.pptx` (folder `media/` di ZIP-nya) dengan kualitas dan lebar
  maksimum yang bisa dipilih, tanpa menyentuh isi dokumen. Tampilkan ukuran
  sebelum/sesudah dengan `SizeResult`.
- [ ] **Hapus Metadata PDF & Office** (`#/strip-metadata`): tampilkan lalu
  hapus penulis, perusahaan, software, tanggal, komentar, dan riwayat revisi
  dari PDF, DOCX, XLSX, dan PPTX sebelum dikirim. PDF lewat pdf-lib (Info dan
  XMP), Office dengan menyunting `docProps/` di dalam ZIP-nya. Pasangan dari
  Hapus Metadata Foto.

## Hari 35 — 2026-11-21 · Barcode & konversi

- [ ] **Generator Barcode** (`#/barcode`): EAN-13, EAN-8, UPC-A, Code 128,
  dan Code 39, dengan validasi digit cek, ukuran dan teks di bawahnya, unduh
  PNG/SVG, dan lembar label banyak sekaligus siap cetak.
- [ ] **Angka Romawi & Ukuran Baju/Sepatu** di `#/unit-converter`: Romawi ⇄
  angka (1–3999, validasi bentuk yang salah seperti IIII), dan tabel ukuran
  sepatu (EU/US/UK/cm, pria/wanita/anak) serta baju (S–XXL ⇄ lingkar dada)
  dengan catatan bahwa ukuran tiap merek bisa beda.

## Hari 36 — 2026-11-22 · Waktu

- [ ] **Timer Pomodoro** (`#/pomodoro`): fokus/istirahat yang bisa diatur,
  hitungan dari jam (bukan interval, jadi tetap tepat saat tab di latar),
  notifikasi dan bunyi saat sesi selesai, dan layar tetap menyala lewat Wake
  Lock bila didukung.
- [ ] **Stopwatch & Timer** (`#/stopwatch`): stopwatch dengan lap, timer
  hitung mundur, dan tampilan layar penuh angka besar.

## Hari 37 — 2026-11-23 · Arsip & suara

- [ ] **ZIP** (`#/zip`): buat ZIP dari banyak file (atau satu folder), dan
  buka ZIP untuk melihat dan mengambil isinya satu per satu. Pakai library
  kecil yang di-bundel; RAR/7z menyusul lewat wasm yang di-host sendiri bila
  ukurannya masuk akal.
- [ ] **Teks ke Suara** (`#/text-to-speech`): bacakan teks dengan suara
  bawaan perangkat (`speechSynthesis`), pilih suara, kecepatan, dan nada. Hanya
  tampilkan suara dengan `localService === true`: suara "Google …" di Chrome
  dikirim ke server dan melanggar janji tools. API ini tidak bisa merekam, jadi
  hanya diputar, tanpa unduh audio.

## Hari 38 — 2026-11-24 · Video

- [ ] **Edit Video Ringan** (`#/edit-video`): putar 90°, crop, hapus suara,
  dan gabung beberapa klip jadi satu MP4. Pakai Mediabunny lewat
  `src/lib/media.ts` (`probeMedia`, `convertMedia`), sama seperti Potong Video.

## Hari 39 — 2026-11-25 · Darurat: arah & pesan

- [ ] **Kembali ke Titik** (`#/kembali-ke-titik`): simpan beberapa lokasi
  bernama (titik kumpul keluarga, mobil, tenda) di perangkat, lalu tampilkan
  panah kompas dan jarak ke titik itu. Pakai ulang pembacaan kompas dari Arah
  Kiblat; tampilkan akurasi GPS dan beri tahu bahwa kompas HP perlu kalibrasi.
- [ ] **Papan Pesan** (`#/papan-pesan`): teks raksasa satu layar penuh yang
  menyesuaikan ukuran supaya muat, untuk ditunjukkan ke orang lain. Frasa siap
  pakai ID/EN ("Tolong panggil ambulans", "Saya tuli", "Saya alergi …"), bisa
  menambah frasa sendiri (disimpan di perangkat), mode kontras tinggi, Wake Lock.

## Hari 40 — 2026-11-26 · Darurat: siaga

- [ ] **Checklist Tas Siaga Bencana** (`#/tas-siaga`): daftar isi tas siaga
  mengikuti panduan BNPB (sebut sumber dan tanggalnya), bisa dicentang,
  ditambah, dan diberi tanggal kedaluwarsa (obat, makanan, baterai) — yang
  hampir kedaluwarsa ditandai. Tersimpan di perangkat, bisa dicetak.
- [ ] **Jarak Petir** (`#/jarak-petir`): ketuk saat kilat, ketuk lagi saat
  guntur → jarak (≈ 343 m/s) dan saran berlindung bila di bawah ±10 km
  (aturan 30-30). Simpan beberapa hitungan terakhir untuk melihat badai
  mendekat atau menjauh.
- [ ] **Kode Morse** (`#/morse`): teks ⇄ morse, kirim lewat bunyi, kedipan
  layar, atau senter (fungsi torch yang sama dengan SOS — taruh di satu
  modul bersama), kecepatan bisa diatur (WPM).

## Hari 41 — 2026-11-27 · Foto & PDF

- [ ] **Ekstrak Gambar dari PDF** (`#/pdf-extract-images`): ambil semua
  gambar yang tertanam di PDF. Gambar JPEG disimpan apa adanya (tanpa kompres
  ulang), yang lain diekspor sebagai PNG; unduh satu per satu atau ZIP.
- [ ] **Cari Foto Duplikat** (`#/duplicate-photos`): pilih banyak foto atau
  satu folder, kelompokkan yang sama/mirip dengan perceptual hash (dHash) di Web
  Worker, lalu pilih mana yang disimpan. Tool tidak bisa menghapus file di
  perangkat; yang dipilih diunduh sebagai ZIP.

## Hari 42 — 2026-11-28 · Audio

- [ ] **Peredam Noise** (`#/denoise`): bersihkan dengung dan desis dari
  rekaman suara dengan RNNoise (wasm kecil, di-host sendiri), bandingkan
  sebelum/sesudah, lalu simpan.
- [ ] **Penghapus Vokal** (`#/vocal-remover`): hilangkan vokal yang ada di
  tengah stereo (kiri − kanan, dengan bass dijaga lewat filter), pratinjau, lalu
  simpan MP3/WAV. Jelaskan bahwa hasilnya bergantung pada cara lagu dimixing.

## Hari 43 — 2026-11-29 · Utilitas

- [ ] **Subtitle** (`#/subtitle`): buka SRT/VTT, geser semua waktu
  (maju/mundur), regangkan untuk beda frame rate, gabung dua file, dan ubah
  SRT ⇄ VTT, dengan pratinjau di atas video milik pengguna.
- [ ] **Ganti Nama Banyak File** (`#/batch-rename`): pola nama dengan nomor
  urut, teks, tanggal file, atau tanggal foto dari EXIF, pratinjau nama baru,
  lalu unduh sebagai ZIP (pakai tool ZIP dari Hari 21).
- [ ] **Tulisan Keren** (`#/tulisan-keren`): ubah teks ke huruf Unicode
  bergaya (tebal, miring, script, double-struck, bulat, dan lainnya) untuk bio
  IG/TikTok, salin dengan satu ketukan. Beri tahu bahwa pembaca layar dan
  pencarian tidak membacanya sebagai huruf biasa.

## Hari 44 — 2026-11-30 · AI di perangkat

- [ ] **Perjelas Foto** (`#/perjelas-foto`): upscale 2×/4× dengan model
  super-resolution lewat ONNX Runtime Web (WebGPU bila ada, wasm sebagai
  cadangan), model dan runtime di-host sendiri dan hanya diunduh saat tool
  dibuka. Tampilkan ukuran unduhan model di awal dan peringatan bahwa di HP
  lama prosesnya lambat.

## Hari 45 — 2026-12-01 · Darurat: lokasi & bahasa

- [ ] **Koordinat Saya** (`#/koordinat`): lokasi dalam desimal, DMS, UTM,
  dan Plus Code sekaligus, plus ketinggian dan akurasi GPS, masing-masing
  bisa disalin, dengan cara membacanya lewat telepon ke petugas SAR. Konversi
  dihitung sendiri (tanpa library peta). Tautkan dari Info Darurat.
- [ ] **Frasa Darurat Bersuara** di `#/papan-pesan`: bacakan frasa lewat
  Web Speech (`speechSynthesis`) dalam bahasa yang suaranya tersedia di
  perangkat (ID, EN, AR, JA, …); frasa siap pakai diterjemahkan ke beberapa
  bahasa di satu file data. Bahasa tanpa suara di perangkat tetap tampil
  sebagai teks.

## Hari 46 — 2026-12-02 · Darurat: posko

- [ ] **Kalkulator Logistik Pengungsian** (`#/logistik-pengungsian`): jumlah
  orang (dengan bayi, lansia, perempuan) × hari → kebutuhan air, pangan,
  selimut, pembalut, popok, dan lainnya menurut standar Sphere / BNPB (sumber
  dan angka di satu file data). Hasil bisa dicetak atau disalin sebagai daftar
  kebutuhan untuk penggalangan donasi.
