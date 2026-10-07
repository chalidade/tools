import type { Lang } from '@/lib/i18n'
import { toolText, type Tool } from '@/tools/registry'

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
  whiteboard: [
    'Kamu bisa menulis dan menggambar bebas, di papan putih atau papan kapur.',
    'Ada pena yang mengikuti tekanan stylus, stabilo, penghapus, garis, panah, kotak, lingkaran, dan teks. Bisa banyak halaman.',
    'Papanmu tersimpan otomatis di browser ini, dan bisa diunduh sebagai PNG atau PDF.',
  ],
  'audio-recorder': [
    'Suaramu kurekam langsung dari mikrofon — bisa dijeda dan dilanjutkan kapan saja.',
    'Pilih mode suara bicara untuk rapat atau kuliah (bising diredam), atau mode asli untuk musik.',
    'Rekamannya tersimpan di browser ini, dan bisa diunduh sebagai MP3, M4A, atau WAV.',
  ],
  'screen-recorder': [
    'Layarmu kurekam — seluruh layar, satu jendela, atau satu tab — lengkap dengan suara mikrofon dan suara tab.',
    'Mau tampil seperti presenter? Nyalakan kamera melayang, wajahmu ikut terekam di pojok layar.',
    'Rekamannya tersimpan di browser ini dan bisa diunduh sebagai WebM atau diubah ke MP4. Perlu komputer — ponsel belum bisa.',
  ],
  calculator: [
    'Aku bisa menghitung apa saja — dari belanjaan sampai sinus dan logaritma.',
    'Persen-nya seperti kalkulator HP: 200 + 10% jadi 220. Koma atau titik sama-sama desimal.',
    'Hasil hitunganmu tersimpan di riwayat; klik salah satu untuk memakainya lagi.',
  ],
  notes: [
    'Tulis catatan di sini — tersimpan otomatis di browser, tanpa akun.',
    'Pakai Markdown untuk judul, daftar, dan checklist yang bisa dicentang langsung.',
    'Mau pindah perangkat? Cadangkan semua catatan ke file, lalu pulihkan di sana.',
  ],
}

