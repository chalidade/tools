// Search copy for the tools people actually look for (Cloudflare analytics,
// Nov 2026): a page title in the words people type into Google, and extra
// questions answered under the tool and as FAQPage JSON-LD. Kept apart from
// the registry so the registry stays about what a tool is, and this file about
// how it is found. Read only through src/lib/seo.ts.
//
// `title` replaces the generated "<Tool> Online Gratis…" part of <title>;
// " | toowl" is still added. Keep it under ~60 characters and
// make every answer true for the tool as it is today.

import type { Lang } from '@/lib/i18n'

type Faq = { q: string; a: string }
type Copy = { title?: string; faq?: Faq[] }

export const SEO_COPY: Record<string, Partial<Record<Lang, Copy>>> = {
  'pas-foto': {
    id: {
      title: 'Buat Pas Foto 3x4, 4x6, 2x3 Online Gratis — Latar Merah/Biru',
      faq: [
        { q: 'Bagaimana cara membuat pas foto 3x4 di HP?', a: 'Pilih foto wajah, pilih ukuran 3×4, geser foto supaya wajah pas di tengah, pilih warna latar, lalu unduh satu foto atau lembar cetak 4R/A4. Semua jalan di browser HP, tanpa aplikasi.' },
        { q: 'Bisa ganti latar pas foto jadi merah atau biru?', a: 'Bisa. Pilih Merah, Biru, atau Putih; geser Toleransi latar sampai latar lama hilang rapi. Hasil paling bagus kalau latar foto aslinya polos dan terang.' },
        { q: 'Berapa banyak pas foto dalam satu kertas 4R?', a: 'Tergantung ukurannya; atur Jumlah dan alat ini menyusun sebanyak yang muat di kertas 4R atau A4, siap dibawa ke tempat cetak foto.' },
        { q: 'Apakah foto saya di-upload?', a: 'Tidak. Foto diproses di perangkatmu sendiri dan tidak dikirim ke server mana pun.' },
      ],
    },
    en: {
      title: 'ID & Passport Photo Maker Online — Free, No Upload',
      faq: [
        { q: 'How do I make a passport-style photo on my phone?', a: 'Pick a face photo, choose the size, drag the photo so the face sits in the middle, pick a background colour and download one photo or a 4R/A4 print sheet. It all runs in the phone’s browser.' },
        { q: 'Can I change the background to white, blue or red?', a: 'Yes. Pick the colour and raise the backdrop tolerance until the old background is gone. It works best when the original background is plain and bright.' },
        { q: 'Is my photo uploaded?', a: 'No. The photo is processed on your device and never sent to a server.' },
      ],
    },
  },
  'remove-background': {
    id: {
      title: 'Hapus Background Foto Online Gratis — Jadi PNG Transparan',
      faq: [
        { q: 'Bagaimana cara menghapus background foto?', a: 'Buka fotonya dan ketuk hapus otomatis: AI di perangkatmu memisahkan objek dari latar. Rapikan pinggirnya dengan kuas, tongkat ajaib, atau lasso, lalu simpan sebagai PNG transparan.' },
        { q: 'Bisa ganti background jadi putih atau di-blur?', a: 'Bisa. Setelah latar terpisah, pilih transparan, warna polos (misalnya putih untuk foto produk), atau blur latar seperti mode potret.' },
        { q: 'Apakah gratis dan tanpa watermark?', a: 'Ya, gratis, tanpa akun, dan hasilnya tanpa watermark dengan resolusi penuh.' },
        { q: 'Apakah foto saya dikirim ke server?', a: 'Tidak. Model AI diunduh sekali lalu berjalan di browsermu; foto tidak pernah meninggalkan perangkat.' },
      ],
    },
    en: {
      title: 'Remove Background from Image Free — Transparent PNG',
      faq: [
        { q: 'How do I remove a background from a photo?', a: 'Open the photo and tap automatic removal: an AI model running on your device separates the subject. Touch up the edge with the brush, magic wand or lasso, then save a transparent PNG.' },
        { q: 'Is it free with no watermark?', a: 'Yes — free, no account, full resolution and no watermark.' },
        { q: 'Is my photo sent to a server?', a: 'No. The AI model is downloaded once and runs in your browser; the photo never leaves your device.' },
      ],
    },
  },
  'remove-object': {
    id: { title: 'Hapus Objek & Orang di Foto Online Gratis — AI, Tanpa Upload' },
    en: { title: 'Remove Objects & People from Photos Free — AI, No Upload' },
  },
  'compress-pdf': {
    id: {
      title: 'Kompres PDF Online Gratis — Perkecil Ukuran PDF Tanpa Upload',
      faq: [
        { q: 'Bagaimana cara memperkecil ukuran file PDF?', a: 'Pilih PDF-nya, pilih tingkat kompresi, lalu tekan Kompres. Foto di dalam PDF dikecilkan sementara teks tetap tajam, lalu ukuran sebelum dan sesudah ditampilkan.' },
        { q: 'Bagaimana supaya PDF di bawah 1 MB atau 500 KB untuk upload lamaran/CPNS?', a: 'Pakai tingkat kompresi paling kuat. PDF hasil scan atau berisi banyak foto biasanya turun drastis; kalau masih terlalu besar, pisahkan halamannya dengan Pisah PDF.' },
        { q: 'Apakah kompres PDF di sini aman untuk dokumen pribadi?', a: 'Aman. File tidak di-upload ke mana pun; seluruh proses berjalan di browsermu.' },
      ],
    },
    en: {
      title: 'Compress PDF Online Free — Reduce PDF Size, No Upload',
      faq: [
        { q: 'How do I reduce a PDF’s file size?', a: 'Pick the PDF, choose a compression level and press Compress. Images inside are shrunk while text stays sharp, and the size before and after is shown.' },
        { q: 'Is it safe for private documents?', a: 'Yes. The file is never uploaded; everything runs in your browser.' },
      ],
    },
  },
  'panggilan-palsu': {
    id: {
      title: 'Panggilan Palsu (Fake Call) Online — Telepon Masuk Pura-pura',
      faq: [
        { q: 'Apa itu panggilan palsu (fake call)?', a: 'Layar telepon masuk tiruan dengan nama penelepon, nada dering, dan getar. Berguna untuk keluar dari situasi canggung atau saat merasa tidak aman.' },
        { q: 'Bisa diatur supaya berdering beberapa menit lagi?', a: 'Bisa. Isi nama penelepon, pilih berdering langsung atau dalam beberapa detik/menit, lalu biarkan halaman tetap terbuka sampai berdering.' },
        { q: 'Perlu install aplikasi?', a: 'Tidak. Cukup buka di browser HP; bisa juga dipasang ke layar utama supaya cepat dibuka.' },
      ],
    },
    en: {
      title: 'Fake Call Online — Fake Incoming Call Screen, Free',
      faq: [
        { q: 'What is a fake call?', a: 'A mock incoming-call screen with a caller name, ringtone and vibration — a polite way out of an awkward or unsafe situation.' },
        { q: 'Can I set it to ring later?', a: 'Yes. Enter the caller name, pick now or a delay in seconds/minutes, and keep the page open until it rings.' },
      ],
    },
  },
  'compress-video': {
    id: {
      title: 'Kompres Video Online Gratis — Perkecil MP4 Tanpa Upload',
      faq: [
        { q: 'Bagaimana cara memperkecil ukuran video untuk WhatsApp?', a: 'Pilih videonya, pilih kualitas atau resolusi yang lebih kecil, lalu simpan. Video diproses dengan encoder bawaan perangkatmu, jadi cepat dan tidak perlu upload.' },
        { q: 'Apakah kualitas video turun?', a: 'Sedikit, tergantung pilihanmu. Menurunkan resolusi ke 720p biasanya memperkecil file banyak tanpa terlihat buram di layar HP.' },
        { q: 'Apakah video saya di-upload?', a: 'Tidak. Video tidak pernah meninggalkan perangkatmu.' },
      ],
    },
    en: {
      title: 'Compress Video Online Free — Make MP4 Smaller, No Upload',
      faq: [
        { q: 'How do I make a video smaller to send?', a: 'Pick the video, choose a lower quality or resolution and save. It uses your device’s own encoder, so it is fast and nothing is uploaded.' },
        { q: 'Is my video uploaded?', a: 'No. The video never leaves your device.' },
      ],
    },
  },
  'compress-image': {
    id: {
      title: 'Kompres Foto Online ke 100KB, 200KB, 500KB — Gratis',
      faq: [
        { q: 'Bagaimana cara kompres foto jadi di bawah 200 KB?', a: 'Pilih fotonya, lalu di Batas ukuran file pilih 200 KB (atau ketik angka sendiri). Kualitas diturunkan otomatis sampai file muat di batas itu.' },
        { q: 'Bisa kompres banyak foto sekaligus?', a: 'Bisa. Tarik beberapa foto sekaligus, lalu unduh satu per satu atau semuanya dalam satu ZIP.' },
        { q: 'Apakah data lokasi (GPS) di foto ikut terhapus?', a: 'Ya. Metadata seperti lokasi GPS dibuang saat foto dikompres.' },
      ],
    },
    en: {
      title: 'Compress Images Online to 100KB, 200KB — Free, No Upload',
      faq: [
        { q: 'How do I compress a photo under 200 KB?', a: 'Pick the photo, then set the file size limit to 200 KB (or type your own). Quality is lowered automatically until it fits.' },
        { q: 'Can I compress many photos at once?', a: 'Yes. Drop several photos and download them one by one or together as a ZIP.' },
      ],
    },
  },
  'pdf-to-word': {
    id: {
      title: 'PDF ke Word Online Gratis — Ubah PDF jadi DOCX Bisa Diedit',
      faq: [
        { q: 'Bagaimana mengubah PDF ke Word supaya bisa diedit?', a: 'Pilih PDF-nya dan unduh hasil .docx. Teks, ukuran huruf, tebal/miring, dan posisi dipertahankan supaya tampilannya mirip aslinya dan bisa diedit di Word atau Google Docs.' },
        { q: 'Bisa untuk PDF hasil scan?', a: 'PDF hasil scan berisi gambar, bukan teks. Ambil teksnya dulu dengan OCR — Foto ke Teks, lalu tempel ke Word.' },
        { q: 'Apakah file saya di-upload?', a: 'Tidak. Konversi berjalan di browsermu.' },
      ],
    },
    en: {
      title: 'PDF to Word Converter Online Free — Editable DOCX',
      faq: [
        { q: 'How do I convert a PDF to an editable Word file?', a: 'Pick the PDF and download the .docx. Text, sizes, bold/italic and positions are kept so it looks like the original and can be edited in Word or Google Docs.' },
        { q: 'Does it work on scanned PDFs?', a: 'A scanned PDF holds pictures, not text. Pull the text out with OCR first.' },
      ],
    },
  },
  'qr-generator': {
    id: {
      title: 'Buat QR Code Gratis — Link, WiFi, WhatsApp, Pakai Logo',
      faq: [
        { q: 'Bagaimana cara membuat QR code untuk link?', a: 'Pilih jenis Tautan, tempel alamatnya, atur warna atau logo bila perlu, lalu unduh PNG atau SVG. QR code ini statis dan tidak pernah kedaluwarsa.' },
        { q: 'Bisa buat QR code WiFi?', a: 'Bisa. Pilih Wi-Fi, isi nama jaringan dan kata sandi; tamu cukup memindai untuk tersambung.' },
        { q: 'Apakah QR code-nya gratis selamanya?', a: 'Ya. Isinya tertanam langsung di gambar QR, bukan lewat server kami, jadi tetap bisa dipindai selamanya.' },
      ],
    },
    en: {
      title: 'Free QR Code Generator — Link, Wi-Fi, WhatsApp, With Logo',
      faq: [
        { q: 'Do these QR codes expire?', a: 'No. The content is encoded straight into the image, not routed through our server, so it scans forever.' },
        { q: 'Can I make a Wi-Fi QR code?', a: 'Yes. Pick Wi-Fi, enter the network name and password; guests just scan to join.' },
      ],
    },
  },
  'merge-pdf': {
    id: {
      title: 'Gabung PDF Online Gratis — Satukan File PDF Tanpa Upload',
      faq: [
        { q: 'Bagaimana cara menggabungkan beberapa PDF jadi satu?', a: 'Pilih semua PDF-nya, seret untuk mengatur urutan, lalu unduh hasilnya sebagai satu file PDF.' },
        { q: 'Apakah ada batas jumlah file?', a: 'Tidak ada batas dari kami; batasnya hanya memori perangkatmu.' },
      ],
    },
    en: { title: 'Merge PDF Online Free — Combine PDF Files, No Upload' },
  },
  'doc-to-pdf': {
    id: { title: 'Word ke PDF Online Gratis — Ubah DOCX jadi PDF Tanpa Upload' },
    en: { title: 'Word to PDF Converter Online Free — DOCX to PDF' },
  },
  'image-to-pdf': {
    id: { title: 'JPG ke PDF Online Gratis — Gabungkan Foto jadi Satu PDF' },
    en: { title: 'JPG to PDF Online Free — Combine Images into One PDF' },
  },
  'jadwal-sholat': {
    id: { title: 'Jadwal Sholat Hari Ini & Sebulan — Metode Kemenag, Semua Kota' },
    en: { title: 'Prayer Times Today & Monthly Timetable — Any City' },
  },
  cicilan: {
    id: {
      title: 'Kalkulator Cicilan Pinjaman — Simulasi Kredit Flat & Anuitas',
      faq: [
        { q: 'Apa beda bunga flat dan anuitas?', a: 'Bunga flat dihitung dari pokok awal selama tenor, jadi angsurannya sama dan totalnya lebih mahal. Anuitas (efektif) menghitung bunga dari sisa pokok; angsuran juga sama, tetapi porsi bunganya turun tiap bulan.' },
        { q: 'Bunga flat 1% per bulan itu setara berapa bunga efektif?', a: 'Kira-kira 1,8% per bulan untuk tenor 12 bulan. Coba isi kedua jenis bunga di kalkulator ini dan bandingkan total bunganya.' },
        { q: 'Untuk simulasi KPR pakai yang mana?', a: 'Pakai Simulasi KPR: ada uang muka, bunga fix beberapa tahun lalu floating, dan perkiraan biaya awal.' },
      ],
    },
    en: { title: 'Loan Calculator — Monthly Payment & Amortization Schedule' },
  },
  kpr: {
    id: { title: 'Simulasi KPR Online — Hitung Cicilan Rumah, DP & Bunga Floating' },
    en: { title: 'Mortgage Calculator — Monthly Payment, Fixed to Variable Rate' },
  },
  'gaji-bersih': {
    id: { title: 'Kalkulator Gaji Bersih — Hitung PPh 21, BPJS, Take Home Pay' },
    en: { title: 'Indonesia Take-Home Pay Calculator — PPh 21 & BPJS' },
  },
}

export function seoCopy(slug: string, lang: Lang): Copy | undefined {
  return SEO_COPY[slug]?.[lang]
}
