# tools

Kumpulan tools kecil yang jalan **sepenuhnya di browser**. File diproses di
perangkat pengguna: tidak di-upload ke server dan tidak disimpan di mana pun.

**Live:** https://chalidade.github.io/tools/

| Tool | Alamat | Keterangan |
| --- | --- | --- |
| Word ke PDF | [`#/doc-to-pdf`](https://chalidade.github.io/tools/#/doc-to-pdf) | `.docx` → PDF (docx-preview + jsPDF). `.doc` lama belum didukung. |
| PDF ke Word | [`#/pdf-to-word`](https://chalidade.github.io/tools/#/pdf-to-word) | PDF → `.docx` yang bisa diedit (pdf.js + docx). Teks, ukuran, tebal/miring, font, tab, dan pemisah halaman ikut; gambar dan garis tabel tidak. PDF hasil scan belum didukung (butuh OCR). |
| Gambar ke PDF | [`#/image-to-pdf`](https://chalidade.github.io/tools/#/image-to-pdf) | JPG/PNG/WebP/GIF/BMP → satu PDF (jsPDF). Banyak gambar sekaligus, urutan bisa diatur, putar 90°, ukuran A4/Letter/sesuai gambar, orientasi, margin. Rotasi EXIF foto ponsel ikut. HEIC hanya terbaca di Safari. |
| PowerPoint ke PDF | [`#/ppt-to-pdf`](https://chalidade.github.io/tools/#/ppt-to-pdf) | `.pptx` → PDF, satu halaman per slide (@jvmr/pptx-to-html + jsPDF, HTML slide disanitasi dengan DOMPurify). Teks, bentuk, tabel, grafik, dan gambar ikut; animasi, transisi, dan video tidak. `.ppt` lama belum didukung. |
| Excel ke PDF | [`#/excel-to-pdf`](https://chalidade.github.io/tools/#/excel-to-pdf) | `.xlsx`/`.csv` → PDF tabel dengan teks yang bisa diseleksi (ExcelJS + numfmt + jsPDF autotable). Warna (termasuk warna tema), tebal/miring, border, sel gabungan, format angka/tanggal/persen, teks terbungkus; baris/kolom/sheet tersembunyi dilewati. Pilihan kertas, orientasi, muat-ke-lebar atau ukuran asli, garis bantu, dan sheet mana yang dicetak. `.xls`/`.ods` belum didukung; huruf di luar Latin (mis. aksara CJK) belum tampil benar karena PDF memakai font Helvetica bawaan. |
| PDF ke Excel | [`#/pdf-to-excel`](https://chalidade.github.io/tools/#/pdf-to-excel) | Tabel di PDF → `.xlsx` (pdf.js + ExcelJS). Baris dari garis dasar teks, kolom dari celah vertikal yang kosong; sel yang terbungkus digabung kembali; header yang berulang tiap halaman diambil sekali. Angka (Rp, ribuan, desimal koma/titik, persen, negatif dalam kurung) jadi angka sungguhan dengan format Excel; nomor berawalan 0 tetap teks. Satu sheet gabungan atau satu per halaman. PDF hasil scan belum didukung. |
| PDF ke PowerPoint | [`#/pdf-to-ppt`](https://chalidade.github.io/tools/#/pdf-to-ppt) | Tiap halaman PDF → satu slide `.pptx` seukuran halaman (pdf.js + pptxgenjs). Mode **teks bisa diedit**: latar slide = halaman tanpa teks (bentuk, warna, gambar), teks jadi kotak teks di posisi aslinya dengan ukuran, tebal/miring, font, dan warna (warna dibaca dari selisih piksel render dengan/tanpa teks). Mode **persis seperti PDF**: tiap slide berupa gambar halaman. |
| PDF ke Gambar | [`#/pdf-to-image`](https://chalidade.github.io/tools/#/pdf-to-image) | Halaman PDF → PNG/JPG pada 72/150/300 dpi (pdf.js). Pilih halaman lewat pratinjau; satu halaman jadi gambar, beberapa jadi ZIP (jszip). |
| Kompres PDF | [`#/compress-pdf`](https://chalidade.github.io/tools/#/compress-pdf) | Foto JPEG di dalam PDF diperkecil dan dikodekan ulang (Ringan/Sedang/Kuat), lalu struktur PDF dioptimasi dengan qpdf (object stream, rekompresi). Teks tetap teks. Gambar non-JPEG/CMYK tidak disentuh; hasil tidak pernah lebih besar dari aslinya. |
| PDF ke Markdown | [`#/pdf-to-markdown`](https://chalidade.github.io/tools/#/pdf-to-markdown) | Judul dari ukuran huruf, **tebal**/*miring*, daftar, dan tabel Markdown (mesin tabel PDF ke Excel + mesin paragraf PDF ke Word); tabel yang bersambung antar-halaman digabung. |
| Proteksi PDF | [`#/protect-pdf`](https://chalidade.github.io/tools/#/protect-pdf) | Password buka + izin cetak/salin/ubah, enkripsi AES-256 (qpdf). |
| Buka Proteksi PDF | [`#/unlock-pdf`](https://chalidade.github.io/tools/#/unlock-pdf) | Hapus password (dengan password yang benar) atau batasan cetak/salin/ubah dari PDF milik sendiri (qpdf). |

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
   (`FileDrop`, `ErrorNote`, `Segmented`) dan `downloadBlob` dari `src/lib/download.ts`.
   Tool yang membaca teks PDF memakai `src/lib/pdf-text.ts`.
2. Tambahkan satu entri di `src/tools/registry.ts` (slug, judul, deskripsi,
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

Vite + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui, Motion
(`motion/react`), ikon lucide-react, font Geist. Tema gelap secara default;
pengunjung bisa beralih ke terang dari header.
