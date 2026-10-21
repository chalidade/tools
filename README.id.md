# tools

[English](README.md) · **Bahasa Indonesia**

Kumpulan tools gratis yang jalan **sepenuhnya di browser**. File diproses di
perangkat pengguna: tidak di-upload ke server dan tidak disimpan di mana pun.

**Live:** https://chalidade.github.io/tools/

https://github.com/user-attachments/assets/4270efe2-2e7e-4d1a-a5db-766ac01e369b

Video launch 16 detik (nyalakan suara). [Versi English](https://github.com/user-attachments/assets/d0f73458-88ca-4a23-937d-e8166ab4079d)

Tersedia dalam **Bahasa Indonesia dan English** — ganti lewat tombol ID/EN di
header (atau lewat alamatnya: `/tools/en/<tool>/` selalu English).

## Pasang di situsmu

Lisensinya **MIT**, jadi setiap tool boleh dipasang di website-mu sendiri,
gratis. Tool tetap berjalan di browser pengunjungmu, tanpa server.

**1. Iframe (semua tool, bisa dipakai sekarang).** Ganti `screen-recorder`
dengan alamat tool mana pun dari tabel di bawah, misalnya `whiteboard`,
`compress-image`, atau `qr-generator`:

```html
<iframe
  src="https://chalidade.github.io/tools/#/screen-recorder?embed"
  title="Rekam Layar"
  style="width: 100%; height: 760px; border: 0; border-radius: 16px"
  allow="display-capture; microphone; camera; clipboard-write; fullscreen; picture-in-picture"
></iframe>
```

`?embed` menampilkan tool saja, tanpa header dan footer. Tambahkan
`&theme=light` atau `&theme=dark` untuk memaksa tema. Atribut `allow` hanya
dibutuhkan oleh tool yang memakai layar, mikrofon, atau kamera. Kode siap salin
juga ada di bagian **Pasang di situsmu** di halaman setiap tool.

**2. Paket npm / satu tag script** (dimulai dari Rekam Layar,
[`@chalidade/screen-recorder`](packages/screen-recorder)): elemen
`<screen-recorder>` yang gayanya terisolasi (Shadow DOM), bisa diatur warnanya,
dan mengirim event berisi file rekaman. Ada juga API tanpa UI untuk developer.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/screen-recorder@0/dist/element.js"></script>
<screen-recorder theme="auto"></screen-recorder>
```

> Paket npm-nya sedang menunggu diterbitkan. Sampai saat itu, pakai iframe di
> atas. Cara kerja, build, dan cara menambah paket untuk tool lain ada di
> [packages/README.md](packages/README.md).

## Daftar tools

| Tool | Alamat | Keterangan |
| --- | --- | --- |
| Word ke PDF | [`/doc-to-pdf/`](https://chalidade.github.io/tools/doc-to-pdf/) | `.docx` → PDF (docx-preview + jsPDF). `.doc` lama belum didukung. |
| PDF ke Word | [`/pdf-to-word/`](https://chalidade.github.io/tools/pdf-to-word/) | PDF → `.docx` yang bisa diedit (pdf.js + docx). Teks, ukuran, tebal/miring, font, tab, dan pemisah halaman ikut; gambar dan garis tabel tidak. PDF hasil scan belum didukung (butuh OCR). |
| Gambar ke PDF | [`/image-to-pdf/`](https://chalidade.github.io/tools/image-to-pdf/) | JPG/PNG/WebP/GIF/BMP → satu PDF (jsPDF). Banyak gambar sekaligus, urutan bisa diatur, putar 90°, ukuran A4/Letter/sesuai gambar, orientasi, margin. Rotasi EXIF foto ponsel ikut. HEIC hanya terbaca di Safari. |
| PowerPoint ke PDF | [`/ppt-to-pdf/`](https://chalidade.github.io/tools/ppt-to-pdf/) | `.pptx` → PDF, satu halaman per slide (@jvmr/pptx-to-html + jsPDF, HTML slide disanitasi dengan DOMPurify). Teks, bentuk, tabel, grafik, dan gambar ikut; animasi, transisi, dan video tidak. `.ppt` lama belum didukung. |
| Excel ke PDF | [`/excel-to-pdf/`](https://chalidade.github.io/tools/excel-to-pdf/) | `.xlsx`/`.csv` → PDF tabel dengan teks yang bisa diseleksi (ExcelJS + numfmt + jsPDF autotable). Warna (termasuk warna tema), tebal/miring, border, sel gabungan, format angka/tanggal/persen, teks terbungkus; baris/kolom/sheet tersembunyi dilewati. Pilihan kertas, orientasi, muat-ke-lebar atau ukuran asli, garis bantu, dan sheet mana yang dicetak. `.xls`/`.ods` belum didukung; huruf di luar Latin (mis. aksara CJK) belum tampil benar karena PDF memakai font Helvetica bawaan. |
| PDF ke Excel | [`/pdf-to-excel/`](https://chalidade.github.io/tools/pdf-to-excel/) | Tabel di PDF → `.xlsx` (pdf.js + ExcelJS). Baris dari garis dasar teks, kolom dari celah vertikal yang kosong; sel yang terbungkus digabung kembali; header yang berulang tiap halaman diambil sekali. Angka (Rp, ribuan, desimal koma/titik, persen, negatif dalam kurung) jadi angka sungguhan dengan format Excel; nomor berawalan 0 tetap teks. Satu sheet gabungan atau satu per halaman. PDF hasil scan belum didukung. |
| PDF ke PowerPoint | [`/pdf-to-ppt/`](https://chalidade.github.io/tools/pdf-to-ppt/) | Tiap halaman PDF → satu slide `.pptx` seukuran halaman (pdf.js + pptxgenjs). Mode **teks bisa diedit**: latar slide = halaman tanpa teks (bentuk, warna, gambar), teks jadi kotak teks di posisi aslinya dengan ukuran, tebal/miring, font, dan warna (warna dibaca dari selisih piksel render dengan/tanpa teks). Mode **persis seperti PDF**: tiap slide berupa gambar halaman. |
| PDF ke Gambar | [`/pdf-to-image/`](https://chalidade.github.io/tools/pdf-to-image/) | Halaman PDF → PNG/JPG pada 72/150/300 dpi (pdf.js). Pilih halaman lewat pratinjau; satu halaman jadi gambar, beberapa jadi ZIP (jszip). |
| Gabung PDF | [`/merge-pdf/`](https://chalidade.github.io/tools/merge-pdf/) | Beberapa PDF → satu PDF (pdf-lib). Urutan diatur dengan seret atau tombol kiri/kanan; pratinjau halaman pertama dan jumlah halaman tiap file. |
| Pisah PDF | [`/split-pdf/`](https://chalidade.github.io/tools/split-pdf/) | Ambil halaman terpilih jadi satu PDF, pisah per rentang (`1-3, 5, 8-`), atau pecah tiap N halaman (pdf-lib). Lebih dari satu hasil diunduh sebagai ZIP. |
| Watermark PDF | [`/watermark-pdf/`](https://chalidade.github.io/tools/watermark-pdf/) | Teks atau gambar/logo di semua halaman (pdf-lib): satu di tengah atau berulang, diagonal/mendatar, ukuran, warna, ketebalan; pratinjau memakai perhitungan tata letak yang sama dengan PDF-nya. Halaman yang diputar ikut benar. Teks memakai Helvetica bawaan, jadi hanya huruf Latin. |
| Atur Halaman PDF | [`/organize-pdf/`](https://chalidade.github.io/tools/organize-pdf/) | Thumbnail semua halaman; seret atau pakai tombol untuk mengubah urutan, putar kiri/kanan, duplikat, dan hapus halaman, lalu simpan jadi PDF baru (pdf.js untuk pratinjau, pdf-lib untuk menyusun). |
| Nomor Halaman PDF | [`/page-numbers/`](https://chalidade.github.io/tools/page-numbers/) | Nomor di enam posisi (atas/bawah × kiri/tengah/kanan), format `1`, `1 / 10`, `Halaman 1`, atau `- 1 -`, halaman awal dan nomor pertama bisa diatur (sampul dilewati). Halaman yang diputar ikut benar (pdf-lib). |
| Tanda Tangan PDF | [`/sign-pdf/`](https://chalidade.github.io/tools/sign-pdf/) | Gambar tanda tangan (mouse, jari, atau pena dengan tekanan) atau unggah fotonya — latar kertas dijadikan transparan — lalu tempel, geser, dan ubah ukurannya di halaman mana pun (pdf-lib). Tanda tangan berupa gambar, bukan TTE bersertifikat. |
| Kompres PDF | [`/compress-pdf/`](https://chalidade.github.io/tools/compress-pdf/) | Foto JPEG di dalam PDF diperkecil dan dikodekan ulang (Ringan/Sedang/Kuat), lalu struktur PDF dioptimasi dengan qpdf (object stream, rekompresi). Teks tetap teks. Gambar non-JPEG/CMYK tidak disentuh; hasil tidak pernah lebih besar dari aslinya. |
| PDF ke Markdown | [`/pdf-to-markdown/`](https://chalidade.github.io/tools/pdf-to-markdown/) | Judul dari ukuran huruf, **tebal**/*miring*, daftar, dan tabel Markdown (mesin tabel PDF ke Excel + mesin paragraf PDF ke Word); tabel yang bersambung antar-halaman digabung. |
| Proteksi PDF | [`/protect-pdf/`](https://chalidade.github.io/tools/protect-pdf/) | Password buka + izin cetak/salin/ubah, enkripsi AES-256 (qpdf). |
| Buka Proteksi PDF | [`/unlock-pdf/`](https://chalidade.github.io/tools/unlock-pdf/) | Hapus password (dengan password yang benar) atau batasan cetak/salin/ubah dari PDF milik sendiri (qpdf). |
| Kompres Video | [`/compress-video/`](https://chalidade.github.io/tools/compress-video/) | MP4/MOV/WebM/MKV → MP4 (Mediabunny + WebCodecs, encoder bawaan perangkat — biasanya lebih cepat dari durasi videonya). Kualitas Ringan/Sedang/Kuat (bitrate dari resolusi × fps), resolusi 1080p/720p/480p, audio dipertahankan atau dihapus; perkiraan ukuran sebelum mulai, progress + bisa dibatalkan. Butuh browser dengan WebCodecs. |
| Crop & Resize Gambar | [`/crop-resize-image/`](https://chalidade.github.io/tools/crop-resize-image/) | Kotak potong yang bisa digeser/ditarik dengan rasio bebas, asli, 1:1, 4:3, 3:2, 16:9, 4:5, 9:16; putar 90° dan balik; ukuran hasil 100/75/50/25% atau piksel kustom (rasio bisa dikunci); simpan sebagai JPG/PNG/WebP. Rotasi EXIF foto ponsel ikut. |
| Ubah Format Gambar | [`/convert-image/`](https://chalidade.github.io/tools/convert-image/) | HEIC (foto iPhone), WebP, AVIF, PNG, JPG, GIF, BMP, SVG → JPG/PNG/WebP, banyak file sekaligus (ZIP). HEIC didekode libheif (wasm) yang di-host sendiri; JPG meratakan transparansi ke putih. |
| Pas Foto | [`/pas-foto/`](https://chalidade.github.io/tools/pas-foto/) | Potong 2×3, 3×4, 4×6 (geser + zoom), ganti latar merah/biru/putih (dikenali dari tepi atas foto, toleransi diatur), susun di kertas 4R/A4 300 dpi dengan garis potong. Simpan JPG/PNG/PDF. |
| Hapus Metadata Foto | [`/strip-exif/`](https://chalidade.github.io/tools/strip-exif/) | Tampilkan EXIF (kamera, lensa, tanggal, bukaan/ISO, lokasi GPS dengan peta teks), lalu simpan tanpa metadata. JPG/PNG dibersihkan tanpa mengubah gambar; WebP dan foto berorientasi miring disimpan ulang. |
| Hapus Latar Gambar | [`/remove-background/`](https://chalidade.github.io/tools/remove-background/) | Tanpa AI — pengguna yang memilih latarnya: tongkat ajaib (area bersambung dengan warna mirip, toleransi diatur), pilih warna (semua piksel serupa di seluruh gambar), lasso, kotak (dalam/luar seleksi), dan kuas hapus/pulihkan; urungkan (Ctrl/⌘+Z), balik seleksi, zoom sampai 400%, mode tinjau. Tepi bisa dikikis (hilangkan sisa warna latar) dan dihaluskan. Hasil PNG transparan atau latar putih/merah/biru/warna lain (PNG/JPG). Cocok untuk latar polos; rambut dan latar ramai perlu dirapikan manual. Gambar di atas 3000 px diperkecil agar tiap langkah tetap cepat. |
| Kompres Gambar | [`/compress-image/`](https://chalidade.github.io/tools/compress-image/) | Banyak gambar sekaligus → JPG/WebP (atau format asli), kualitas dan ukuran maksimum diatur; rotasi EXIF diterapkan, metadata (termasuk GPS) dihapus, transparansi terjaga di WebP. Hasil yang tidak lebih kecil disimpan apa adanya. |
| Rekam Layar | [`/screen-recorder/`](https://chalidade.github.io/tools/screen-recorder/) | Rekam seluruh layar, satu jendela, atau satu tab (getDisplayMedia + MediaRecorder, VP9/Opus WebM; MP4 di Safari). Suara tab/sistem dan mikrofon bisa dipakai bersamaan (dicampur lewat Web Audio), 30/60 fps, hitung mundur 3 detik, jeda/lanjut/batal, judul tab menunjukkan durasi rekaman, dan berhenti otomatis saat "Berhenti berbagi" ditekan. Kamera melayang lewat picture-in-picture (ikut terekam saat merekam seluruh layar). Rekaman tersimpan di IndexedDB browser ini; unduh WebM atau ubah ke MP4 (H.264/AAC, Mediabunny). Hanya di browser komputer. |
| Perekam Suara | [`/audio-recorder/`](https://chalidade.github.io/tools/audio-recorder/) | Rekam dari mikrofon dengan MediaRecorder bawaan browser (Opus/WebM; AAC/M4A di Safari): jeda/lanjut/batal, timer, gelombang suara langsung, pilihan mikrofon, mode suara bicara (peredam bising, gema, volume otomatis) atau asli/stereo. Rekaman tersimpan di IndexedDB browser ini (tetap ada setelah reload), bisa diberi nama, diputar, dan diunduh asli atau diubah ke MP3 / M4A / WAV (Mediabunny). Pindah halaman saat merekam tetap menyimpan rekamannya. |
| Tuner Gitar | [`/guitar-tuner/`](https://chalidade.github.io/tools/guitar-tuner/) | Stem lewat mikrofon: nada dideteksi di browser dengan metode McLeod (tahan terhadap harmonik kedua yang lebih keras), senar terdekat dipilih otomatis atau dikunci manual, jarum −50…+50 cent, dan centang di tiap senar yang sudah pas. Tuning gitar standar, Drop D, turun ½ nada, DADGAD, Open G, bass 4 senar, ukulele, dan mode kromatik; nada acuan tiap senar bisa diputar; A4 bisa diatur 415–466 Hz. Suara tidak direkam atau dikirim. |
| Metronom | [`/metronome/`](https://chalidade.github.io/tools/metronome/) | Ketukan 30–300 BPM yang dijadwalkan di jam Web Audio (tetap stabil walau tab sibuk), aksen ketukan pertama, 1–12 ketukan per birama, pembagian ♩/♫/triol/♬, ketuk tempo, dan pintasan keyboard (Spasi, panah). Bisa dibuka dengan tempo tertentu lewat `#/metronome?bpm=128`. |
| Kamus Chord & Transpose | [`/chords/`](https://chalidade.github.io/tools/chords/) | Diagram chord gitar dan ukulele untuk 12 kunci × 16 jenis chord — bentuknya dihitung otomatis (bukan tabel) dan diurutkan dari yang paling mudah, lengkap dengan barre; ketuk diagram untuk mendengar bunyinya (Karplus–Strong). Mode transpose: tempel chord + lirik, geser ±nada, chord tetap sejajar dengan liriknya, chord dalam [kurung siku] ikut berubah, plus saran posisi capo. |
| Deteksi BPM & Kunci Lagu | [`/bpm-key/`](https://chalidade.github.io/tools/bpm-key/) | Dari file MP3/M4A/WAV/OGG/FLAC atau video: tempo dari pola lonjakan energi (onset) di 2 menit tengah lagu, kunci dari chromagram seluruh lagu yang dicocokkan dengan profil Krumhansl. Menampilkan pilihan ½×/2×, kode Camelot, kunci relatif, kemungkinan lain, dan chord diatonik; tautan langsung ke Metronom. Dianalisis di Web Worker. |
| Piano Online | [`/piano/`](https://chalidade.github.io/tools/piano/) | 88 tuts penuh (A0–C8) dengan peta mini dan pilihan lebar tampilan 1–7 oktaf. Enam suara yang disintesis di browser tanpa file sampel: grand piano, piano elektrik (FM), organ, harpsichord, string, dan kotak musik. Mode latihan: lagu domain publik (Twinkle, Ode to Joy, Happy Birthday, Jingle Bells, Für Elise, Canon in D, Prelude in C Bach), tangga nada di semua kunci, atau file MIDI milikmu (dibaca di browser, bisa pilih satu tangan). Tuts berikutnya menyala hijau dan menunggu ditekan, ada demo dengan kecepatan 50–150%, serta skor benar/salah. Bisa dimainkan dengan mouse, multi-jari, keyboard komputer, atau keyboard MIDI, plus sustain dan nama chord. |
| Gitar Online | [`/guitar/`](https://chalidade.github.io/tools/guitar/) | Senar Karplus–Strong dengan penundaan pecahan (nada tepat ±2 cent) dan eksitasi sesuai posisi petikan; suara akustik (resonansi badan), listrik, atau distorsi (amp + kabinet). Mode genjreng: usap jari melintasi senar atau pakai tombol/keyboard, daftar sampai 8 chord (bentuk dari generator Kamus Chord, bisa ganti bentuk), capo 0–7. Mode petik bebas di fretboard 12 fret, satu nada per senar. Iringan otomatis: 6 pola genjrengan (pop, folk, balada, rock, reggae, waltz) yang berpindah chord tiap birama. |
| Drum Online | [`/drums/`](https://chalidade.github.io/tools/drums/) | 9 pad (kick, snare, hi-hat tutup/buka, 3 tom, crash, ride) yang disintesis tanpa file sampel; hi-hat dan cymbal memakai resep "metal" ala drum machine 808, dan hi-hat buka dipotong oleh hi-hat tutup seperti pedal sungguhan. Dipukul dengan jari (multi-jari, makin ke tengah makin keras), mouse, keyboard (Q W E R / A S D F / Spasi), atau drum elektrik lewat Web MIDI (peta General MIDI). Sequencer 16 langkah dengan aksen, BPM, swing, dan 9 pola siap pakai (rock, pop, disco, funk, hip-hop, shuffle, bossa nova, reggae, dangdut di drum set); polanya tersimpan di browser. |
| Kompres Audio | [`/compress-audio/`](https://chalidade.github.io/tools/compress-audio/) | Audio (atau suara dari video) → MP3 / AAC (M4A) / Opus (OGG), 64–192 kbps, stereo/mono. MP3 dan AAC memakai encoder wasm Mediabunny bila browser tidak punya encoder bawaan. |
| Potong Video & Audio | [`/trim-media/`](https://chalidade.github.io/tools/trim-media/) | Timeline dengan dua penanda (filmstrip untuk video, gelombang suara untuk audio), waktu bisa diketik, "putar bagian ini", ambil posisi putar sebagai awal/akhir. Hasil memakai format yang sama (MP4/MOV/WebM/MKV/MP3/M4A/WAV/OGG/FLAC/AAC); bagian yang tidak tersentuh disalin tanpa encode ulang, hanya tepi potongan yang di-encode ulang agar presisi (Mediabunny). |
| GIF ⇄ MP4 | [`/gif-mp4/`](https://chalidade.github.io/tools/gif-mp4/) | GIF → MP4 (gifuct-js + Mediabunny): frame disusun persis seperti di browser (disposal), latar putih/hitam untuk bagian transparan, animasi bisa diulang 1–5× karena banyak aplikasi menolak video di bawah ~3 detik. Video → GIF (gifenc): pilih bagian, 8–24 fps, lebar 240–800 px, palet 256 warna per frame, delay disusun agar durasinya tepat. |
| Ekstrak Frame Video | [`/extract-frames/`](https://chalidade.github.io/tools/extract-frames/) | Ambil frame di posisi putar (maju/mundur per frame), atau otomatis tiap N detik / N frame merata (maks. 300). Resolusi asli, PNG/JPG/WebP, unduh satuan atau ZIP. |
| Ubah Kecepatan | [`/change-speed/`](https://chalidade.github.io/tools/change-speed/) | 0,25×–4× untuk video dan audio. Nada suara tetap normal (time-stretch WSOLA sendiri, streaming per potongan) atau ikut berubah. Video jadi MP4 dengan frame rate tetap saat dipercepat; audio jadi MP3/M4A/WAV. Pratinjau langsung memakai kecepatan yang dipilih. |
| Gabung Audio | [`/merge-audio/`](https://chalidade.github.io/tools/merge-audio/) | Banyak file audio (atau suara dari video), boleh beda format/sample rate/kanal, digabung berurutan dengan jeda 0–2 detik → MP3/M4A/WAV. Tiap file di-decode dan di-resample oleh Mediabunny lalu dialirkan ke satu encoder, jadi file panjang tidak dimuat utuh ke memori. |
| Generator QR Code | [`/qr-generator/`](https://chalidade.github.io/tools/qr-generator/) | Tautan, teks, Wi-Fi (langsung tersambung saat dipindai), WhatsApp (nomor 08… jadi +62), kontak vCard, email, telepon (node-qrcode). Bentuk kotak/membulat/titik, warna, tepi kosong, logo di tengah (koreksi kesalahan otomatis H), unduh PNG 512–2048 px atau SVG. Hasil langsung dipindai ulang (zxing-wasm) untuk memastikan terbaca; peringatan untuk warna terbalik atau kontras rendah. |
| Pembaca QR & Barcode | [`/qr-reader/`](https://chalidade.github.io/tools/qr-reader/) | Dari gambar, screenshot yang ditempel, atau kamera (zxing-wasm, wasm-nya ikut di-host situs — tidak dari CDN). Membaca QR, Micro QR, Data Matrix, Aztec, PDF417, dan barcode EAN/UPC/Code 128/Code 39/ITF; beberapa kode dalam satu gambar; kode terbalik warna dan miring. Isi Wi-Fi, kontak, WhatsApp, email, dan tautan ditampilkan per kolom dengan tombol salin; password Wi-Fi disembunyikan dulu. Tautan tidak pernah dibuka otomatis, dan hanya http/https/mailto/tel/sms yang bisa diklik. |
| JSON Beautifier | [`/json-beautify/`](https://chalidade.github.io/tools/json-beautify/) | Indentasi 2/4/tab, urutkan key, kesalahan sintaks dengan baris:kolom dan lompat ke posisinya. Parser sendiri: angka dan teks disalin persis (tidak ada pembulatan seperti `JSON.parse`). |
| JSON Minify | [`/json-minify/`](https://chalidade.github.io/tools/json-minify/) | Hapus semua spasi di luar teks; angka dan teks tidak berubah. |
| Generator Favicon | [`/favicon-generator/`](https://chalidade.github.io/tools/favicon-generator/) | Dari gambar/logo (termasuk SVG) atau huruf/emoji: bentuk persegi/membulat/lingkaran, latar warna atau transparan, jarak tepi. ZIP berisi `favicon.ico` (16/32/48), PNG 16 & 32, `apple-touch-icon` 180, `android-chrome` 192 & 512, `site.webmanifest`, dan potongan HTML untuk `<head>`. |
| Gambar ⇄ Base64 | [`/image-to-base64/`](https://chalidade.github.io/tools/image-to-base64/) | Gambar (atau tempel dari clipboard) → data URL, Base64 saja, `<img>`, CSS, atau Markdown, tanpa encode ulang. Arah sebaliknya menerima data URL atau Base64 biasa/URL-safe, mengenali jenis gambar dari byte-nya, lalu bisa diunduh. |
| Color Picker | [`/color-picker/`](https://chalidade.github.io/tools/color-picker/) | Ketik warna (HEX/rgb/hsl/oklch), pakai pemilih warna, ambil dari layar (EyeDropper, Chrome/Edge), atau klik piksel gambar dengan kaca pembesar; warna utama gambar otomatis. Nilai HEX/RGB/HSL/OKLCH/HSV/CMYK siap salin, kontras WCAG terhadap teks putih/hitam, dan gradasi 50–950 (OKLCH). |
| Catatan | [`/notes/`](https://chalidade.github.io/tools/notes/) | Catatan dengan Markdown (judul, tebal/miring, daftar, kutipan, kode, tautan): toolbar dan Ctrl+B/I/K, daftar dan checklist berlanjut sendiri saat Enter, checklist bisa dicentang langsung di Pratinjau (marked + DOMPurify). Cari, sematkan, beri warna, unduh .md. Tersimpan otomatis di IndexedDB browser ini; Cadangkan/Pulihkan semua catatan lewat file .json untuk pindah perangkat. |
| Kalkulator | [`/calculator/`](https://chalidade.github.io/tools/calculator/) | Kalkulator biasa dan ilmiah (sin/cos/tan dan inversnya, ln, log, pangkat, akar, faktorial, π, e, Ans) dengan derajat/radian. Parser sendiri (bukan `eval`): perkalian tersirat (2π, 3(4+5)), persen ala kalkulator HP (200 + 10% = 220), koma atau titik sebagai desimal, dan pembulatan 12 digit agar 0,1 + 0,2 = 0,3. Pratinjau hasil saat mengetik, bisa diketik dari keyboard, riwayat yang bisa dipakai ulang. |
| Pembuat Password | [`/password-generator/`](https://chalidade.github.io/tools/password-generator/) | Password acak 4–64 karakter (huruf kecil/besar, angka, simbol, opsi hindari karakter mirip) atau passphrase 3–10 kata Indonesia/Inggris dengan pemisah dan angka opsional. Memakai `crypto.getRandomValues` dengan rejection sampling (tanpa bias), dan setiap jenis karakter yang dipilih pasti muncul. Ada bar kekuatan dengan bit entropi dan estimasi waktu menebak (10 miliar tebakan/detik), plus mode cek password ketikanmu (pola urut, pengulangan, dan kata umum dihukum; tidak dikirim atau disimpan). |
| Penghitung Kata | [`/word-counter/`](https://chalidade.github.io/tools/word-counter/) | Kata, karakter (dengan/tanpa spasi, emoji dihitung satu), kalimat, paragraf, baris, waktu baca (230 kata/menit) dan bicara (130 kata/menit), serta bilah batas karakter X, Instagram, TikTok, WhatsApp status, LinkedIn, SMS, judul SEO, dan meta description. |
| Papan Tulis | [`/whiteboard/`](https://chalidade.github.io/tools/whiteboard/) | Whiteboard / blackboard (pola polos, kotak, garis, titik) dengan pena peka tekanan stylus (perfect-freehand), stabilo, penghapus sebagian atau per objek, garis, panah, kotak, lingkaran (Shift = lurus/bujur sangkar), dan teks. Pilih & geser objek, undo/redo, banyak halaman, geser/zoom (scroll, Ctrl+scroll, cubit dua jari), layar penuh. Warna mengikuti papan, jadi tetap terbaca saat papan dibalik. Tersimpan otomatis di browser; unduh PNG (halaman) atau PDF (semua halaman), simpan/buka file `.board.json`. |

## Beranda

Halaman depan sengaja dibuat ringan: judul singkat, kotak pencarian (tekan
**/** untuk langsung mencari), pilihan kategori, dan kartu tiap tool — tanpa
animasi berat, jadi cepat dibuka bahkan di ponsel.

## Pasang sebagai aplikasi

Situs ini bisa dipasang di HP atau komputer seperti aplikasi biasa: terbuka
tanpa bilah browser, punya ikon di layar utama, dan tool yang sudah pernah
dibuka tetap bisa dipakai tanpa internet.

- **Android / Chrome / Edge (komputer):** ketuk **Pasang aplikasi** di header,
  lalu **Pasang**.
- **iPhone / iPad:** buka di Safari, ketuk **Bagikan**, lalu
  **Tambahkan ke Layar Utama**. Tombol **Pasang** di header menampilkan
  langkah ini.

Di balik layar: `public/manifest.webmanifest` dan service worker `sw.js`.
Service worker itu dibuat saat build dari `pwa/sw.js` oleh plugin di
`vite.config.ts`. Halaman diambil dari jaringan dulu (jadi update langsung
terlihat), sedangkan file build di-cache saat pertama kali dipakai. Instalasi
tidak mengunduh semua tool sekaligus.

## Layar penuh untuk alat musik

Piano, Gitar, dan Drum punya tombol **Layar penuh**. Di HP layar dicoba diputar
ke posisi mendatar, dan instrumen mengisi seluruh layar: piano otomatis
menampilkan oktaf sebanyak yang muat dengan tuts selebar ±46 px. Di iPhone
(Safari tidak mengizinkan layar penuh selain untuk video), tampilannya berupa
lapisan yang menutupi halaman, dengan petunjuk untuk memutar HP.

## Menjalankan

```bash
npm install
npm run dev       # dev server
npm run build     # type-check + build (gerbang kebenaran)
npm run lint      # oxlint
```

Setiap push ke `main` otomatis di-deploy ke GitHub Pages lewat
`.github/workflows/pages.yml`.

## Menambah tool baru

1. Buat folder `src/tools/<slug>/` berisi komponen yang di-*export default*.
   Taruh logika berat di file terpisah dan pakai `import()` dinamis, supaya
   library-nya hanya dimuat saat tool itu dibuka.
   Untuk antarmuka, pakai komponen bersama di `src/components/tool/`
   (`FileDrop`, `ErrorNote`, `Segmented`, `PasswordInput`, `IconButton`, `CopyButton`, `SizeResult`/`ProgressCard`) dan `downloadBlob` dari `src/lib/download.ts`.
   Tool yang membaca teks PDF memakai `src/lib/pdf-text.ts`; tool yang mengubah
   PDF yang sudah ada (gabung, pisah, watermark, tanda tangan) memakai `src/lib/pdf-doc.ts`.
2. Tambahkan satu entri di `src/tools/registry.ts`, lengkap dengan `category`
   (grup di halaman depan) dan `keywords` (kata yang orang ketik saat mencari,
   misalnya ekstensi file dan istilah sehari-hari) (slug, judul, deskripsi,
   ikon lucide, format, `lazy(() => import(...))`).

Kartu di halaman depan dan rute `#/<slug>` muncul otomatis. Routing sengaja
memakai hash supaya jalan di sub-path Pages (dan di dalam APK) tanpa rewrite di
server.

**Aturan main:** semua pemrosesan wajib di sisi klien. Jangan menambahkan
backend atau mengirim file pengguna ke layanan pihak ketiga.

## Preview link (Open Graph)

Saat tautan dibagikan (WhatsApp, Telegram, Slack, X, LinkedIn), gambar
`public/og.png` (1200×630) tampil sebagai kartu. Meta tag-nya ada di
`index.html`. Gambar itu dirender dari `og/og.html`; setelah mengubah
templatenya, jalankan:

```bash
npm run og    # butuh Google Chrome/Chromium terpasang
```

Jaga ukurannya di bawah ~300 KB agar WhatsApp mau menampilkannya. Aplikasi
chat menyimpan cache preview, jadi perubahan baru terlihat untuk tautan yang
belum pernah dibagikan (atau setelah cache-nya kedaluwarsa).

## Stack

Vite + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui, ikon lucide-react, font Geist. Tema gelap secara default;
pengunjung bisa beralih ke terang dari header.