/** The same lines in English. */
const DIALOG_EN: Record<string, string[]> = {
  'doc-to-pdf': [
    "Hand me a .docx and I'll turn it into a tidy PDF, ready to send.",
    'Good for letters, résumés or reports — I keep the layout as close to the original as I can.',
    "One thing: old .doc files aren't supported yet. Everything happens in your browser; nothing is uploaded.",
  ],
  'pdf-to-word': [
    'I turn a stiff PDF into a .docx you can edit again.',
    'Text, font sizes, bold and italic, fonts, tabs and even page breaks come along.',
    "Images and table lines don't come along yet, and scanned PDFs need OCR, which I can't do.",
  ],
  'image-to-pdf': [
    'JPG, PNG, WebP, GIF, BMP — lots at once — I put them all into one PDF.',
    'You set the order, rotate images, and pick A4, Letter or a page the size of each image.',
    'Sideways phone photos get straightened automatically. HEIC only opens in Safari, though.',
  ],
  'ppt-to-pdf': [
    'Every .pptx slide becomes one PDF page.',
    "Text, shapes, tables, charts and images come along. Animations, transitions and video don't.",
    "Great for sharing a deck without its look changing. Old .ppt files aren't supported yet.",
  ],
  'excel-to-pdf': [
    'I turn an .xlsx or .csv table into a PDF whose text you can still select.',
    'Colors, borders, merged cells and number, date or percent formats stay put. Hidden rows and sheets are skipped.',
    'You pick the paper, orientation, fit-to-width, and which sheets to print.',
  ],
  'pdf-to-excel': [
    'I pull the tables out of a PDF into an .xlsx.',
    'Currency, thousands, percentages and negatives in brackets become real numbers you can calculate with.',
    "Headers repeated on every page are taken once. Scanned PDFs don't work yet.",
  ],
  'pdf-to-ppt': [
    'Every PDF page becomes one .pptx slide.',
    '"Editable text" mode puts the text in text boxes where it was, with its font and color.',
    '"Exactly like the PDF" mode makes each slide an image of the page — guaranteed to look the same.',
  ],
  'pdf-to-image': [
    'I save PDF pages as PNG or JPG.',
    'At 72, 150 or 300 dpi, and you choose the pages from the previews.',
    'One page becomes one image; several pages come zipped up.',
  ],
  'compress-pdf': [
    'I slim down a PDF that has put on weight.',
    'The photos inside get smaller — Light, Medium or Strong — then I tidy the structure. Text stays text.',
    "Don't worry, the result is never bigger than your original.",
  ],
  'pdf-to-markdown': [
    'I turn a PDF into Markdown text.',
    'I spot headings by their font size, plus bold, italic, lists and tables.',
    'Tables that continue across pages are joined into one. Handy for notes or docs.',
  ],
  'protect-pdf': [
    'I lock your PDF with a password.',
    'The encryption is AES-256, and you can also restrict printing, copying and editing.',
    "Don't forget the password — I never store it anywhere.",
  ],
  'unlock-pdf': [
    'I take the password off a PDF that belongs to you.',
    'Enter the right password and you get an unlocked copy. I can remove print, copy and edit limits too.',
    "I'm no lock-picker, though — without the right password, a locked PDF stays locked.",
  ],
  'compress-video': [
    'I turn MP4, MOV, WebM or MKV into a smaller MP4.',
    'Pick Light, Medium or Strong and 1080p, 720p or 480p. I show the expected size before starting.',
    "I use your device's own encoder, so it's usually faster than the video itself. Needs a browser with WebCodecs.",
  ],
  'compress-image': [
    'I shrink lots of photos at once into JPG or WebP.',
    'You set the quality and maximum size. Metadata, GPS location included, gets removed.',
    "If a result isn't any smaller, I keep the original.",
  ],
  'compress-audio': [
    'I turn audio — or the sound from a video — into MP3, M4A or OGG.',
    'From 64 to 192 kbps, stereo or mono.',
    'Just right for oversized meeting recordings or voice notes.',
  ],
  'json-beautify': [
    'I tidy messy JSON with 2, 4 or tab indentation.',
    'I can sort the keys, and if there is a syntax error I show its line and column.',
    'Numbers and text are copied exactly — no silent rounding.',
  ],
  'json-minify': [
    'I remove every space outside strings so your JSON is as small as it gets.',
    "Numbers and text don't change one bit.",
    'Handy before pasting into a config or sending through an API.',
  ],
  'merge-pdf': [
    'I join several PDFs into one file.',
    'Just drag them into order before I merge.',
    'Great for combining attachments, scans or chapters of a report.',
  ],
  'split-pdf': [
    'I split a thick PDF into several files.',
    'Take certain pages, split by range, or break it every N pages.',
    "Your original file doesn't change — you get new files.",
  ],
  'watermark-pdf': [
    'I put a text or logo watermark on every page of your PDF.',
    'Centered or tiled, with the transparency you choose.',
    'Good for marking drafts, confidential documents or company property.',
  ],
  'sign-pdf': [
    'I place your signature on any PDF page.',
    'Draw it on screen, or upload a photo of your signature.',
    'Move and resize it freely — no printing, no scanning.',
  ],
  'crop-resize-image': [
    'I crop and resize your images.',
    'Free ratio or 1:1, 16:9, 4:5 — I can rotate and flip them too.',
    'Just right for profile pictures, thumbnails or social posts.',
  ],
  'remove-background': [
    "I remove a photo's background — no AI, you're in control.",
    'Mark it with the magic wand, color select, lasso or brush.',
    'Make it transparent, or I swap the background for a color you pick.',
  ],
  'trim-media': [
    'I trim a video or song down to the part you want.',
    'Drag the start and end markers, then save the clip.',
    'The format and quality stay the same as the original.',
  ],
  'gif-mp4': [
    'I turn a GIF into an MP4, or a video clip into a GIF.',
    'An MP4 from a GIF is usually much smaller, and looks the same.',
    'Great for memes, short demos or stickers.',
  ],
  'extract-frames': [
    'I grab video frames as full-resolution images.',
    'Pick them one by one, or automatically every N seconds.',
    'Good for thumbnails or catching the perfect moment.',
  ],
  'change-speed': [
    'I speed up or slow down video and audio, from 0.25× to 4×.',
    "The pitch stays natural — no chipmunks, no growls.",
    'Handy for lectures, tutorials or slow motion.',
  ],
  'merge-audio': [
    'I join several audio files into one.',
    'Mixed formats are fine; you set the order and the gaps between them.',
    'Good for stitching recordings together or making a playlist.',
  ],
  'qr-generator': [
    'I make QR codes for links, text, Wi-Fi, WhatsApp, contacts or email.',
    'You can change the colors, and put your logo in the middle.',
    'Save it as an image, ready to print or share.',
  ],
  'qr-reader': [
    'I read QR codes and barcodes from an image, a screenshot or the camera.',
    'Wi-Fi details, contacts and links are shown neatly.',
    'Everything is scanned on your device — nothing is sent.',
  ],
  'favicon-generator': [
    'I make favicon.ico, iOS and Android icons, plus a web manifest.',
    'From a logo, a letter or an emoji.',
    'Every size a website needs, in one download.',
  ],
  'image-to-base64': [
    'I turn an image into Base64 or a data URL — and back.',
    'Ready to paste into HTML, CSS or Markdown.',
    'Handy for small icons you want to embed straight into code.',
  ],
  'color-picker': [
    'I pick colors from an image or from your screen.',
    'I convert them to HEX, RGB, HSL or OKLCH, and check their contrast.',
    'I can build shades from your colors too.',
  ],
  whiteboard: [
    'You can write and draw freely here, on a whiteboard or a blackboard.',
    "There's a pressure-sensitive pen, highlighter, eraser, lines, arrows, boxes, circles and text — across many pages.",
    'Your board is saved in this browser, and you can download it as PNG or PDF.',
  ],
  'audio-recorder': [
    'I record your voice straight from the microphone — pause and resume anytime.',
    'Speech mode suits meetings and lectures (noise is reduced); raw mode suits music.',
    'Recordings stay in this browser, and download as MP3, M4A or WAV.',
  ],
  'screen-recorder': [
    'I record your screen — the whole screen, one window or one tab — with microphone and tab sound.',
    'Want to look like a presenter? Turn on the floating camera and your face is recorded in the corner.',
    "Recordings stay in this browser; download them as WebM or convert to MP4. Needs a computer — phones can't yet.",
  ],
  calculator: [
    'I can calculate anything — from shopping to sines and logarithms.',
    'Percent works like a phone calculator: 200 + 10% is 220.',
    'Your results go into the history; click one to use it again.',
  ],
  notes: [
    'Write notes here — saved automatically in your browser, no account needed.',
    'Use Markdown for headings, lists and checklists you can tick right in the preview.',
    'Switching devices? Back up all your notes to a file, then restore them there.',
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

export function dialogFor(tool: Tool, name: string, lang: Lang = 'id'): string[] {
  const en = lang === 'en'
  const text = toolText(tool, lang)
  const [first, ...rest] = (en ? DIALOG_EN : DIALOG)[tool.slug] ?? [
    text.description,
    en ? `It works with ${text.formats}.` : `Formatnya ${text.formats}.`,
    en ? 'Everything happens in your browser — nothing is uploaded.' : 'Semuanya kuproses di browser-mu — tidak ada yang di-upload.',
  ]
  return [
    en ? `Hi! I'm ${name}, the keeper of ${text.title} here. ${first}` : `Halo! Aku ${name}, penjaga ${text.title} di sini. ${first}`,
    ...rest,
  ]
}

/** Short calls a keeper makes when the player wanders close. */
export const CALLS: Record<Lang, string[]> = {
  id: ['Sini, sini!', 'Butuh bantuan?', 'Hai! 👋', 'Mampir dulu!', 'Aku bisa bantu!'],
  en: ['Over here!', 'Need a hand?', 'Hi! 👋', 'Drop by!', 'I can help!'],
}

/** What townsfolk say to themselves (and to whoever walks by). */
export const TOWN_LINES: Record<Lang, string[]> = {
  id: [
    'Katanya semua di sini jalan di browser, lho.',
    'Tadi aku kompres video, cepat banget.',
    'Tiap gedung isinya tools sejenis.',
    'Sudah mampir ke Lab?',
    'Nggak ada file yang di-upload. Aman.',
    'Paspor-mu sudah berapa cap?',
    'Masuk gedungnya, ngobrol sama penjaganya.',
  ],
  en: [
    'They say everything here runs in your browser.',
    'I just compressed a video — so fast.',
    'Each building holds tools of one kind.',
    'Been to the Lab yet?',
    'No file ever gets uploaded. Safe.',
    'How many stamps in your passport?',
    'Go inside and chat with the keepers.',
  ],
}
export const TOWN_GREETINGS: Record<Lang, string[]> = {
  id: ['Halo! 👋', 'Selamat datang di kota!', 'Eh, pendatang baru?', 'Hai!'],
  en: ['Hello! 👋', 'Welcome to town!', 'Oh, someone new?', 'Hi!'],
}
