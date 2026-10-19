# Riwayat update

Catatan harian apa yang berubah di [tools](https://chalidade.github.io/tools/),
terbaru di atas. Rencana hari berikutnya ada di [ROADMAP.md](ROADMAP.md).

## 2026-10-19 — Foto & gambar

Tiga tools baru di kategori Media; total sekarang **48 tools**.

- **Ubah Format Gambar** (`#/convert-image`): HEIC (foto iPhone), WebP, AVIF,
  PNG, JPG, GIF, BMP, dan SVG ke JPG, PNG, atau WebP, banyak file sekaligus
  (diunduh sebagai ZIP). HEIC didekode libheif (wasm) yang dibundel dan
  di-host sendiri, hanya dimuat saat ada file HEIC. Transparansi diratakan ke
  putih untuk JPG.
- **Pas Foto** (`#/pas-foto`): potong ke 2×3, 3×4, atau 4×6 dengan geser dan
  zoom, ganti latar merah/biru/putih (dikenali dari warna tepi atas foto lewat
  mesin `remove-background`, toleransi bisa diatur), lalu susun di kertas 4R
  atau A4 pada 300 dpi dengan garis potong. Simpan sebagai JPG, PNG, atau PDF.
- **Hapus Metadata Foto** (`#/strip-exif`): menampilkan EXIF (kamera, lensa,
  tanggal, bukaan, ISO, lokasi GPS dengan peta teks), lalu menyimpan ulang tanpa
  metadata. JPG dan PNG dibersihkan tanpa mengubah gambarnya; WebP dan foto
  yang miring lewat tanda orientasi disimpan ulang.

## 2026-10-18 — Beranda ringan & kategori Musik

**Beranda**
- Kota RPG yang bisa dijelajahi dihapus; beranda kini cuma judul singkat,
  pencarian, kategori, dan kartu tools.
- Library animasi `motion` dilepas. JS utama 518 kB → 278 kB, CSS 95 kB → 65 kB.

**Kategori baru: Musik** (7 tools, semuanya pakai Web Audio bawaan browser, tanpa library tambahan)
- **Tuner Gitar** (`#/guitar-tuner`): stem lewat mikrofon untuk gitar (Standar,
  Drop D, turun ½ nada, DADGAD, Open G), bass 4 senar, dan ukulele, plus mode kromatik.
  Senar dideteksi otomatis, ada nada acuan, dan A4 bisa diatur.
- **Metronom** (`#/metronome`): 30–300 BPM dengan aksen, ketukan per birama,
  pembagian ketukan, ketuk tempo, dan pintasan keyboard.
- **Kamus Chord & Transpose** (`#/chords`): diagram gitar dan ukulele untuk
  12 kunci × 16 jenis chord yang bisa dibunyikan, plus transpose chord lagu
  dengan saran capo.
- **Deteksi BPM & Kunci Lagu** (`#/bpm-key`): tempo, kunci, kode Camelot, dan
  chord yang cocok dari file lagu. Hasilnya bisa dibuka langsung di Metronom.
- **Piano Online** (`#/piano`): suara disintesis di browser tanpa file sampel.
  Bisa dimainkan dengan mouse, multi-jari, keyboard komputer, atau keyboard MIDI,
  plus sustain dan nama chord yang sedang ditekan.
- **Gitar Online** (`#/guitar`): genjreng chord dengan usapan jari, petik bebas
  di fretboard, capo, suara akustik/listrik/distorsi, dan iringan otomatis dengan
  6 pola genjrengan.
- **Piano Online** diperluas: 88 tuts penuh dengan peta mini dan pilihan
  lebar tampilan, 6 pilihan suara (grand, elektrik, organ, harpsichord, string,
  kotak musik), dan mode **Latihan** dengan 7 lagu domain publik, tangga nada,
  serta impor file MIDI. Tuts berikutnya menyala dan menunggu ditekan, ada demo,
  dan ada skor.
- **Drum Online** (`#/drums`): 9 pad drum yang bisa dipukul dengan jari,
  keyboard, atau drum elektrik (MIDI). Ada juga sequencer 16 langkah dengan
  aksen, swing, dan 9 pola siap pakai (rock, pop, disco, funk, hip-hop, shuffle,
  bossa nova, reggae, dangdut).

**Aplikasi & layar penuh**
- Situs bisa **dipasang sebagai aplikasi** di HP dan komputer lewat tombol
  "Pasang aplikasi" di header (di iPhone: Bagikan → Tambahkan ke Layar Utama).
  Aplikasinya terbuka tanpa bilah browser, dan tool yang pernah dibuka tetap
  jalan saat offline.
- **Layar penuh** untuk Piano, Gitar, dan Drum. Di HP layar diputar ke posisi
  mendatar, dan instrumen mengisi seluruh layar (piano: 2 oktaf dengan tuts
  besar di HP).
- Tool yang gagal dimuat (offline, atau tab lama setelah update) sekarang
  menampilkan pesan dan tombol muat ulang, bukan halaman kosong.

**Perbaikan**
- Tuner Gitar: nada sangat tinggi (di atas ~1 kHz, mode kromatik) kadang terbaca
  satu kuint lebih rendah. Penyebabnya sinyal di-downsample terlalu jauh sebelum
  dianalisis.

Total tools: 38 → 45.
