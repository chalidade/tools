# Riwayat update

Catatan harian apa yang berubah di [tools](https://chalidade.github.io/tools/),
terbaru di atas. Rencana hari berikutnya ada di [ROADMAP.md](ROADMAP.md).

## 2026-10-18 — Beranda ringan & kategori Musik

**Beranda**
- Kota RPG yang bisa dijelajahi dihapus; beranda kini cuma judul singkat,
  pencarian, kategori, dan kartu tools.
- Library animasi `motion` dilepas. JS utama 518 kB → 278 kB, CSS 95 kB → 65 kB.

**Kategori baru: Musik** (6 tools, semuanya pakai Web Audio bawaan browser, tanpa library tambahan)
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

**Perbaikan**
- Tuner Gitar: nada sangat tinggi (di atas ~1 kHz, mode kromatik) kadang terbaca
  satu kuint lebih rendah. Penyebabnya sinyal di-downsample terlalu jauh sebelum
  dianalisis.

Total tools: 38 → 44.
