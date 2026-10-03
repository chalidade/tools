# tools

Kumpulan tools kecil yang jalan **sepenuhnya di browser**. File diproses di
perangkat pengguna: tidak di-upload ke server dan tidak disimpan di mana pun.

**Live:** https://chalidade.github.io/tools/

| Tool | Alamat | Keterangan |
| --- | --- | --- |
| Word ke PDF | [`#/doc-to-pdf`](https://chalidade.github.io/tools/#/doc-to-pdf) | `.docx` → PDF (docx-preview + jsPDF). `.doc` lama belum didukung. |

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
2. Tambahkan satu entri di `src/tools/registry.ts` (slug, judul, deskripsi,
   ikon lucide, format, `lazy(() => import(...))`).

Kartu di halaman depan dan rute `#/<slug>` muncul otomatis. Routing sengaja
memakai hash supaya jalan di sub-path Pages (dan di dalam APK) tanpa rewrite di
server.

**Aturan main:** semua pemrosesan wajib di sisi klien. Jangan menambahkan
backend atau mengirim file pengguna ke layanan pihak ketiga.

## Stack

Vite + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui, Motion
(`motion/react`), ikon lucide-react.
