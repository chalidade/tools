# toowl untuk Chrome (ekstensi freemium)

Ekstensi Chrome (Manifest V3) yang membuka 16 tool toowl di **side panel**
browser, plus menu **klik kanan** di gambar, link, teks, dan halaman. Semua
diproses di komputer pengguna, sama seperti situsnya: komponen tool diambil
langsung dari `src/` (alias `@` → `../../src`), bukan salinan.

| Gratis | Pro |
| --- | --- |
| Kompres Gambar, Ubah Format Gambar, Buat QR Code, Baca QR & Barcode | Hapus Latar (AI), Crop & Resize, Hapus Metadata, Kompres/Gabung/Pisah PDF, Gambar ke PDF, PDF ke Gambar, Tanda Tangan PDF, Watermark PDF, Kunci & Buka Kunci PDF |

Pengguna gratis tetap bisa mencoba tool Pro: **2 kali simpan per hari**
(`PRO.freeSavesPerDay` di `src/config.ts`). Setelah habis, tool Pro diganti
layar upgrade. Satu "simpan" = satu kali `downloadBlob` dari tool Pro.

Menu klik kanan (`src/background.ts`): QR code untuk halaman / link / teks
terpilih, dan untuk gambar: Kompres, Ubah format, Hapus latar (Pro), Baca QR.
Gambar diambil dari situsnya oleh side panel. Kalau situs itu menolak (CORS),
panel minta izin host untuk situs itu saja (`optional_host_permissions`),
jadi ekstensi tidak perlu izin "baca semua situs" saat dipasang.

## Build

```bash
node packages/_chrome/build.mjs
```

- `packages/_chrome/dist/` → buka `chrome://extensions`, nyalakan Developer
  mode, **Load unpacked**, pilih folder ini untuk mencoba.
- `packages/_chrome/out/toowl-chrome-<versi>.zip` → yang di-upload ke Chrome
  Web Store. Versi diambil dari `public/manifest.json` (naikkan tiap update).

Build menolak kalau masih ada URL script dari CDN di bundle (Web Store
melarang kode remote); URL PDFObject bawaan jsPDF dikosongkan otomatis.

Gambar listing (screenshot 1280×800 EN/ID, promo tile 440×280, marquee
1400×560): `node packages/_chrome/store/render.mjs` → `out/store/`. Tangkapan
side panel ada di `store/panels/<lang>/`. Teks listing siap tempel:
[`store/listing.md`](store/listing.md).

## Jualan (sekali setup)

Lisensi dicek dari browser ke endpoint publik toko (tanpa secret key),
disimpan di `chrome.storage.local`, dicek ulang seminggu sekali; kalau
offline, kunci yang valid tetap jalan 30 hari. Isi `src/config.ts`:

**Gumroad (paling cepat, akunnya sudah ada):**
1. Buat produk baru **toowl Pro for Chrome**, tipe *Membership*: tier
   $3/bulan dan $24/tahun. Centang **Generate a unique license key per sale**.
2. Salin product id (tab Content → "Use your product ID to verify
   licenses") ke `PRO.gumroad.productIds`. URL produk ke `PRO.gumroad.url`
   (default `https://chalidade.gumroad.com/l/toowl-chrome-pro`).
3. Kunci All-Access dan Agency toowl yang sudah ada otomatis ikut membuka Pro
   (`alsoAccept`). Satu kunci Gumroad maksimal dipakai di 5 pemasangan
   (`maxActivations`).

**Lemon Squeezy (opsional, kalau toko sudah disetujui):** buat produk
subscription dengan *License keys* aktif (activation limit misal 3), lalu
isi `storeId`, `productIds`, dan `checkoutUrl`. Kalau `checkoutUrl` terisi,
tombol beli mengarah ke Lemon Squeezy; kunci Gumroad tetap diterima.

Selama belum ada produk yang diisi, layar upgrade menulis "Segera dijual"
dan kolom kunci hanya menerima kunci All-Access/Agency.

## Terbit di Chrome Web Store

1. Daftar di https://chrome.google.com/webstore/devconsole (biaya sekali
   $5), verifikasi email.
2. **New item** → upload ZIP dari `out/`.
3. Tab **Store listing**: tempel teks dari `store/listing.md`, upload ikon
   128 (`public/icons/128.png`), screenshot, dan promo tile.
4. Tab **Privacy**: isi single purpose, alasan tiap izin, dan centang data
   usage seperti di `store/listing.md`. Privacy policy:
   https://toowl.my.id/privacy/
5. Tab **Distribution**: Public, semua negara. Submit for review (biasanya
   1–3 hari kerja; `optional_host_permissions` dan `wasm-unsafe-eval`
   sudah dijelaskan di listing).

## Kenapa begini

- **Side panel**, bukan popup: popup tertutup begitu pengguna klik di luar,
  jadi memilih file atau menunggu kompres PDF akan batal.
- Daftar tool sendiri (`src/tools.ts`), tidak mengimpor registry situs:
  registry memuat ~150 tool secara lazy dan Vite akan membuat chunk untuk
  semuanya.
- File dari klik kanan masuk lewat mekanisme yang sama dengan "Open in
  toowl" di iOS: `deliverIncoming(slug, file)` di `src/lib/native.ts`, lalu
  `FileDrop` tool itu mengambilnya. Ekstensi memberi tahu tool yang tampil
  lewat `setShownSlug`.
- Hapus latar memakai WebGPU kalau ada, kalau tidak jatuh ke WebAssembly
  (diuji jalan di ekstensi). Model dan runtime ikut di ZIP (±33 MB terurai,
  14 MB ZIP), tidak diunduh.
