# tools

Kumpulan tools kecil yang jalan **sepenuhnya di browser**. File diproses di
perangkat pengguna: tidak di-upload ke server dan tidak disimpan di mana pun.

**Live:** https://chalidade.github.io/tools/

| Tool | Alamat | Keterangan |
| --- | --- | --- |
| Word ke PDF | [`#/doc-to-pdf`](https://chalidade.github.io/tools/#/doc-to-pdf) | `.docx` → PDF (docx-preview + jsPDF). `.doc` lama belum didukung. |
| PDF ke Word | [`#/pdf-to-word`](https://chalidade.github.io/tools/#/pdf-to-word) | PDF → `.docx` yang bisa diedit (pdf.js + docx). Teks, ukuran, tebal/miring, font, tab, dan pemisah halaman ikut; gambar dan garis tabel tidak. PDF hasil scan belum didukung (butuh OCR). |
| Gambar ke PDF | [`#/image-to-pdf`](https://chalidade.github.io/tools/#/image-to-pdf) | JPG/PNG/WebP/GIF/BMP → satu PDF (jsPDF). Banyak gambar sekaligus, urutan bisa diatur, putar 90°, ukuran A4/Letter/sesuai gambar, orientasi, margin. Rotasi EXIF foto ponsel ikut. HEIC hanya terbaca di Safari. |

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
