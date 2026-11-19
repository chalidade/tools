# Riwayat update

Catatan harian apa yang berubah di [tools](https://toowl.my.id/),
terbaru di atas. Rencana hari berikutnya ada di [ROADMAP.md](ROADMAP.md).

## 2026-11-19 — Buka dokumen

Kategori baru **Buka Dokumen** dengan empat tool; total sekarang **112 tools**. Tiap tool juga bisa membuka tiga format lainnya, jadi tidak perlu mencari halaman yang pas.

- **Baca PDF** (`/pdf-reader/`): halaman digambar pdf.js, dengan lapisan teks di atasnya, jadi teks bisa diseleksi, disalin, dan dicari dengan Ctrl+F. Link ke situs web dan link di dalam dokumen (mis. daftar isi) bisa diklik. PDF berpassword bisa dibuka setelah password dimasukkan. Ada zoom, lompat ke halaman, dan layar penuh. Hanya halaman di sekitar layar yang digambar, jadi PDF ratusan halaman tetap ringan.
- **Baca Word** (`/word-reader/`): dokumen .docx tampil per halaman seperti di Word (ukuran kertas, margin, header/footer, tabel, gambar), dengan zoom, lompat halaman, dan layar penuh.
- **Baca Excel** (`/excel-reader/`): .xlsx atau .csv tampil seperti spreadsheet, lengkap dengan huruf kolom, nomor baris yang menempel saat digulir, dan tab sheet di bawah. Angka dan tanggal diformat seperti di Excel, warna, border, dan sel gabungan ikut. Baris dimuat bertahap, jadi sheet ribuan baris tetap cepat dibuka.
- **Baca PowerPoint** (`/ppt-reader/`): slide .pptx tampil sesuai tata letaknya, dan tombol **Presentasi** memutar slide satu per satu di layar penuh (panah, spasi, atau ketuk untuk pindah).
- **Bullet Word yang hilang**: bullet dari font Symbol/Wingdings (mis. `•` bawaan Word) tidak muncul di HP dan Linux karena font itu tidak ada. Sekarang diganti karakter biasa, di Baca Word maupun Word ke PDF.

Format lama (.doc, .xls, .ppt) belum bisa dibuka. Semuanya diproses di browser; file tidak dikirim ke mana pun.

## 2026-11-19 — PDF ke Word yang sama persis

- **PDF ke Word** (`/pdf-to-word/`) sekarang punya pilihan hasil **"Sama persis seperti PDF"** (bawaan). Sebelumnya hanya teks yang diambil lalu disusun ulang jadi paragraf, jadi gambar, garis tabel, warna, kolom, dan posisi hilang dan hasil Word terlihat beda dari PDF-nya. Sekarang tiap halaman Word dibuat seukuran halaman PDF: gambar, logo, garis dan warna tabel, serta latar digambar di belakang persis seperti aslinya, lalu teksnya ditaruh di atas pada posisi aslinya dengan font, ukuran, tebal/miring, warna, dan rata kanan-kiri yang sama, dan tetap bisa diedit. Teks miring/diputar dan lapisan OCR tak terlihat tetap jadi bagian gambar supaya tidak muncul dua kali. Ada pratinjau halaman sebelum diunduh. Cara lama masih ada sebagai **"Teks mengalir (mudah diedit)"** untuk yang ingin menulis ulang banyak teks.

Semuanya tetap diproses di browser; tidak ada file yang dikirim.

## 2026-11-19 — CAD & upscale

Tiga tool baru; total sekarang **108 tools**.

- **DWG ke PDF** (`/dwg-to-pdf/`): buka gambar AutoCAD (.dwg R14–2018 atau .dxf) dan simpan sebagai PDF vektor, jadi garis dan teks tetap tajam saat diperbesar. File dibaca dengan LibreDWG versi WebAssembly (±8 MB, dimuat saat tool dipakai) lalu digambar ulang: blok, dimensi, hatch berpola, tipe garis putus-putus, ketebalan garis, dan warna ByLayer/ByBlock. Pilih kertas A4–A0, arah, pas kertas atau skala 1:20–1:1000, warna asli atau hitam semua, dan matikan layer yang tidak perlu. Objek nyasar yang jauh dari gambar utama tidak lagi membuat gambar mengecil jadi titik.
- **PDF ke DWG** (`/pdf-to-dwg/`): ambil garis, kurva, lingkaran, dan teks vektor dari PDF (mis. denah hasil ekspor CAD) jadi file .dxf yang dibuka AutoCAD, BricsCAD, atau LibreCAD, lalu Save As .dwg. Skala gambar di PDF (1:1–1:1000) dan satuan hasil (mm/cm/m) bisa diatur supaya ukurannya kembali ke ukuran sebenarnya; beberapa halaman diletakkan berjajar. Hasilnya DXF, bukan DWG langsung, karena belum ada penulis DWG yang andal di browser dan file tidak boleh dikirim ke server.
- **Upscale Gambar** (`/upscale-image/`): perbesar foto 2× atau 4× dengan model Real-ESRGAN di perangkat sendiri (WebGPU bila ada, WebAssembly bila tidak). Gambar diproses per petak tanpa sambungan terlihat, transparansi PNG ikut, ada progres, tombol batal, dan penggeser sebelum/sesudah. Model (4,8 MB) dan mesinnya diunduh sekali dari situs ini.

Semuanya diproses di browser; tidak ada data yang dikirim.

## 2026-11-17 — Tampilan baru

Desain diganti total: gelap pekat, satu aksen hijau neon, logo baru, dan cara pakai yang dibuat untuk HP lebih dulu. Tidak ada tool yang berubah cara kerjanya.

- **Logo baru**: burung hantu dan tulisan "toowl" di header diganti monogram toowl. Favicon, ikon aplikasi (PWA), dan gambar pratinjau link ikut diganti.
- **Warna**: latar hampir hitam dengan aksen hijau neon, dipakai hanya untuk hal yang bisa diklik atau sedang dipilih; label kecil memakai huruf mono. Tema terang tetap ada (aksen teksnya hijau tua supaya terbaca). Glow, grid, dan gradasi biru→ungu dihapus.
- **Beranda di HP**: kotak cari sekarang menempel di bawah layar, dekat jempol, dan ikut naik di atas keyboard. Di atasnya ada tool yang terakhir dipakai (disimpan di browser ini saja), yang populer, dan daftar kategori. Saat mengetik, hasil bisa disaring per kategori.
- **Beranda di laptop**: kotak cari jadi command palette di tengah. `/` atau `Ctrl/⌘ + K` fokus ke kotak cari, panah atas/bawah memilih, Enter membuka.
- **Halaman tool di HP**: header diganti bar ringkas (kembali, nama tool, menu "⋯" untuk semua tools, bahasa, dan tema), jadi tool langsung terlihat tanpa menggulir. Di laptop ada jejak "Semua tools › Kategori" yang membuka daftar kategori itu (`/all/?c=<kategori>`). Area tarik-file sekarang punya tombol "Pilih file".
- **Semua tools** (`/all/`): kartu jadi ringkas, jadi satu layar HP memuat jauh lebih banyak tool. Kategori jadi satu baris yang bisa digeser dan tetap menempel di atas saat menggulir.
- **Motion**: halaman muncul dengan gerakan halus, garis header baru terlihat saat menggulir, dan ganti tema terang/gelap kini memudar. Semuanya CSS, pendek, dan mati otomatis kalau perangkat meminta gerakan dikurangi.
- **Lebih cepat**: font Geist sekarang disajikan dari situs ini sendiri (dua file, 52 KB) dan dimuat lebih awal, bukan dari Google Fonts — dua koneksi ke pihak ketiga hilang, dan janji "tanpa pihak ketiga" jadi utuh.

## 2026-11-17 — Privasi file

Dua tool baru; total sekarang **105 tools**.

- **Redaksi PDF** (`#/redact-pdf`): seret di atas pratinjau halaman untuk menandai area (bisa banyak per halaman, ada urungkan). Halaman yang ditandai dirender ulang dengan pdf.js, areanya dihitamkan, lalu menggantikan halaman asli lewat pdf-lib — jadi teks aslinya benar-benar hilang dari file, bukan cuma tertutup kotak. Halaman lain tetap utuh. Tertulis jelas bahwa teks di halaman yang diredaksi tidak bisa disalin lagi; pilihan 100/150/200 dpi, progres, dan tombol batal.
- **Enkripsi & Dekripsi File** (`#/encrypt-file`): kunci file apa saja dengan password lewat WebCrypto — AES-256-GCM, kunci dari PBKDF2-SHA-256 (600.000 iterasi, salt acak), header ikut diautentikasi. Nama file asli disimpan di dalam file `.enc` dan dipulihkan saat dibuka; file `.enc` dikenali otomatis. Password salah atau file diubah ditolak dengan pesan jelas, dan tertulis bahwa password yang lupa tidak bisa dipulihkan.

Semuanya diproses di browser; tidak ada data yang dikirim.

## 2026-11-16 — Tanda tangan & cetak

Dua tool baru; total sekarang **103 tools**.

- **Tanda Tangan ke PNG** (`#/signature-png`): gambar tanda tangan di layar (memakai ulang kanvas Tanda Tangan PDF) atau unggah foto dari kertas. Latar dibuang lewat ambang kecerahan dengan tepi lembut, bintik kecil dibersihkan, warna tinta bisa diganti (asli/hitam/biru), lalu hasilnya dipotong rapat jadi PNG transparan. Pratinjau di atas pola kotak-kotak.
- **PDF Hemat Tinta** (`#/pdf-grayscale`): ubah PDF jadi abu-abu atau hitam-putih (ambang bisa diatur) sebelum dicetak, dengan opsi latar terang jadi putih dan pilihan 100/150/200 dpi. Tiap halaman dirender ulang dengan pdf.js lalu dirakit kembali dengan pdf-lib, jadi teksnya menjadi gambar dan tidak bisa dipilih lagi — hal ini tertulis di layar. Ada progres, tombol batal, dan perbandingan ukuran sebelum/sesudah.

Semuanya diproses di browser; tidak ada data yang dikirim.

## 2026-11-15 — Kalender & data

Dua tool baru di kategori Produktivitas; total sekarang **101 tools**.

- **Hitung Weton** (`#/weton`): tanggal → hari pasaran Jawa (Legi, Pahing, Pon, Wage, Kliwon), neptu hari + pasaran, wuku, dan tanggal Jawa (dari kalender Hijriah, tahun Jawa = Hijriah + 512); juga kebalikannya, mencari tanggal dengan weton tertentu (tiap 35 hari). Hitungan kalender murni yang diuji dengan tanggal yang dikenal (17 Agustus 1945 Jumat Legi, Galungan 28 Februari 2024 Rabu Kliwon wuku Dungulan, 1 Sura 1958 = 7 Juli 2024); tanpa ramalan/primbon.
- **Cek NIK** (`#/cek-nik`): membaca susunan 16 digit NIK — provinsi, kabupaten/kota, kecamatan (tabel wilayah Kepmendagri 2025 dibundel dan dimuat terpisah saat tool dibuka), tanggal lahir (tanggal + 40 untuk perempuan, abad ditampilkan bila ambigu), dan nomor urut. Tertulis jelas bahwa ini hanya membaca format, bukan memastikan NIK terdaftar di Dukcapil, dan NIK tidak pernah disimpan atau dikirim.

Semuanya diproses di browser; tidak ada data yang dikirim.

## 2026-11-14 — Darurat: P3K & aman

Dua tool baru di kategori Darurat; total sekarang **99 tools**.

- **Panduan P3K** (`#/p3k`): kartu langkah bergambar (SVG) untuk tersedak (Heimlich, termasuk bayi), luka bakar, pendarahan, pingsan, kejang, gigitan ular, dan patah tulang, lengkap dengan daftar "jangan". Tombol telepon 112/119 selalu terlihat, tertaut ke Panduan CPR, dan teks mengikuti pedoman PMI/WHO (sumber dan tanggal pemeriksaan ada di satu file data) serta menegaskan bahwa ini bukan pengganti pelatihan.
- **Panggilan Palsu** (`#/panggilan-palsu`): layar telepon masuk tiruan dengan nama penelepon dan label yang bisa diatur, nada dering dari Web Audio dan getar, dipicu langsung atau dengan timer (10 detik sampai 5 menit). Layar penuh + Wake Lock; tombol angkat menampilkan durasi panggilan berjalan.

Semuanya diproses di browser; tidak ada data yang dikirim.

## 2026-11-13 — Darurat: medis

Dua tool baru di kategori Darurat; total sekarang **97 tools**.

- **Kartu Medis / ICE** (`#/kartu-medis`): golongan darah, alergi, obat rutin, kondisi medis, dan kontak darurat disimpan di perangkat saja. Bisa diekspor jadi wallpaper layar kunci PNG (empat ukuran layar HP) dengan kartu diletakkan di bawah area jam dan notifikasi, supaya penolong bisa membaca tanpa membuka kunci HP.
- **Panduan CPR** (`#/cpr`): ketukan 100–120 per menit dengan klik metronom dan getar, hitungan 30 tekanan : 2 napas (atau tekan saja), langkah singkat bergambar SVG, tombol telepon 112 di paling atas, dan Wake Lock agar layar tetap menyala. Teks mengikuti pedoman AHA/PMI dan menegaskan bahwa ini bukan pengganti pelatihan.

Semuanya diproses di browser; tidak ada data yang dikirim.

## 2026-11-12 — Kuliah & tabungan

Dua tool baru di kategori Produktivitas; total sekarang **95 tools**.

- **Hitung IPK** (`#/ipk`): IPS per semester dan IPK dari SKS × nilai huruf, dengan dua skala (A/AB/B/BC atau A/A-/B+). Simulasi "butuh rata-rata nilai berapa di sisa SKS supaya IPK jadi X" (memberi tahu bila sudah aman atau mustahil), plus mode nilai rapor (rata-rata berbobot). Data tersimpan di perangkat.
- **Kalkulator Tabungan & Investasi** (`#/tabungan`): bunga majemuk deposito (frekuensi bunga bulanan/3 bulan/6 bulan/tahunan, pajak bunga 20% bisa dinyalakan), nabung rutin per bulan, dan target dana ("berapa per bulan supaya mencapai Rp100 juta"). Hasil berupa grafik pertumbuhan SVG buatan sendiri dan tabel per tahun, ditandai sebagai perkiraan.

Semuanya diproses di browser; tidak ada data yang dikirim.

## 2026-11-11 — Tambah Musik ke Video

Satu tool baru di kategori Media; total sekarang **93 tools**.

- **Tambah Musik ke Video** (`#/add-music`): beri musik latar (MP3, M4A, WAV, OGG, FLAC) pada video. Volume musik dan suara asli diatur terpisah (suara asli bisa dibisukan), musik bisa dimulai dari detik tertentu, diulang bila lebih pendek dari video, diberi fade in/out, dan dikecilkan otomatis saat video bersuara (orang bicara). Video tanpa suara juga bisa. Gambar disalin tanpa di-encode ulang; hasilnya MP4.

## 2026-11-11 — Peredam Noise

Satu tool baru di kategori Media; total sekarang **92 tools**. Diambil lebih awal dari rencana Hari 42.

- **Peredam Noise** (`#/denoise`): bersihkan bising, desis, dengung, kipas, dan AC dari suara orang bicara di video maupun audio, dengan dua mesin AI yang di-host sendiri dan dimuat hanya saat dipakai: **Jernih** (DeepFilterNet 3, bawaan) yang suaranya bersih dan tidak mendem, dengan model ±13 MB yang diunduh sekali lalu tersimpan; dan **Cepat** (RNNoise, ~110 KB) untuk perangkat lemah. Kekuatan bisa dipilih (Ringan, Sedang, Penuh), lalu hasilnya dibandingkan dengan aslinya sebelum diunduh. Gambar video disalin tanpa di-encode ulang dan suaranya tetap pas dengan bibir; audio disimpan sebagai MP3, M4A, atau WAV. Pada mesin Cepat, suara di atas 6 kHz diambil dari aslinya dan hanya diredam di jeda antar ucapan, karena RNNoise sendiri membuat suara terdengar mendem.

## 2026-11-11 — Bareng teman

Dua tool baru di kategori Produktivitas; total sekarang **91 tools**.

- **Patungan & Split Bill** (`#/patungan`): bagi tagihan makan bareng per item (tiap item bisa dimakan satu orang, beberapa, atau semua) atau dibagi rata. Service dihitung dari subtotal, pajak dari subtotal + service, lalu dibagi sesuai porsi tiap orang. Sisa rupiah dibagikan dengan metode sisa terbesar sehingga jumlah semua bagian selalu pas dengan tagihan; pembulatan ke atas 100/500/1.000 menampilkan kelebihannya. Rangkuman bisa disalin atau dikirim lewat Bagikan/WhatsApp.
- **Undian & Arisan** (`#/undian`): acak nama dengan `crypto.getRandomValues` (tanpa bias modulo) dan animasi singkat (dilewati bila perangkat meminta gerak dikurangi). Mode arisan mengecualikan pemenang putaran ini sampai semua dapat giliran, lalu putaran baru dimulai. Daftar nama dan riwayat tersimpan di perangkat; hasil bisa disalin atau dibagikan.

Semuanya diproses di browser; tidak ada data yang dikirim.

## 2026-11-10 — Privasi foto

Dua tool baru di kategori Media; total sekarang **89 tools**.

- **Watermark KTP & Dokumen Identitas** (`#/watermark-ktp`): teks melintang berulang di foto KTP/SIM/paspor, bawaannya "Hanya untuk verifikasi <keperluan> · <tanggal hari ini>". Ukuran, sudut, transparansi, kerapatan, dan warna (abu/hitam/putih/merah) bisa diatur dengan pratinjau langsung. Foto digambar ulang di canvas sehingga EXIF (GPS, kamera) hilang; unduh JPG atau PNG.
- **Sensor Foto** (`#/sensor-foto`): tutup bagian foto (NIK, wajah, plat nomor, alamat) dengan kotak atau kuas. Modelnya blok hitam (bawaan), piksel besar, atau blur; piksel dan blur memakai kode sendiri (rata-rata blok dan box blur tiga lintasan), tanpa `ctx.filter` yang tidak ada di Safari. Ada peringatan bahwa blur tipis pada teks kecil bisa ditebak. Hasil digambar ulang pada resolusi asli tanpa EXIF, jadi bagian yang ditutup benar-benar hilang. Bisa diurungkan.

Semuanya diproses di browser; tidak ada file yang dikirim.

## 2026-11-09 — WhatsApp & foto

Dua tool baru di kategori Media; total sekarang **87 tools**.

- **Potong Video untuk Status WhatsApp** (`#/status-wa`): pecah video panjang jadi bagian sama panjang dengan durasi maksimal 15, 30 (bawaan), atau 60 detik, karena batas Status WhatsApp pernah berubah. Tiap bagian di-encode ulang (maks. 720p, H.264/AAC bila tersedia) dengan bitrate yang dihitung supaya di bawah 16 MB, memakai `convertMedia` dengan `trim`. Bagian diputar ulang di halaman, diunduh satuan atau semuanya sebagai ZIP.
- **Kolase Foto** (`#/kolase`): 2–9 foto dalam tata letak grid, strip tegak, strip datar, atau satu besar; urutan bisa digeser, jarak dan sudut membulat diatur, latar putih/abu/hitam, rasio 1:1, 4:5, atau 9:16 (lebar 1080 px). Foto dipotong tengah tanpa gepeng, EXIF diterapkan; unduh JPG atau PNG.

Semuanya diproses di browser; tidak ada file yang dikirim.

## 2026-11-08 — Darurat

Kategori baru **Darurat** dengan dua tool; total sekarang **85 tools**.

- **SOS & Senter** (`#/sos`): satu tombol besar yang menyalakan senter HP berkedip pola morse SOS (Chrome Android, lewat `applyConstraints({ torch })`), layar putih penuh yang berkedip, dan sirene Web Audio. Mode senter biasa nyala terus. Wake Lock menjaga layar tetap menyala. iPhone tidak mengizinkan senter dari browser, jadi di sana hanya layar yang berkedip. Jalan offline.
- **Info Darurat** (`#/darurat`): nomor darurat Indonesia (112, 110, 113, 118, 119, 115, 117, 123) sebagai tombol telepon; daftar dan tanggal pengecekannya ada di satu berkas data. "Bagikan lokasiku" mengubah koordinat GPS menjadi teks siap kirim dengan link peta dan akurasinya, lewat Web Share atau WhatsApp.

Tidak ada data yang dikirim ke server; lokasi hanya dibaca saat tombol ditekan.

## 2026-11-07 — Kesehatan

Dua tool baru di kategori Produktivitas; total sekarang **83 tools**.

- **Hitung HPL Kehamilan** (`#/hpl`): HPL dari HPHT dengan rumus Naegele (panjang siklus 21–45 hari bisa diatur) atau dari tanggal dan usia kehamilan saat USG. Menampilkan usia kehamilan dalam minggu + hari per tanggal yang dipilih, trimester, hari tersisa, dan tonggak penting (K1, USG anatomi, skrining diabetes, cukup bulan). Ditegaskan bahwa ini perkiraan dan bidan/dokter yang menentukan.
- **BMI & Berat Ideal** (`#/bmi`): BMI dengan kategori Asia-Pasifik (WHO 2000), Kemenkes RI, atau WHO global; rentang berat ideal untuk tinggi badan; dan kebutuhan kalori harian (Mifflin-St Jeor × tingkat aktivitas). Ambang kategori ada di satu berkas data. Ditegaskan bahwa ini skrining, bukan diagnosis.

Semua hitungan berjalan di browser; tidak ada data yang dikirim.

## 2026-11-06 — Cek perangkat

Satu tool baru di kategori Produktivitas; total sekarang **81 tools**.

- **Cek HP/Laptop Bekas** (`#/cek-perangkat`): daftar tes yang dicentang satu per satu — layar penuh warna hitam/putih/merah/hijau/biru untuk dead pixel, sentuh (seret jari sampai semua kotak hijau), speaker kiri/tengah/kanan, mikrofon (rekam 4 detik + putar ulang dengan indikator level), kamera depan/belakang, getar, sensor gerak/orientasi (izin di iOS), dan keyboard (tombol yang ditekan menyala). Info yang terbaca browser (resolusi, inti CPU, baterai bila ada) ditampilkan, dan ringkasan lulus/gagal bisa disalin. Tidak ada rekaman atau gambar yang disimpan atau dikirim; kamera dan mikrofon dilepas saat selesai atau tool ditutup. Berguna juga untuk tes kamera dan mic sebelum rapat online.

## 2026-11-05 — Edit PDF

Satu tool baru di kategori PDF; total sekarang **80 tools**.

- **Edit PDF** (`#/edit-pdf`): tambah teks (font Sans/Serif/Mono, tebal, ukuran, warna), gambar, kotak (garis tepi atau isi penuh), garis, centang, dan coretan bebas di halaman mana saja — untuk formulir yang bukan AcroForm. Semua tambahan bisa dipilih, digeser, diubah ukuran, dan dihapus (tombol Delete). Pratinjau memakai satuan poin halaman yang sama dengan hasilnya, dan `uprightPage` memastikan halaman yang diputar atau punya crop box tetap benar. Teks memakai font PDF bawaan (huruf Latin); karakter lain diganti "?" dengan peringatan. Kotak isi penuh hanya menutup tampilan, bukan menyensor data.

## 2026-11-04 — Listrik & gaji

Dua tools baru di kategori Produktivitas; total sekarang **79 tools**.

- **Kalkulator Token Listrik** (`#/token-listrik`): nominal pembelian token PLN menjadi perkiraan kWh menurut golongan tarif (R-1 450 VA sampai R-3 6.600 VA ke atas), setelah PPJ (bisa diatur karena beda tiap daerah), biaya admin, dan PPN bila berlaku. Isi pemakaian harian untuk melihat token cukup berapa hari. Tarif dan tanggal berlakunya ada di satu berkas; hasil ditandai perkiraan.
- **Kalkulator THR & Lembur** (`#/thr-lembur`): THR penuh (masa kerja 12 bulan atau lebih) atau prorata (bulan/12 × upah), dan upah lembur menurut PP 35/2021 — upah sejam = 1/173 upah sebulan, pengali hari kerja vs hari libur, 5 atau 6 hari kerja, termasuk hari kerja pendek — dengan rincian per jam dan beberapa baris hari sekaligus. Aturan dan sumbernya ada di satu berkas.

## 2026-11-03 — CV

Satu tool baru di kategori Produktivitas; total sekarang **77 tools**.

- **Pembuat CV** (`#/cv`): CV satu halaman yang ramah ATS — teks asli (bukan gambar), satu kolom, dan heading standar (Ringkasan, Pengalaman Kerja, Pendidikan, Keahlian, dst.). Bagian bisa diurutkan, ada tiga tata letak (Klasik, Modern, Ringkas), dan bahasa heading bisa Indonesia atau Inggris. Unduh PDF (pdf-lib) atau Word (`docx`). Data tersimpan hanya di perangkat dan bisa disimpan/dibuka lagi sebagai JSON; ada tombol contoh isian Indonesia dan Inggris.

## 2026-11-02 — Scan & OCR

Dua tool baru di kategori Gambar & Media; total sekarang **76 tools**.

- **Scan Dokumen** (`#/scan`): foto kertas dari kamera atau galeri, lalu empat sudutnya dicari otomatis sebagai tebakan awal dan bisa ditarik sendiri. Perspektif diluruskan dengan homografi di canvas (tanpa OpenCV), dengan tiga tampilan: hitam-putih tajam, abu-abu (pencahayaan diratakan), atau warna. Bisa memutar foto, menambah halaman, lalu mengunduh satu PDF (atau satu halaman sebagai JPG).
- **OCR — Foto ke Teks** (`#/ocr`): Tesseract (wasm) untuk bahasa Indonesia, Inggris, atau keduanya, dari banyak foto sekaligus. Worker, core wasm, dan data bahasa dibundel bersama situs (bukan dari CDN) dan baru diunduh saat tombol Baca teks ditekan. Hasilnya bisa diedit, disalin, atau diunduh sebagai TXT.

## 2026-11-01 — Formulir & teks

Satu tool baru dan satu peningkatan; total sekarang **74 tools**.

- **Kompres Gambar** kini punya **batas ukuran file** (100 KB, 200 KB, 500 KB, 1 MB, atau angka sendiri) untuk unggahan formulir seperti CPNS atau SNBT. Tool mencari kualitas tertinggi yang masih muat dan, bila perlu, mengecilkan dimensi bertahap; PNG otomatis dikonversi ke WebP/JPG karena PNG tidak punya kualitas. Bila tetap tidak muat, file ditandai "belum muat di batas ukuran".
- **Ubah Huruf** (`#/ubah-huruf`): HURUF BESAR, huruf kecil, Judul Tiap Kata, kalimat biasa, hapus spasi ganda, hapus baris kosong, dan satukan baris. Sekali ketuk lalu salin, ada tombol urungkan. Ditautkan dari Penghitung Kata.

## 2026-10-31 — Surat

Satu tool baru di kategori Produktivitas; total sekarang **73 tools**.

- **Generator Surat** (`#/surat`): lima jenis surat — lamaran kerja, izin tidak masuk, kuasa, pernyataan, dan pengunduran diri. Isi formulir, lihat pratinjau langsung, lalu unduh PDF (pdf-lib) atau Word (`docx`). Template ada di satu file data (`templates.ts`), dan isian terakhir hanya tersimpan di perangkat.

## 2026-10-31 — Nama baru: toowl

Situs kini bernama **toowl**: logonya teks "toowl", sementara maskot burung hantu menjadi favicon dan ikon aplikasi. Di halaman tool, tautan "Semua tools" menjadi "Kembali" ke beranda, badge "File tidak di-upload" ada di sebelah judul, dan ikon tool rata atas. Di ponsel, tool tampil lebih dulu; judul dan deskripsinya menyusul di atas "Pasang di situsmu".

## 2026-10-31 — Audit keamanan & paket npm untuk semua tools

Audit keamanan ke-72 tools. Tidak ada tool yang mengirim data ke mana pun; perbaikan yang juga berlaku di situs:

- **Word ke PDF** (tinggi): file .docx yang sengaja dibuat bisa menjalankan script lewat tombol "Print / Simpan PDF", dan memancing browser memuat URL asing saat file dibuka. Dokumen kini dibersihkan sebelum tampil, dan salinan cetaknya di-sandbox.
- **Hapus Metadata Foto**: salinan JPEG yang tertanam (pratinjau dari ponsel), Extended XMP, dan data setelah akhir file ikut terhapus. Sebelumnya GPS dan nama kamera bisa tersisa di sana. WebP kini juga didukung.
- **Kompres Gambar**: bila hasil kompresi tidak lebih kecil, file asli dikembalikan dengan metadata (termasuk GPS) dihapus, sesuai janji di layar.
- **PowerPoint ke PDF**, **PDF ke PowerPoint**: file tidak bisa lagi memuat gambar dari server luar atau menyisipkan XML lewat nama font.
- **Excel ke PDF**, **PDF ke Gambar**, **GIF ↔ MP4**, **Kalkulator Cicilan**: file atau input ekstrem (merge cell raksasa, halaman/GIF berukuran raksasa, tenor 1e9 tahun) ditolak, tidak lagi membekukan tab.
- **Kalkulator Cicilan**, **Zakat**, **Gaji Bersih**: angka seperti "12.5" kini dibaca 12,5, bukan 125.
- **Catatan**: form di pratinjau Markdown diblokir; backup atau papan Whiteboard yang rusak tidak lagi merusak aplikasi secara permanen.
- Kamera dan mikrofon (Pembaca QR, QRIS, Tuner, Rekam Suara, Rekam Latihan) selalu dilepas saat tool ditutup, termasuk ketika prompt izin masih terbuka.

**Paket npm.** Semua 72 tools kini punya paket di `packages/` (README berbahasa Inggris, custom element + API tanpa UI, belum terbit). Tool yang menyimpan data punya atribut `persist="false"`. Shortcut keyboard dan listener paste tidak lagi bocor ke halaman pemasang.

## 2026-10-30 — Harian: chat & belanja

Tiga tools baru di kategori Produktivitas; total sekarang **72 tools**.

- **Link WhatsApp** (`#/link-wa`): nomor (08…, +62…, spasi dan strip dibersihkan ke format `62…`) dan pesan opsional menjadi tombol "Chat sekarang" tanpa simpan kontak, link `wa.me` siap salin, dan QR (PNG/SVG) lewat generator QR yang sama. Nomor terakhir hanya disimpan di perangkat bila kotak "Ingat" dicentang.
- **Kalkulator Persen & Diskon** (`#/persen`): X% dari Y, Y itu berapa persen dari Z, naik/turun berapa persen, dan diskon bertingkat dengan tabel tiap langkah serta jumlah yang dihemat (50% + 20% = 60%, bukan 70%). Angka dengan titik/koma (1.500,5 atau 1,500.5) dikenali dari polanya.
- **Mana Lebih Murah** (`#/mana-lebih-murah`): beberapa kemasan (harga × isi, satuan g/kg/ml/L/pcs) diubah ke harga per satuan yang sama; yang termurah ditandai dan selisih kemasan lain ditampilkan dalam persen. Berat dan volume tidak dicampur.

**Paket npm, batch 1.** Lima tool lagi dikemas sebagai paket npm dengan README berbahasa Inggris (belum terbit): `@chalidade/password-generator`, `@chalidade/terbilang`, `@chalidade/text-diff`, `@chalidade/uuid`, dan `@chalidade/word-counter`. Masing-masing berisi custom element (`<uuid-generator>` dan seterusnya) plus API tanpa UI. Kode elemen bersama dipindah ke `packages/_shared/`, dan `scripts/new-package.mjs` membuat kerangka paket baru. `@chalidade/screen-recorder` 0.1.1 sudah terbit dengan README berbahasa Inggris, jadi tab pemasangan npm-nya kini tampil di halaman tool. Perbaikan kecil: label versi UUID kini ikut bahasa Inggris, dan batas SMS di Penghitung Kata cukup bernama "SMS".

## 2026-10-29 — Keuangan

Dua tools baru di kategori Produktivitas; total sekarang **69 tools**.

- **Kalkulator Cicilan** (`#/cicilan`): cicilan pinjaman dengan bunga flat atau anuitas (efektif), tenor dalam bulan atau tahun. Menampilkan angsuran per bulan, total bunga, total dibayar, tabel angsuran lengkap (pokok, bunga, sisa), dan ekspor CSV.
- **Kalkulator Gaji Bersih** (`#/gaji-bersih`): perkiraan gaji bersih dari gaji bruto: PPh 21 (tarif Pasal 17 atas penghasilan setahun, biaya jabatan, PTKP menurut status dan tanggungan, dirata-rata per bulan) serta potongan BPJS Kesehatan, JHT, dan JP. Semua tarif dan batas upah ada di satu berkas (`rates.ts`) bertanggal berlaku, dan hasil diberi catatan bahwa ini perkiraan, bukan nasihat pajak.

## 2026-10-28 — Usaha kecil

Dua tools baru di kategori Produktivitas; total sekarang **67 tools**.

- **QRIS Nominal** (`#/qris`): baca QRIS statis toko dari gambar, screenshot yang ditempel, atau kamera (pembaca QR yang sama dengan tool QR), isi nominal, lalu unduh QR baru sebagai PNG/SVG. Tag 54 disisipkan pada urutan yang benar, penanda tag 01 diubah ke dinamis, dan CRC-16 dihitung ulang; CRC asli diperiksa dan pengguna diberi peringatan bila tidak cocok. Tidak ada yang dikirim ke mana pun.
- **Kwitansi & Invoice** (`#/kwitansi`): isian penerima, item (jumlah × harga), diskon, dan pajak menjadi PDF A4 lewat pdf-lib. Nominal terbilang ditulis otomatis dari mesin Terbilang. Data terakhir tersimpan di browser untuk dipakai lagi; "Dokumen baru" menyimpan data pengirim saja.

## 2026-10-27 — Zakat, tasbih, terbilang

Tiga tools baru di kategori Produktivitas; total sekarang **65 tools**.

- **Kalkulator Zakat** (`#/zakat`): zakat penghasilan (nisab seperduabelas per bulan), harta/mal, emas/perak (hasil dalam gram dan rupiah), dan fitrah (2,5 kg beras per jiwa). Nisab dihitung dari harga emas yang diisi pengguna, tanpa mengambil dari internet, dengan rumus tiap langkah ditampilkan.
- **Tasbih Digital** (`#/tasbih`): penghitung besar dengan target 33/99/bebas/sendiri, getar saat target tercapai, pintasan Spasi/Enter (tambah) dan Backspace (batal satu), serta total dan riwayat putaran yang tersimpan di perangkat.
- **Terbilang** (`#/terbilang`): angka ke teks Indonesia dan Inggris sampai 18 digit, termasuk desimal, akhiran rupiah dan sen, serta pilihan huruf untuk kwitansi dan cek. Titik/koma dikenali sebagai pemisah ribuan atau desimal dari polanya.

## 2026-10-26 — Ibadah

Tiga tools baru di kategori Produktivitas; total sekarang **62 tools**.

- **Jadwal Sholat** (`#/jadwal-sholat`): waktu Imsak, Subuh, Terbit, Dhuha,
  Zuhur, Asar, Maghrib, dan Isya untuk 48 kota (bundel JSON) atau lokasi GPS,
  tampilan harian dengan penanda sholat berikutnya dan tabel sebulan yang bisa
  dicetak. Dihitung di perangkat dari posisi matahari dengan sudut Kemenag
  (Subuh 20°, Isya 18°, Asar bayangan 1×, ihtiyat 2 menit), tanpa API.
- **Arah Kiblat** (`#/arah-kiblat`): sudut kiblat dan jarak ke Ka'bah dari
  lokasi, plus kompas HP langsung lewat `DeviceOrientationEvent` (izin sensor
  di iOS) dengan petunjuk putar kiri/kanan dan peringatan kalibrasi.
- **Konversi Hijriah ⇄ Masehi** (`#/hijriah`): dua arah lewat kalender
  `islamic-umalqura` bawaan `Intl`, plus daftar hari besar Islam per tahun.
  Diberi catatan bahwa tanggal resmi Kemenag (rukyat) bisa selisih sehari.

## 2026-10-25 — Tuner lanjutan

Tidak ada tool baru; Tuner Gitar (`#/guitar-tuner`) mendapat dua tambahan, total tetap **59 tools**.

- **Biola, viola, dan cello**: tuning biola (G D A E), viola (C G D A), dan cello (C G D A). Untuk nada rendah cello (sampai C2) jendela analisis diperlebar otomatis supaya deteksi tetap stabil.
- **Nada acuan (drone)**: nada senar atau nada bebas C2–C6 yang terus berbunyi sampai dimatikan, untuk menyetem dengan telinga atau latihan intonasi. Ikut menyesuaikan pengaturan A4.

## 2026-10-24 — Musik lanjutan

Dua tools baru di kategori Musik; total sekarang **59 tools**.

- **Progresi Chord** (`#/chord-progression`): pilih pola (pop I–V–vi–IV, tahun
  50-an, syahdu, canon, ii–V–I, blues 12 birama, serta empat pola minor) dan
  kunci, lalu dengarkan dengan suara gitar atau piano pada tempo yang bisa
  diatur, 1 atau 2 birama per chord. Kunci bisa digeser per setengah nada,
  chord bisa disalin sebagai teks, dan tombol "Buka di Gitar Online" mengisi
  nampan chord Gitar lewat `?chords=C,G,Am,F`.
- **Perekam Latihan** (`#/practice-recorder`): rekam permainan dari mikrofon
  sambil metronom berbunyi, dengan hitung masuk satu birama. Klik hanya keluar
  lewat speaker sehingga tidak ikut terekam; saat putar ulang, klik dipasang
  kembali di atas rekaman (bisa digeser ±200 ms untuk latensi). Simpan sebagai
  WAV, MP3, atau M4A. Klik metronom dipindah ke `metronome/click.ts` agar
  dipakai bersama.

## 2026-10-23 — Developer

Tiga tools baru di kategori Developer; total sekarang **57 tools**.

- **Encode / Decode** (`#/encode-decode`): Base64 teks (UTF-8, opsi URL-safe),
  URL encode (komponen atau seluruh URL), HTML entities, dan baca token JWT:
  header, payload, waktu `iat`/`nbf`/`exp` beserta status kedaluwarsa. Tanda
  tangan tidak diverifikasi, dan token tidak dikirim ke mana pun.
- **Generator UUID** (`#/uuid`): UUID v4 (acak) dan v7 (urut waktu), 1–1000
  sekaligus, huruf besar, tanpa tanda hubung, atau dengan kurung kurawal. Semua
  lewat `crypto.getRandomValues`.
- **Bandingkan Teks** (`#/text-diff`): diff per baris dengan sorotan per kata
  pada baris yang berubah, tampilan gabung atau berdampingan, opsi abaikan huruf
  besar/kecil dan spasi, serta tombol tukar kedua teks.

## 2026-10-22 — Hitung sehari-hari

Dua tools baru di kategori Produktivitas; total sekarang **54 tools**.

- **Konversi Satuan** (`#/unit-converter`): panjang, berat (termasuk ons dan
  kuintal), luas (are, hektare, tumbak), volume, suhu (Celsius, Fahrenheit,
  Kelvin, Reamur), kecepatan, dan data (KB/MB desimal dan KiB/MiB biner). Bisa
  mengetik koma desimal, ada tombol tukar, dan tabel hasil ke semua satuan
  sekaligus.
- **Kalkulator Tanggal** (`#/date-calculator`): umur tepat (tahun, bulan, hari)
  dengan hitung mundur ulang tahun, selisih dua tanggal, jumlah hari kerja
  dengan libur nasional dan cuti bersama Indonesia 2025–2026 (dibundel sebagai
  JSON, tanpa API luar), serta tambah/kurang hari, minggu, bulan, tahun, atau
  hari kerja.

## 2026-10-21 — Teks & keamanan

Dua tools baru di kategori Produktivitas; total sekarang **52 tools**.

- **Pembuat Password** (`#/password-generator`): password acak 4–64 karakter
  (huruf kecil/besar, angka, simbol, hindari karakter yang mirip) atau passphrase
  3–10 kata Indonesia/Inggris. Memakai `crypto.getRandomValues` tanpa bias, ada
  bar kekuatan dengan bit entropi dan estimasi waktu menebak, plus mode cek
  password yang kamu ketik (tidak dikirim atau disimpan).
- **Penghitung Kata** (`#/word-counter`): kata, karakter (dengan/tanpa spasi),
  kalimat, paragraf, baris, waktu baca dan bicara, serta batas karakter X,
  Instagram, TikTok, WhatsApp status, LinkedIn, SMS, judul SEO, dan meta
  description.

## 2026-10-20 — PDF

Dua tools baru di kategori Edit & Amankan PDF; total sekarang **50 tools**.

- **Atur Halaman PDF** (`#/organize-pdf`): thumbnail semua halaman yang bisa
  diseret untuk mengubah urutan, lalu putar kiri/kanan, duplikat, atau hapus
  per halaman, dan simpan sebagai PDF baru. Ada tombol “Kembalikan” untuk
  mengulang dari awal. Pratinjau lewat pdf.js, penyusunan lewat pdf-lib.
- **Nomor Halaman PDF** (`#/page-numbers`): nomor di enam posisi (atas/bawah ×
  kiri/tengah/kanan), format `1`, `1 / 10`, `Halaman 1`, atau `- 1 -`, ukuran
  huruf, halaman awal (sampul bisa dilewati), dan nomor pertama. Halaman yang
  diputar ikut benar, dan pratinjau memakai perhitungan posisi yang sama.

**Bisa ditemukan di Google**
- Setiap tool sekarang punya alamat sendiri: `chalidade.github.io/tools/<tool>/`
  (Indonesia) dan `chalidade.github.io/tools/en/<tool>/` (English), masing-masing
  dengan judul, deskripsi, dan teks yang bisa dibaca mesin pencari. Klik hasil
  Google langsung membuka tool-nya.
- Bahasa halaman mengikuti alamatnya; tombol ID/EN pindah ke alamat bahasa
  lain dan tetap diingat.
- `sitemap.xml` untuk semua 102 halaman, dan bagian “Kenapa aman dipakai” plus
  tautan ke tool sejenis di bawah setiap tool.
- Tautan lama `#/<tool>` tetap jalan (dialihkan ke alamat baru), begitu juga
  embed `#/<tool>?embed` di situs lain.
- Kata kunci pencarian: “vn”, “voice note”, “whatsapp”, dan “video” kini
  menemukan Kompres Audio (yang memang bisa mengubah voice note dan video ke MP3).

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
