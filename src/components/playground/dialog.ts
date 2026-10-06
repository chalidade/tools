import type { Tool } from '@/tools/registry'

/**
 * What each tool's character says when the player talks to it: who it is,
 * what it is for, and what to watch out for — one string per dialog page.
 * A tool without an entry here introduces itself from its registry fields.
 */
const DIALOG: Record<string, string[]> = {
  'doc-to-pdf': [
    'Halo! Aku Word ke PDF. Kasih aku dokumen .docx, nanti kuubah jadi PDF yang rapi dan siap dikirim.',
    'Cocok untuk surat, CV, atau laporan — tata letaknya kujaga semirip mungkin dengan aslinya.',
    'Catatan kecil: file .doc lama belum bisa, ya. Semuanya kuproses di browser-mu, tidak ada yang di-upload.',
  ],
  'pdf-to-word': [
    'Hai! Aku PDF ke Word. PDF yang kaku kuubah jadi .docx yang bisa kamu edit lagi.',
    'Teks, ukuran huruf, tebal dan miring, font, tab, sampai pemisah halaman ikut terbawa.',
    'Gambar dan garis tabel belum ikut, dan PDF hasil scan belum bisa karena butuh OCR.',
  ],
  'image-to-pdf': [
    'Halo, aku Gambar ke PDF! JPG, PNG, WebP, GIF, BMP — banyak sekaligus — kujadikan satu PDF.',
    'Urutannya bisa kamu atur, gambar bisa diputar, dan kertasnya A4, Letter, atau seukuran gambar.',
    'Foto ponsel yang miring otomatis kuluruskan. HEIC hanya terbaca di Safari, ya.',
  ],
  'ppt-to-pdf': [
    'Selamat datang! Aku PowerPoint ke PDF. Setiap slide .pptx jadi satu halaman PDF.',
    'Teks, bentuk, tabel, grafik, dan gambar ikut. Animasi, transisi, dan video tidak.',
    'Pas untuk membagikan materi presentasi tanpa takut tampilannya berubah. File .ppt lama belum didukung.',
  ],
  'excel-to-pdf': [
    'Hai! Aku Excel ke PDF. Tabel .xlsx atau .csv kuubah jadi PDF yang teksnya tetap bisa diseleksi.',
    'Warna, border, sel gabungan, dan format angka, tanggal, atau persen tetap terjaga. Baris dan sheet tersembunyi kulewati.',
    'Kamu bisa pilih kertas, orientasi, muat-ke-lebar, dan sheet mana yang dicetak.',
  ],
  'pdf-to-excel': [
    'Halo! Aku PDF ke Excel. Tabel di dalam PDF kutarik keluar jadi .xlsx.',
    'Rp, ribuan, persen, atau angka negatif dalam kurung jadi angka sungguhan yang bisa dihitung.',
    'Header yang berulang tiap halaman cukup kuambil sekali. PDF hasil scan belum bisa, ya.',
  ],
  'pdf-to-ppt': [
    'Hai, aku PDF ke PowerPoint! Setiap halaman PDF jadi satu slide .pptx.',
    'Mode "teks bisa diedit" menaruh teks sebagai kotak teks di posisi aslinya, lengkap dengan font dan warnanya.',
    'Mode "persis seperti PDF" menjadikan tiap slide gambar halaman — tampilannya dijamin sama.',
  ],
  'pdf-to-image': [
    'Halo! Aku PDF ke Gambar. Halaman PDF kusimpan jadi PNG atau JPG.',
    'Resolusinya 72, 150, atau 300 dpi, dan kamu pilih sendiri halamannya lewat pratinjau.',
    'Satu halaman jadi satu gambar; beberapa halaman kubungkus jadi ZIP.',
  ],
  'compress-pdf': [
    'Hai! Aku Kompres PDF. PDF yang kegendutan kubuat lebih ramping.',
    'Foto di dalamnya kuperkecil — Ringan, Sedang, atau Kuat — lalu strukturnya kurapikan. Teks tetap teks.',
    'Tenang, hasilnya tidak akan pernah lebih besar dari file aslimu.',
  ],
  'pdf-to-markdown': [
    'Halo, aku PDF ke Markdown! Isi PDF kuubah jadi teks Markdown.',
    'Judul kukenali dari ukuran huruf, plus tebal, miring, daftar, dan tabel.',
    'Tabel yang bersambung antar-halaman kugabung jadi satu. Pas untuk catatan atau dokumentasi.',
  ],
  'protect-pdf': [
    'Psst… aku Proteksi PDF. Kukunci PDF-mu dengan password.',
    'Enkripsinya AES-256, dan kamu juga bisa membatasi izin cetak, salin, dan ubah.',
    'Jangan lupa password-nya — aku tidak menyimpannya di mana pun.',
  ],
  'unlock-pdf': [
    'Halo! Aku Buka Proteksi PDF. Kulepas password dari PDF milikmu sendiri.',
    'Masukkan password yang benar, dan kamu dapat salinan tanpa kunci. Batasan cetak, salin, dan ubah juga bisa kuhapus.',
    'Aku bukan pembobol, ya — tanpa password yang benar, PDF terkunci tetap terkunci.',
  ],
  'compress-video': [
    'Hai! Aku Kompres Video. MP4, MOV, WebM, atau MKV kujadikan MP4 yang lebih kecil.',
    'Pilih kualitas Ringan, Sedang, atau Kuat dan resolusi 1080p, 720p, atau 480p. Perkiraan ukurannya kutunjukkan sebelum mulai.',
    'Aku memakai encoder bawaan perangkatmu, jadi biasanya lebih cepat dari durasi videonya. Butuh browser dengan WebCodecs.',
  ],
  'compress-image': [
    'Halo! Aku Kompres Gambar. Banyak foto sekaligus kuperkecil jadi JPG atau WebP.',
    'Kualitas dan ukuran maksimumnya bisa kamu atur. Metadata, termasuk lokasi GPS, kuhapus.',
    'Kalau hasilnya tidak lebih kecil, file aslinya yang kusimpan.',
  ],
  'compress-audio': [
    'Hai! Aku Kompres Audio. Audio — atau suara dari video — kujadikan MP3, M4A, atau OGG.',
    'Bitrate-nya 64 sampai 192 kbps, stereo atau mono.',
    'Pas untuk rekaman rapat atau voice note yang kebesaran.',
  ],
  'json-beautify': [
    'Halo, developer! Aku JSON Beautifier. JSON yang berantakan kurapikan dengan indentasi 2, 4, atau tab.',
    'Key bisa kuurutkan, dan kalau ada salah sintaks kutunjukkan baris dan kolomnya.',
    'Angka dan teks kusalin persis — tidak ada pembulatan diam-diam.',
  ],
  'json-minify': [
    'Hai! Aku JSON Minify. Semua spasi di luar teks kubuang supaya JSON-mu sekecil mungkin.',
    'Angka dan teks tidak berubah sedikit pun.',
    'Pas sebelum ditempel ke konfigurasi atau dikirim lewat API.',
  ],
}

export function dialogFor(tool: Tool): string[] {
  return (
    DIALOG[tool.slug] ?? [
      `Halo! Aku ${tool.title}.`,
      tool.description,
      `Formatku ${tool.formats}, dan semuanya kuproses di browser-mu.`,
    ]
  )
}

/** Short calls a character makes when the player wanders close. */
export const CALLS = ['Sini, sini!', 'Butuh bantuan?', 'Hai! 👋', 'Mampir dulu!', 'Aku bisa bantu!']

/** The colour of a tool's character, from the file type it is about. */
const TYPE_COLORS: Record<string, string> = {
  DOCX: '#3b82f6',
  JPG: '#14b8a6',
  PNG: '#14b8a6',
  PPTX: '#f97316',
  XLSX: '#22c55e',
  MD: '#64748b',
  MP4: '#ec4899',
  AUDIO: '#a855f7',
  JSON: '#eab308',
  PDF: '#ef4444',
}

export function colorFor(tool: Tool) {
  const types = tool.formats.toUpperCase().match(/[A-Z0-9]+/g) ?? []
  const type = types.find((t) => t !== 'PDF' && TYPE_COLORS[t]) ?? 'PDF'
  return TYPE_COLORS[type]
}
