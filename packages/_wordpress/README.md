# Plugin WordPress toowl

Tool toowl sebagai **block Gutenberg** dan **shortcode** di WordPress. Sumbernya
sama dengan paket npm (`packages/<tool>/src/element.tsx` → kode situs di
`src/tools/`), jadi tidak ada salinan kode tool. Semua JS, CSS dan WebAssembly
ikut di dalam ZIP plugin dan dimuat dari folder plugin itu sendiri: tanpa CDN,
tanpa upload, tool jalan di browser pengunjung.

```bash
node packages/_wordpress/build.mjs             # semua edisi
node packages/_wordpress/build.mjs optimizer   # toowl-image-optimizer (WordPress.org)
node packages/_wordpress/build.mjs free        # toowl (WordPress.org)
node packages/_wordpress/build.mjs pro         # toowl-pro (dijual)
```

Hasilnya `packages/_wordpress/out/<slug>-<versi>.zip`, siap di-upload lewat
**Plugins → Add New → Upload Plugin**.

## Tiga edisi, satu sumber

| | `toowl-image-optimizer` | `toowl` (gratis) | `toowl-pro` |
| --- | --- | --- | --- |
| Image optimizer | ya | ya | ya |
| Tool (block/shortcode) | tidak ada | hanya `FREE` di `config.mjs` | semua `TOOLS` |
| Kode lisensi | tidak ada | **tidak ada sama sekali** | `includes/license.php` |
| Dijual di | WordPress.org | WordPress.org | Gumroad (nanti bisa Freemius) |

Edisinya bertingkat (optimizer ⊂ gratis ⊂ Pro). Kalau beberapa aktif sekaligus,
hanya yang paling lengkap yang jalan, dan saat admin membuka wp-admin edisi
yang lebih kecil dimatikan otomatis (pengaturan dipakai bersama). Text domain
tiap edisi = slug-nya (syarat WordPress.org); `build.mjs` menulis ulang
`'toowl'` di semua pemanggilan `__()` dan sejenisnya.

Kenapa dua ZIP, bukan satu plugin yang dikunci: **WordPress.org melarang
"trialware"** (fitur yang ada di plugin gratis tapi dikunci sampai bayar).
Jadi ZIP gratis cuma berisi tool gratis; tool berbayar hanya ada di ZIP Pro.
Di Pro, tool `FREE` selalu jalan, sisanya terbuka sesuai kunci lisensi.

## Image optimizer (semua edisi)

Gambar dikecilkan **di browser penulis sebelum di-upload**: server cuma
menerima file kecil, tanpa API pihak ketiga, tanpa kuota. Mesinnya
`src/optimizer.ts` (kode `compress-image` dan `convert-image` situs ini),
dibundel ke `assets/dist/optimizer.js` dan baru dimuat saat ada gambar.

- `plugin/admin/optimizer.js` (JS biasa, tanpa build) memasang dua pintu:
  middleware `wp.apiFetch` untuk upload dari block editor (`POST /wp/v2/media`,
  file di FormData diganti), dan handler plupload `FilesAdded` prioritas 100
  untuk Media Library / jendela media (gambar dikeluarkan dari antrean, diproses,
  lalu `addFile` lagi; handler WordPress sendiri, prioritas 0, meng-upload
  sisanya).
- Yang diproses: JPEG, PNG, WebP, HEIC (jadi JPEG/WebP). GIF dan SVG lewat apa
  adanya. Kalau hasil malah lebih besar, file asli yang dikirim (tanpa metadata).
- `plugin/admin/image-button.js`: tombol **Compress with toowl** di toolbar block
  Image. File ukuran penuh diambil dari Media Library, dikompres, di-upload
  sebagai attachment baru (alt dan caption ikut), lalu block memakainya; yang
  lama tetap di library.
