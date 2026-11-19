# toowl di Play Store (TWA)

Aplikasi Android toowl adalah **Trusted Web Activity (TWA)**: aplikasi kecil
yang membuka https://toowl.my.id/ di Chrome tanpa address bar. Isinya tetap
situs yang sama, jadi setiap deploy ke `main` langsung sampai ke pengguna
aplikasi tanpa perlu upload ulang ke Play Store. Upload ulang hanya perlu
kalau `twa-manifest.json` berubah (nama, ikon, warna, shortcut, versi).

Proyek Android dibuat oleh [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
dari `twa-manifest.json`. Di git hanya file itu (dan README ini) yang
disimpan; folder proyek Gradle, hasil build, dan keystore diabaikan
(`.gitignore`).

| | |
|---|---|
| Package name | `id.my.toowl` (**permanen** setelah upload pertama) |
| Domain | `toowl.my.id` |
| Kunci di situs | `public/.well-known/assetlinks.json` |
| Kebijakan privasi | https://toowl.my.id/privacy/ |

> Package name tidak bisa diganti setelah aplikasi pertama kali di-upload ke
> Play Console. Kalau mau nama lain, ganti `packageId` di `twa-manifest.json`
> **dan** `package_name` di `assetlinks.json` sebelum build pertama.

## 0. Sekali saja: siapkan alat

```bash
npm i -g @bubblewrap/cli
bubblewrap doctor
```

Saat pertama dijalankan, Bubblewrap menawarkan untuk mengunduh JDK 17 dan
Android SDK sendiri. Jawab **Yes** untuk keduanya (paling gampang).

## 1. Pastikan situsnya siap

PR ini harus sudah di-merge dan ter-deploy. Cek di browser:

- https://toowl.my.id/manifest.webmanifest — ada ikon `maskable` dan `monochrome`
- https://toowl.my.id/icon-monochrome-512.png — terbuka
- https://toowl.my.id/.well-known/assetlinks.json — terbuka (masih placeholder, tidak apa-apa)
- https://toowl.my.id/privacy/ — terbuka

Bubblewrap mengunduh ikon dari alamat-alamat di atas, jadi build gagal kalau
belum ter-deploy.

## 2. Buat keystore (kunci upload)

```bash
cd android
keytool -genkeypair -v -keystore android.keystore -alias toowl \
  -keyalg RSA -keysize 2048 -validity 10000
```

- Simpan file `android.keystore` dan kedua password-nya di tempat aman
  (password manager + backup di luar laptop). **Jangan commit** (sudah
  di-ignore).
- Ini adalah *upload key*. Dengan Play App Signing (default untuk aplikasi
  baru), Google memegang kunci penandatanganan aslinya, jadi kalau upload key
  hilang masih bisa di-reset lewat support Play Console. Tetap jangan sampai
  hilang.

## 3. Generate proyek dan build

```bash
cd android
bubblewrap update --skipVersionUpgrade   # bikin proyek Gradle dari twa-manifest.json
bubblewrap build                         # minta password keystore, lalu build
```

Hasilnya:

- `app-release-bundle.aab` — ini yang di-upload ke Play Console
- `app-release-signed.apk` — untuk dicoba langsung di HP (`adb install app-release-signed.apk`)

## 4. Isi fingerprint di `assetlinks.json`

Tanpa langkah ini aplikasi tetap jalan, tapi muncul **address bar** di atas
(Chrome belum percaya aplikasinya pemilik domain).

1. Fingerprint upload key (dari keystore kamu):
   ```bash
   keytool -list -v -keystore android/android.keystore -alias toowl | grep SHA256
   ```
2. Fingerprint app signing key (dari Google): Play Console → aplikasi toowl →
   **Test and release → App integrity → App signing** → salin *SHA-256
   certificate fingerprint* di bagian **App signing key certificate**.
   Fingerprint ini baru ada setelah AAB pertama di-upload (langkah 5).
3. Ganti dua placeholder di `public/.well-known/assetlinks.json` dengan dua
   fingerprint itu (format `AA:BB:CC:…`, huruf besar), commit ke `main`, tunggu
   deploy.
4. Cek: https://developers.google.com/digital-asset-links/tools/generator
   (isi domain `toowl.my.id`, package `id.my.toowl`, fingerprint app
   signing) → **Test statement**.

Play Console juga menampilkan potongan `assetlinks.json` lengkap di halaman
App signing yang sama; isinya boleh langsung ditempel.

## 5. Upload ke Play Console

1. **Create app** → nama *toowl*, bahasa default Indonesia, App, Free.
2. **App content** (wajib sebelum rilis):
   - Privacy policy: `https://toowl.my.id/privacy/`
   - Ads: tidak ada iklan
   - Data safety: **tidak mengumpulkan dan tidak membagikan data**. Semua file
     diproses di perangkat; mikrofon dipakai di perangkat saja dan tidak
     dikirim.
   - Target audience: 13+ (atau 18+); bukan aplikasi anak.
   - Content rating: isi kuesioner (utilitas, tanpa konten sensitif).
3. **Store listing**: ikon 512×512 (`public/icon-512.png`), feature graphic
   1024×500, minimal 2 screenshot HP (bisa pakai `docs/screenshot-mobile*.png`
   atau ambil dari aplikasinya langsung).
4. **Testing → Closed testing** → buat release → upload
   `app-release-bundle.aab`.

   Akun developer **pribadi** yang dibuat setelah November 2023 wajib
   menjalankan closed test dengan **minimal 12 tester selama 14 hari
   berturut-turut** sebelum boleh rilis ke Production. Akun organisasi tidak
   kena aturan ini.
5. Setelah syarat itu terpenuhi: **Production → Create release** → pakai AAB
   yang sama → kirim untuk review.

## Rilis berikutnya

Perubahan di situs **tidak perlu** rilis baru. Kalau `twa-manifest.json`
diubah (atau Play minta target SDK lebih baru):

```bash
cd android
bubblewrap update      # menaikkan appVersionCode/appVersionName otomatis
bubblewrap build
```

Commit `twa-manifest.json` yang versinya sudah naik, lalu upload AAB baru.

## Nanti: Google Play Billing

Untuk fitur berbayar, TWA memakai Digital Goods API + Payment Request API
dari sisi web. Saat sudah siap:

1. Di `twa-manifest.json` set `"enableNotifications": true` (Bubblewrap
   mewajibkannya untuk billing) dan
   `"features": { "playBilling": { "enabled": true } }`.
2. `bubblewrap update` lalu `bubblewrap build`, rilis versi baru.
3. Buat produk di Play Console → Monetize, lalu panggil
   `window.getDigitalGoodsService('https://play.google.com/billing')` di
   situs (hanya ada di dalam aplikasi Play; di browser biasa fitur berbayar
   bisa disembunyikan atau pakai jalur lain).
