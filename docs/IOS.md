# toowl di App Store (iOS)

Aplikasi iOS toowl adalah situs yang sama, dibungkus **Capacitor 8**. Bedanya
dengan "Tambahkan ke Layar Utama": seluruh build (`dist/`) ikut dibundel di dalam
app, jadi semua tool jalan offline dan tidak ada yang dimuat dari toowl.my.id.
Apple sering menolak app yang cuma membuka situs web (guideline 4.2), jadi app
ini juga punya fitur native kecil: **buka file dari app lain** dan **simpan hasil
lewat share sheet**.

Build, tanda tangan (signing), dan upload butuh **Mac dengan Xcode**. Semua
langkah di bawah dijalankan di Mac.

## Isi repo

| Bagian | Fungsinya |
| --- | --- |
| `capacitor.config.ts` | App ID `id.my.toowl` (sama dengan package name Android), nama `toowl`, folder web `dist`. |
| `ios/` | Proyek Xcode (dibuat `npx cap add ios`). `ios/App/App/public` dan `capacitor.config.json` dibuat ulang tiap `cap sync`, tidak di-commit. |
| `ios/App/App/Info.plist` | Teks izin kamera, mikrofon, lokasi, kompas, simpan ke Foto; daftar jenis file yang bisa dibuka dengan toowl (PDF, Word, Excel, PowerPoint, gambar, audio, video). |
| `ios/App/App/Assets.xcassets` | Ikon app 1024×1024 dan layar pembuka (monogram lime di latar gelap). |
| `native/store/` | Plugin lokal `ToowlStore`: In-App Purchase lewat **StoreKit 2**, tanpa server dan tanpa SDK pihak ketiga. `cap sync` mendaftarkannya otomatis. |
| `src/lib/native.ts` | `isNativeApp()`, simpan file lewat share sheet (`saveNative`), dan file masuk dari "Buka di toowl" yang diteruskan ke tool yang cocok. |
| `src/lib/premium.ts` | Satu pintu untuk freemium di semua toko: `usePremium()`, `buyPremium()`, `restorePremium()`. Belum ada tool yang dikunci. |

Yang berubah di situs hanya berlaku di dalam app: tombol "Pasang aplikasi",
service worker, dan link Trakteer disembunyikan (Apple melarang link pembayaran
di luar In-App Purchase, guideline 3.1.1), dan **Rekam Layar** tidak tampil
karena web view iOS tidak bisa merekam layar. Tool medis (`webOnly` di
`src/tools/registry.ts`, sama seperti di app Play) juga tidak tampil, karena
Apple meminta fitur kesehatan diterbitkan akun organisasi (guideline 5.1.1(ix)).

## 1. Sekali saja: siapkan Mac dan akun

1. Install **Xcode** terbaru dari Mac App Store (sejak April 2026 App Store
   mewajibkan build dengan SDK iOS 26 / Xcode 26 ke atas), lalu buka sekali
   supaya komponen tambahannya terpasang.
2. Install **Node.js 22**.
3. Akun **Apple Developer Program** (USD 99/tahun) harus sudah aktif. Di
   Xcode: *Settings → Accounts → +* lalu masuk dengan Apple ID itu.