- Pengaturan di Settings → toowl: aktif/tidak, sisi terpanjang (default 1920),
  kualitas (default 82), WebP (hanya bisa dinyalakan kalau server bisa memproses
  WebP).

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
Library pihak ketiga yang ter-bundle di 72 tool semuanya kompatibel GPL: MIT /
ISC / BSD / Apache-2.0 / Zlib, MPL-2.0 (Mediabunny; boleh digabung dengan GPL),
LGPL-3.0 (libheif) dan JSZip (dipakai di bawah MIT). Apache-2.0 dan LGPL-3.0 lewat
GPLv3, yang dicakup "or later". **Sebelum menambah tool**, cek
THIRD-PARTY-NOTICES-nya: yang GPL-3.0-only (mis. LibreDWG di `dwg-to-pdf`) tidak
bisa masuk plugin GPL-2.0-or-later tanpa mengubah lisensi plugin ke GPLv3.

## Menguji

Belum ada uji otomatis. Yang dipakai saat membuat prototipe: WordPress 6.6 +
SQLite (`sqlite-database-integration`) di `php -S`, tema klasik dan tema block,
plugin gratis lalu Pro, kunci Gumroad tiruan lewat filter `pre_http_request`,
lalu Chrome headless: elemen tampil di Shadow DOM, CSS tema "nakal" tidak bocor,
dan Compress PDF benar-benar memproses file (qpdf.wasm dimuat dari folder plugin).

Optimizer diuji dengan `@wordpress/api-fetch` dan `plupload` 2 asli (dari npm)
plus `wp.Uploader` tiruan yang meniru urutan `wp-plupload.js`, meng-upload ke
REST API dan `async-upload.php` WordPress sungguhan. Build WordPress tes itu
tidak punya JS editor dan Media Library aslinya, jadi alur di Gutenberg dan
Media Library yang asli perlu dicoba sekali di WordPress sungguhan.

## Rilis ke WordPress.org

**Status (2026-11-26): ditunda.** `toowl-image-optimizer` ditolak (guideline 18,
kategori image optimization sudah penuh) dan tidak boleh disubmit ulang. Pemilik
memilih tidak lewat WordPress.org dulu: Pro dijual di Gumroad, ZIP gratis bisa
dibagikan langsung. Akun WordPress.org: `salingjaga`, kepemilikan toowl.my.id
sudah diverifikasi lewat TXT `wordpressorg-salingjaga-verification`.

```bash
node packages/_wordpress/build.mjs          # ZIP ke out/
node packages/_wordpress/wporg/render.mjs   # banner, ikon, screenshot ke out/wporg/<slug>/
```

- Pertama kali: upload ZIP `toowl-image-optimizer` atau `toowl` di
  https://wordpress.org/plugins/developers/add/ (satu plugin per antrean review).
  Setelah disetujui, WordPress.org memberi repo SVN
  `https://plugins.svn.wordpress.org/<slug>/`: isi ZIP ke `trunk/`, salin ke
  `tags/<versi>/`, dan file dari `out/wporg/<slug>/` ke `assets/` (banner, ikon,
  screenshot; bukan di dalam plugin).
- Banner dan ikon dibuat dari `wporg/art.html`; screenshot dan keterangannya
  ada di `wporg/<slug>/screenshot-N.png|txt` (keterangan otomatis masuk
  `== Screenshots ==` di readme.txt).
- `config.mjs`: `VERSION` (juga Stable tag), `TESTED_UP_TO` (naikkan setelah
  dicoba di versi WordPress terbaru), `CONTRIBUTORS` (username WordPress.org).
- Pro tidak masuk WordPress.org: ZIP-nya dilampirkan ke produk lisensi di
  Gumroad. Update Pro = pembeli mengunduh ZIP baru dari library Gumroad.

## Sebelum rilis

- Nama `toowl` di WordPress.org harus masih tersedia (slug ditentukan saat submit).
- Untuk Pro di luar WordPress.org perlu mekanisme update (Freemius, atau
  update server sendiri); prototipe ini belum punya.
- Terjemahan Indonesia untuk teks admin (`toowl.pot`) belum dibuat; judul dan
  deskripsi tool sudah dua bahasa dari registry.
- Optimizer: kompres massal untuk gambar lama di library belum ada; halaman
  `media-new.php` (uploader lama "browser") belum ikut.
- Beberapa tool di satu halaman memakai satu bahasa UI yang sama (state
  bahasa paket bersifat global), jadi `lang` berbeda per block di satu halaman
  belum didukung.
