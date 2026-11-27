# Chrome Web Store listing: toowl

Copy-paste text for the developer dashboard. English is the default
language; add Indonesian under **Store listing → Language: Indonesian**.

## Store listing

**Name** (from the manifest, 45 max): `toowl: PDF, Image & QR Tools (Offline)`

**Summary** (132 max, from the manifest `description`):
Compress, convert and edit images and PDFs, and make QR codes, right in your browser. Files never leave your computer.

**Category:** Tools · **Language:** English (and Indonesian)

**Description (English):**

```
toowl puts 16 everyday file tools in your browser's side panel. They run entirely on your computer: no uploads, no account, no waiting in a server queue. Works offline.

FREE
• Compress images: shrink JPG, PNG and WebP up to 90%, many at once, or hit a target size like 200 KB. GPS data is removed.
• Convert images: HEIC (iPhone photos), AVIF, WebP, PNG and JPG.
• QR code generator: links, text, Wi-Fi, WhatsApp, contacts, email. Rounded or dotted styles, your logo in the middle, PNG and SVG.
• QR & barcode reader: from an image or a pasted screenshot.

PRO (try 2 saves a day for free)
• Remove background with on-device AI, then refine with brush, lasso and wand.
• Crop & resize to exact sizes, remove photo metadata.
• Compress, merge and split PDFs.
• Images to PDF and PDF to images.
• Sign PDFs, add a watermark, add or remove a password.

RIGHT-CLICK ANYWHERE
• On a page or link: "QR code for this page".
• On selected text: turn it into a QR code.
• On an image: compress it, convert it, remove its background or read the QR code in it.

PRIVATE BY DESIGN
Your files are processed by WebAssembly and JavaScript inside the extension. Nothing is sent to a server, so it's safe for contracts, invoices, IDs and personal photos. The extension doesn't read the pages you visit.

toowl Pro is $3/month or $24/year and unlocks every Pro tool without limits. More tools (100+) are free at https://toowl.my.id
```

**Description (Indonesian):**

```
toowl menaruh 16 tool file sehari-hari di side panel browser. Semua jalan di komputermu: tanpa upload, tanpa akun, tanpa antre di server. Bisa offline.

GRATIS
• Kompres gambar: JPG, PNG, WebP lebih kecil hingga 90%, banyak sekaligus, atau atur target ukuran seperti 200 KB. Data GPS dihapus.
• Ubah format gambar: HEIC (foto iPhone), AVIF, WebP, PNG, dan JPG.
• Buat QR code: link, teks, Wi-Fi, WhatsApp, kontak, email. Gaya bulat atau titik, logo di tengah, PNG dan SVG.
• Baca QR & barcode: dari gambar atau screenshot yang ditempel.

PRO (coba gratis 2 kali simpan per hari)
• Hapus latar dengan AI di perangkat, lalu rapikan dengan kuas, laso, dan tongkat.
• Crop & resize ke ukuran pas, hapus metadata foto.
• Kompres, gabung, dan pisah PDF.
• Gambar ke PDF dan PDF ke gambar.
• Tanda tangan PDF, watermark, pasang atau buka password.

KLIK KANAN DI MANA SAJA
• Di halaman atau link: "QR code untuk halaman ini".
• Di teks yang dipilih: jadikan QR code.
• Di gambar: kompres, ubah format, hapus latar, atau baca QR di dalamnya.

PRIVASI SEJAK AWAL
File diolah oleh WebAssembly dan JavaScript di dalam ekstensi. Tidak ada yang dikirim ke server, jadi aman untuk kontrak, invoice, KTP, dan foto pribadi. Ekstensi tidak membaca halaman yang kamu buka.

toowl Pro $3/bulan atau $24/tahun, membuka semua tool Pro tanpa batas. 100+ tool lain gratis di https://toowl.my.id
```

**Graphics** (`node packages/_chrome/store/render.mjs` → `packages/_chrome/out/store/`):
- Store icon 128×128: `public/icons/128.png`
- Screenshots 1280×800: `screenshot-en-1..5.jpg` (Indonesian listing: `screenshot-id-1..5.jpg`)
- Small promo tile 440×280: `promo-small-440x280.png`
- Marquee promo tile 1400×560: `promo-marquee-1400x560.png`

**Official URL / Homepage:** https://toowl.my.id/
**Support URL:** https://github.com/chalidade/tools/issues

## Privacy practices

**Single purpose:**
Process files (images, PDFs) and create or read QR codes locally in the browser, from a side panel and the right-click menu.

**Permission justifications:**
- `sidePanel`: The tools open in Chrome's side panel so they stay open while the user picks files and waits for results.
- `contextMenus`: Adds the "toowl" right-click menu to send the current page, a link, selected text or an image to a tool (QR code, compress, convert, remove background).
- `storage`: Saves the user's language and theme, the daily count of free Pro saves, the license key, and hands a right-click job from the service worker to the side panel.
- Host permission `https://api.gumroad.com/*`, `https://api.lemonsqueezy.com/*`: Verifies a toowl Pro license key the user enters, at activation and at most once a week. Only the key is sent.
- Optional host permission `<all_urls>`: Requested at runtime for one site only, and only when the user right-clicks an image on a site that blocks cross-origin reads, so the side panel can fetch that image. Not granted at install.
- Remote code: **No.** All JavaScript and WebAssembly ship inside the package. `wasm-unsafe-eval` is in the CSP to run the bundled WebAssembly (PDF engine qpdf, image codecs, QR reader, background-removal model).

**Data usage** (check only):
- Authentication information: **no** (a license key is not a login; leave unchecked) — if the reviewer disagrees, check *Authentication information* and note "license key, sent only to the store that issued it".
- Website content: **no** (only the right-clicked image/link, processed locally, never transmitted).
- Everything else: **no**.
- Certify: not sold to third parties, not used for unrelated purposes, not used for creditworthiness.

**Privacy policy URL:** https://toowl.my.id/privacy/ (section "Chrome extension")