4. Di [developer.apple.com → Identifiers](https://developer.apple.com/account/resources/identifiers/list)
   daftarkan App ID **`id.my.toowl`** (Explicit), centang **In-App Purchase**.
   (Xcode juga bisa mendaftarkannya otomatis di langkah 3 di bawah.)

## 2. Build

```bash
git clone https://github.com/chalidade/tools && cd tools
npm ci
npm run build:ios      # tsc + vite build --base=/ + halaman per tool + cap sync ios
npx cap open ios       # membuka ios/App/App.xcodeproj di Xcode
```

Pertama kali dibuka, Xcode mengunduh paket Swift (Capacitor). Tunggu sampai
"Resolving packages" selesai.

## 3. Signing di Xcode

1. Pilih proyek **App** → target **App** → tab **Signing & Capabilities**.
2. Centang **Automatically manage signing**, pilih **Team** kamu.
   Bundle Identifier harus `id.my.toowl`.
3. Klik **+ Capability** → **In-App Purchase** (cukup sekali; tersimpan di proyek).
4. Tab **General**: *Version* = `1.0.0` (versi yang dilihat orang), *Build* = `1`
   (naikkan tiap upload).

## 4. Coba di simulator dan HP

Pilih iPhone simulator atau HP yang dicolok, lalu ▶ (Run). Yang perlu dicek
sebelum submit:

- [ ] Mode pesawat: buka beberapa tool (PDF, gambar, piano). Semua harus jalan.
- [ ] Di app **Files**, tekan lama sebuah PDF → **Bagikan** → **toowl**. App
      terbuka di **Baca PDF** dengan file itu. Coba juga .docx, .xlsx, foto, video.
- [ ] Simpan hasil (misal **Kompres Gambar**): share sheet muncul, **Simpan ke
      File** berhasil.
- [ ] **Scan QR** dan **Cek Perangkat** minta izin kamera; **Tuner Gitar** minta
      mikrofon; **Jadwal Sholat** minta lokasi. Tidak ada yang crash.
- [ ] Footer tidak menampilkan "Traktir kopi"; tidak ada tombol "Pasang aplikasi".
- [ ] iPad (simulator iPad Pro 13"): tata letak wajar, share sheet muncul.

Kalau ada tool yang tidak jalan di iOS, tambahkan slug-nya ke
`IOS_UNSUPPORTED` di `src/tools/registry.ts` supaya tidak tampil di app.

## 5. App Store Connect

Di [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps → + → New App**:

- **Platform** iOS · **Name** `toowl` (kalau sudah dipakai orang, misalnya
  `toowl: Tools PDF & Gambar`) · **Primary Language** Indonesian ·
  **Bundle ID** `id.my.toowl` · **SKU** bebas, misalnya `toowl-ios`.
- **Category**: Productivity (sekunder: Utilities).
- **Privacy Policy URL**: `https://toowl.my.id/privacy/` (halaman ini disiapkan
  di PR Play Store; pastikan sudah live sebelum submit).
- **App Privacy** → *Data Collection*: **No, we do not collect data from this
  app**. Benar untuk app ini: semua diproses di perangkat, tidak ada analytics.
  (Kalau nanti ada In-App Purchase, Apple yang memproses pembayarannya; toowl
  tetap tidak mengumpulkan data.)
- **Age Rating**: jawab semua "None/No" → 4+.
- **Screenshots**: wajib iPhone 6.9" (1320×2868) dan, karena app juga untuk
  iPad, iPad 13" (2064×2752). Ambil dari simulator dengan ⌘S.
- **Export compliance (enkripsi)**: toowl memakai AES standar (qpdf untuk
  **Proteksi PDF**, Web Crypto untuk **Enkripsi File**). Saat ditanya, jawab
  bahwa app memakai algoritma enkripsi standar. Untuk app yang tersedia di
  semua negara, Apple biasanya meminta dokumen tambahan hanya untuk Prancis.
  Ini bukan nasihat hukum; baca penjelasan Apple di halaman pertanyaan itu.
  Setelah jelas jawabannya, tambahkan `ITSAppUsesNonExemptEncryption` ke
  `Info.plist` supaya pertanyaan ini tidak muncul tiap upload.

## 6. Upload dan TestFlight

1. Di Xcode, tujuan build: **Any iOS Device (arm64)**.
2. **Product → Archive**. Setelah selesai, Organizer terbuka →
   **Distribute App → App Store Connect → Upload**.
3. Setelah ±15 menit build muncul di App Store Connect → **TestFlight**. Pasang
   lewat app TestFlight di HP dan ulangi checklist langkah 4.
4. Di halaman versi 1.0: pilih build itu, isi deskripsi, kata kunci, URL
   dukungan (`https://toowl.my.id/`), lalu **Add for Review → Submit**.

**Catatan untuk reviewer** (App Review Information → Notes), contoh:

> toowl is a collection of 110+ offline tools for documents, PDF, images,
> audio, video and music. Every tool runs on the device from files bundled in
> the app; nothing is uploaded and no account is needed. Native integration:
> open a PDF/Office/image/media file from Files or any app's share sheet
> ("toowl") to open it in the matching tool, and save results through the
> share sheet. To try: Files → long-press a PDF → Share → toowl.

## 7. In-App Purchase (freemium)

Kodenya sudah siap, tapi **belum ada tool yang dikunci**. Saran: terbitkan 1.0
gratis dulu tanpa produk. Review pertama jadi lebih sederhana, dan premium
masuk di 1.1 setelah jelas apa isinya.

Saat premium mau diaktifkan:

1. App Store Connect → **Business** (Agreements, Tax, and Banking): tanda
   tangani **Paid Apps Agreement**, isi rekening dan pajak. Tanpa ini produk
   tidak bisa dijual.
2. App toowl → **Monetization → In-App Purchases → +** → **Non-Consumable**,
   Product ID **`toowl.pro`** (harus sama dengan `PRO` di
   `src/lib/premium.ts`), isi nama, harga, dan screenshot untuk review.
   Kalau maunya langganan, buat *Subscription Group* dengan ID produk sendiri
   lalu ganti `PRO`; kode StoreKit-nya sudah menangani keduanya.
3. Di kode tool: `const premium = usePremium()` untuk mengunci, tombol beli
   memanggil `buyPremium()` (harga dari `premiumProduct()`), dan **wajib** ada
   tombol "Pulihkan Pembelian" yang memanggil `restorePremium()`.
4. Coba dengan akun **Sandbox** (App Store Connect → Users and Access →
   Sandbox), atau di simulator dengan file konfigurasi StoreKit
   (*File → New → File → StoreKit Configuration File*, lalu pilih di
   *Scheme → Run → Options → StoreKit Configuration*).
5. Saat submit versi itu, centang produk `toowl.pro` di halaman versi supaya
   ikut di-review.

Di situs web tidak ada harga dan tidak ada yang dikunci (`store()` = `null`).
Android (Play Store) nanti dicolokkan ke `premium.ts` lewat Google Play
Billing dengan product ID yang sama.

## 8. Rilis berikutnya

```bash
git pull && npm ci
npm run build:ios
npx cap open ios
```

Naikkan *Version* (misal `1.0.1`) dan *Build* di Xcode, lalu Archive → Upload
seperti langkah 6. Update situs tidak otomatis masuk app; app hanya berubah
lewat versi baru di App Store.

## Lisensi

Kode toowl berlisensi AGPL-3.0. Sebagai pemegang hak cipta, kamu boleh
menerbitkannya di App Store. Kalau nanti menerima kontribusi kode dari orang
lain, minta persetujuan tertulis (CLA) supaya kode mereka juga boleh ikut
terbit di App Store dan di lisensi komersial.
