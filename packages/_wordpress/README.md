# Plugin WordPress toowl

Tool toowl sebagai **block Gutenberg** dan **shortcode** di WordPress. Sumbernya
sama dengan paket npm (`packages/<tool>/src/element.tsx` → kode situs di
`src/tools/`), jadi tidak ada salinan kode tool. Semua JS, CSS dan WebAssembly
ikut di dalam ZIP plugin dan dimuat dari folder plugin itu sendiri: tanpa CDN,
tanpa upload, tool jalan di browser pengunjung.

```bash
node packages/_wordpress/build.mjs          # dua edisi
node packages/_wordpress/build.mjs free     # toowl (untuk WordPress.org)
node packages/_wordpress/build.mjs pro      # toowl-pro (dijual)
```

Hasilnya `packages/_wordpress/out/toowl-<versi>.zip` dan `toowl-pro-<versi>.zip`,
siap di-upload lewat **Plugins → Add New → Upload Plugin**.

## Dua edisi, satu sumber

| | `toowl` (gratis) | `toowl-pro` |
| --- | --- | --- |
| Tool | hanya `FREE` di `config.mjs` | semua `TOOLS` |
| Kode lisensi | **tidak ada sama sekali** | `includes/license.php` |
| Dijual di | WordPress.org | Gumroad (nanti bisa Freemius) |

Kenapa dua ZIP, bukan satu plugin yang dikunci: **WordPress.org melarang
"trialware"** (fitur yang ada di plugin gratis tapi dikunci sampai bayar).
Jadi ZIP gratis cuma berisi tool gratis; tool berbayar hanya ada di ZIP Pro.
Di Pro, tool `FREE` selalu jalan, sisanya terbuka sesuai kunci lisensi.
Kalau Pro diaktifkan sementara plugin gratis masih aktif, plugin gratis
dimatikan otomatis (Pro sudah berisi semuanya, opsi dan lisensi tetap).

## Lisensi (Pro)

Kunci Gumroad yang sama dengan lisensi embed (`LICENSE.gumroad` di
`src/lib/license.ts`). `build.mjs` membaca produk-produk itu dan menulis
`assets/products.json` berisi tool yang dibuka tiap produk di plugin ini:

- `one` → **Tool ini saja**: tool dipilih lewat varian checkout `… [slug]`.
- daftar slug → **paket tema** (PDF, Kreator & Media, dst.; dihitung dari
  `categories`/`tools` scope-nya).
- `all` → **Semua tool** dan **Agensi**.

Kunci dicek **dari server WordPress** (bukan browser pengunjung) ke endpoint
publik Gumroad `/v2/licenses/verify` waktu disimpan di **Settings → toowl**,
lalu seminggu sekali lewat WP-Cron. Kalau Gumroad tidak bisa dihubungi,
hasil terakhir tetap dipakai. Kunci yang di-refund / langganan berakhir
berhenti berlaku di pengecekan berikutnya. Seperti di situs, ini gerbang
kenyamanan, bukan DRM.

Tool terkunci tidak tampil ke pengunjung; admin/editor melihat catatan kuning
dengan tautan ke halaman pengaturan.

## Pemakaian

- Block: inserter → cari "toowl" → tiap tool punya block sendiri (variasi dari
  block `toowl/tool`); tema dan bahasa di sidebar.
- Shortcode: `[toowl tool="compress-pdf" theme="dark" lang="en"]`.
  `theme` = `auto|light|dark`, `lang` = `en|id` (default: bahasa situs).
- **Credit** "Made with toowl" di bawah tool **mati secara default** dan hanya
  muncul kalau pemilik situs mencentangnya: aturan WordPress.org melarang link
  kredit tanpa izin. Tool yang tercakup lisensi tidak pernah diberi credit.

Butuh WordPress 6.5+ (Script Modules API) dan PHP 7.4+.

## Lisensi kode

Plugin ini **GPL-2.0-or-later** (`plugin/LICENSE.txt`), bukan AGPL seperti
repo. WordPress.org hanya menerima plugin yang kompatibel GPL v2-or-later, dan
AGPL-3.0 tidak termasuk. Ini boleh karena pemilik repo memegang hak cipta
kodenya sendiri dan bisa melisensikannya ulang untuk distribusi ini.
Library pihak ketiga yang ter-bundle di 5 tool prototipe semuanya MIT / ISC /
BSD / Apache-2.0 / Zlib, aman digabung di bawah GPL (Apache-2.0 lewat GPLv3,
yang dicakup "or later"). **Sebelum menambah tool**, cek THIRD-PARTY-NOTICES-nya:
yang GPL-3.0-only (mis. LibreDWG di `dwg-to-pdf`) atau LGPL perlu dicek dulu.

## Menguji

Belum ada uji otomatis. Yang dipakai saat membuat prototipe: WordPress 6.6 +
SQLite (`sqlite-database-integration`) di `php -S`, tema klasik dan tema block,
plugin gratis lalu Pro, kunci Gumroad tiruan lewat filter `pre_http_request`,
lalu Chrome headless: elemen tampil di Shadow DOM, CSS tema "nakal" tidak bocor,
dan Compress PDF benar-benar memproses file (qpdf.wasm dimuat dari folder plugin).

## Sebelum rilis

- Nama `toowl` di WordPress.org harus masih tersedia (slug ditentukan saat submit).
- Untuk Pro di luar WordPress.org perlu mekanisme update (Freemius, atau
  update server sendiri); prototipe ini belum punya.
- Terjemahan Indonesia untuk teks admin (`toowl.pot`) belum dibuat; judul dan
  deskripsi tool sudah dua bahasa dari registry.
- Beberapa tool di satu halaman memakai satu bahasa UI yang sama (state
  bahasa paket bersifat global), jadi `lang` berbeda per block di satu halaman
  belum didukung.
