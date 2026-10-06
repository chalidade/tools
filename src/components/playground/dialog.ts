import type { Tool } from '@/tools/registry'

/**
 * What each tool's keeper says when the player talks to it, after
 * introducing itself: what the tool is for, what it keeps, and what to watch
 * out for — one string per dialog page. A tool without an entry here explains
 * itself from its registry fields.
 */
const DIALOG: Record<string, string[]> = {
  'doc-to-pdf': [
    'Kasih aku dokumen .docx, nanti kuubah jadi PDF yang rapi dan siap dikirim.',
    'Cocok untuk surat, CV, atau laporan — tata letaknya kujaga semirip mungkin dengan aslinya.',
    'Catatan kecil: file .doc lama belum bisa, ya. Semuanya kuproses di browser-mu, tidak ada yang di-upload.',
  ],
  'pdf-to-word': [
    'PDF yang kaku kuubah jadi .docx yang bisa kamu edit lagi.',
    'Teks, ukuran huruf, tebal dan miring, font, tab, sampai pemisah halaman ikut terbawa.',
    'Gambar dan garis tabel belum ikut, dan PDF hasil scan belum bisa karena butuh OCR.',
  ],
  'image-to-pdf': [
    'JPG, PNG, WebP, GIF, BMP — banyak sekaligus — kujadikan satu PDF.',
    'Urutannya bisa kamu atur, gambar bisa diputar, dan kertasnya A4, Letter, atau seukuran gambar.',
    'Foto ponsel yang miring otomatis kuluruskan. HEIC hanya terbaca di Safari, ya.',
  ],
  'ppt-to-pdf': [
    'Setiap slide .pptx jadi satu halaman PDF.',
    'Teks, bentuk, tabel, grafik, dan gambar ikut. Animasi, transisi, dan video tidak.',
    'Pas untuk membagikan materi presentasi tanpa takut tampilannya berubah. File .ppt lama belum didukung.',
  ],
  'excel-to-pdf': [
    'Tabel .xlsx atau .csv kuubah jadi PDF yang teksnya tetap bisa diseleksi.',
    'Warna, border, sel gabungan, dan format angka, tanggal, atau persen tetap terjaga. Baris dan sheet tersembunyi kulewati.',
    'Kamu bisa pilih kertas, orientasi, muat-ke-lebar, dan sheet mana yang dicetak.',
  ],
  'pdf-to-excel': [
    'Tabel di dalam PDF kutarik keluar jadi .xlsx.',
    'Rp, ribuan, persen, atau angka negatif dalam kurung jadi angka sungguhan yang bisa dihitung.',
    'Header yang berulang tiap halaman cukup kuambil sekali. PDF hasil scan belum bisa, ya.',
  ],
  'pdf-to-ppt': [
    'Setiap halaman PDF jadi satu slide .pptx.',
    'Mode "teks bisa diedit" menaruh teks sebagai kotak teks di posisi aslinya, lengkap dengan font dan warnanya.',
    'Mode "persis seperti PDF" menjadikan tiap slide gambar halaman — tampilannya dijamin sama.',
  ],
  'pdf-to-image': [
    'Halaman PDF kusimpan jadi PNG atau JPG.',
    'Resolusinya 72, 150, atau 300 dpi, dan kamu pilih sendiri halamannya lewat pratinjau.',
    'Satu halaman jadi satu gambar; beberapa halaman kubungkus jadi ZIP.',
  ],
  'compress-pdf': [
    'PDF yang kegendutan kubuat lebih ramping.',
    'Foto di dalamnya kuperkecil — Ringan, Sedang, atau Kuat — lalu strukturnya kurapikan. Teks tetap teks.',
    'Tenang, hasilnya tidak akan pernah lebih besar dari file aslimu.',
  ],
  'pdf-to-markdown': [
    'Isi PDF kuubah jadi teks Markdown.',
    'Judul kukenali dari ukuran huruf, plus tebal, miring, daftar, dan tabel.',
    'Tabel yang bersambung antar-halaman kugabung jadi satu. Pas untuk catatan atau dokumentasi.',
  ],
  'protect-pdf': [
    'Kukunci PDF-mu dengan password.',
    'Enkripsinya AES-256, dan kamu juga bisa membatasi izin cetak, salin, dan ubah.',
    'Jangan lupa password-nya — aku tidak menyimpannya di mana pun.',
  ],
  'unlock-pdf': [
    'Kulepas password dari PDF milikmu sendiri.',
    'Masukkan password yang benar, dan kamu dapat salinan tanpa kunci. Batasan cetak, salin, dan ubah juga bisa kuhapus.',
    'Aku bukan pembobol, ya — tanpa password yang benar, PDF terkunci tetap terkunci.',
  ],
  'compress-video': [
    'MP4, MOV, WebM, atau MKV kujadikan MP4 yang lebih kecil.',
    'Pilih kualitas Ringan, Sedang, atau Kuat dan resolusi 1080p, 720p, atau 480p. Perkiraan ukurannya kutunjukkan sebelum mulai.',
    'Aku memakai encoder bawaan perangkatmu, jadi biasanya lebih cepat dari durasi videonya. Butuh browser dengan WebCodecs.',
  ],
  'compress-image': [
    'Banyak foto sekaligus kuperkecil jadi JPG atau WebP.',
    'Kualitas dan ukuran maksimumnya bisa kamu atur. Metadata, termasuk lokasi GPS, kuhapus.',
    'Kalau hasilnya tidak lebih kecil, file aslinya yang kusimpan.',
  ],
  'compress-audio': [
    'Audio — atau suara dari video — kujadikan MP3, M4A, atau OGG.',
    'Bitrate-nya 64 sampai 192 kbps, stereo atau mono.',
    'Pas untuk rekaman rapat atau voice note yang kebesaran.',
  ],
  'json-beautify': [
    'JSON yang berantakan kurapikan dengan indentasi 2, 4, atau tab.',
    'Key bisa kuurutkan, dan kalau ada salah sintaks kutunjukkan baris dan kolomnya.',
    'Angka dan teks kusalin persis — tidak ada pembulatan diam-diam.',
  ],
  'json-minify': [
    'Semua spasi di luar teks kubuang supaya JSON-mu sekecil mungkin.',
    'Angka dan teks tidak berubah sedikit pun.',
    'Pas sebelum ditempel ke konfigurasi atau dikirim lewat API.',
  ],
  'merge-pdf': [
    'Beberapa PDF kusatukan jadi satu file.',
    'Urutannya tinggal kamu atur dengan seret, sebelum kugabung.',
    'Pas untuk menyatukan lampiran, scan, atau bab-bab laporan.',
  ],
  'split-pdf': [
    'PDF yang tebal kupecah jadi beberapa file.',
    'Ambil halaman tertentu, pisah per rentang, atau pecah tiap N halaman.',
    'File aslimu tidak berubah — hasilnya file-file baru.',
  ],
  'watermark-pdf': [
    'Kupasang watermark teks atau logo di semua halaman PDF-mu.',
    'Bisa di tengah atau berulang, dengan transparansi yang kamu atur.',
    'Cocok untuk menandai draf, dokumen rahasia, atau milik perusahaan.',
  ],
  'sign-pdf': [
    'Tanda tanganmu kutempel ke halaman PDF mana pun.',
    'Gambar langsung di layar, atau unggah foto tanda tanganmu.',
    'Posisi dan ukurannya bebas kamu geser — tanpa cetak, tanpa scan.',
  ],
  'crop-resize-image': [
    'Gambarmu kupotong dan kuubah ukurannya.',
    'Rasio bebas atau 1:1, 16:9, 4:5 — bisa juga diputar dan dibalik.',
    'Pas untuk foto profil, thumbnail, atau postingan media sosial.',
  ],
  'remove-background': [
    'Latar foto kuhapus — tanpa AI, kamu yang pegang kendali.',
    'Pakai tongkat ajaib, pilih warna, lasso, atau kuas untuk menandainya.',
    'Hasilnya transparan, atau latarnya kuganti dengan warna pilihanmu.',
  ],
  'trim-media': [
    'Video atau lagu kupotong, ambil bagian yang kamu mau saja.',
    'Geser penanda awal dan akhir, lalu simpan potongannya.',
    'Format dan kualitasnya tetap seperti aslinya.',
  ],
  'gif-mp4': [
    'GIF kuubah jadi MP4, atau potongan video jadi GIF.',
    'MP4 dari GIF biasanya jauh lebih kecil, tapi tampilannya sama.',
    'Pas untuk meme, demo singkat, atau stiker.',
  ],
  'extract-frames': [
    'Frame video kuambil sebagai gambar beresolusi asli.',
    'Pilih satu per satu, atau otomatis setiap N detik.',
    'Cocok untuk thumbnail atau mengambil momen yang pas.',
  ],
  'change-speed': [
    'Video dan audio kupercepat atau kuperlambat, dari 0,25× sampai 4×.',
    'Nada suaranya tetap normal — tidak jadi cempreng atau berat.',
    'Pas untuk rekaman kuliah, tutorial, atau slow motion.',
  ],
  'merge-audio': [
    'Beberapa file audio kusatukan jadi satu.',
    'Formatnya boleh beda; urutan dan jeda di antaranya bisa kamu atur.',
    'Cocok untuk menyambung rekaman atau membuat playlist.',
  ],
  'qr-generator': [
    'Kubuatkan QR code untuk tautan, teks, Wi-Fi, WhatsApp, kontak, atau email.',
    'Warnanya bisa kamu ganti, dan logomu bisa ditaruh di tengah.',
    'Simpan sebagai gambar dan siap dicetak atau dibagikan.',
  ],
  'qr-reader': [
    'QR code dan barcode kubaca dari gambar, screenshot, atau kamera.',
    'Isi Wi-Fi, kontak, dan tautan kutampilkan dengan rapi.',
    'Semuanya dipindai di perangkatmu — tidak ada yang dikirim.',
  ],
  'favicon-generator': [
    'Kubuatkan favicon.ico, ikon iOS dan Android, plus web manifest.',
    'Sumbernya bisa logo, huruf, atau emoji.',
    'Semua ukuran yang dibutuhkan situs web, sekali unduh.',
  ],
  'image-to-base64': [
    'Gambar kuubah jadi Base64 atau data URL — dan sebaliknya.',
    'Siap tempel di HTML, CSS, atau Markdown.',
    'Pas untuk ikon kecil yang mau disematkan langsung ke kode.',
  ],
  'color-picker': [
    'Warna kuambil dari gambar atau dari layar.',
    'Kuubah ke HEX, RGB, HSL, atau OKLCH, dan kontrasnya kucek.',
    'Bisa juga membuat gradasi dari warna-warna pilihanmu.',
  ],
}

/** Keeper names, in tool order; a tool past the end borrows one by its slug. */
const NAMES = [
  'Raka', 'Sinta', 'Bayu', 'Putri', 'Dimas', 'Ayu', 'Fajar', 'Nadia', 'Rizky',
  'Laras', 'Yoga', 'Citra', 'Andi', 'Maya', 'Galih', 'Intan', 'Bima', 'Wulan',
  'Arif', 'Dewi', 'Hendra', 'Lestari', 'Joko', 'Ratna', 'Eko', 'Fitri', 'Gilang',
  'Kartika', 'Lukman', 'Melati', 'Nanda', 'Okta', 'Pandu', 'Rini', 'Satria', 'Tiara',
]

export function nameFor(tool: Tool, index: number) {
  if (index < NAMES.length) return NAMES[index]
  let h = 0
  for (const c of tool.slug) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return NAMES[h % NAMES.length]
}

export function dialogFor(tool: Tool, name: string): string[] {
  const [first, ...rest] = DIALOG[tool.slug] ?? [
    tool.description,
    `Formatnya ${tool.formats}.`,
    'Semuanya kuproses di browser-mu — tidak ada yang di-upload.',
  ]
  return [`Halo! Aku ${name}, penjaga ${tool.title} di sini. ${first}`, ...rest]
}

/** Short calls a keeper makes when the player wanders close. */
export const CALLS = ['Sini, sini!', 'Butuh bantuan?', 'Hai! 👋', 'Mampir dulu!', 'Aku bisa bantu!']

/** What townsfolk say to themselves (and to whoever walks by). */
export const TOWN_LINES = [
  'Katanya semua di sini jalan di browser, lho.',
  'Tadi aku kompres video, cepat banget.',
  'Tiap rumah isinya tools sejenis.',
  'Sudah mampir ke rumah Developer?',
  'Nggak ada file yang di-upload. Aman.',
  'Paspor-mu sudah berapa cap?',
  'Masuk rumahnya, ngobrol sama penjaganya.',
]
export const TOWN_GREETINGS = ['Halo! 👋', 'Selamat datang di kota!', 'Eh, pendatang baru?', 'Hai!']
