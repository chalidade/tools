// toowl's paid Apify Actors (apify/ in this repo): the same engines run on a
// server, for people who need thousands of files through an API, Zapier, Make
// or n8n. Links carry the Apify affiliate token, so a visitor who signs up to
// Apify from here is credited to toowl. Plain links only — nothing on the site
// talks to Apify.
//
// An Actor is linked only once it is published on the Apify Store (`published`);
// until then its page is private and would 404 for visitors. /api/ (ApiPage)
// lists the published ones; scripts/seo.mjs writes the same list into the
// static page.

export const APIFY_REF = 'toowl'
export const APIFY_USER = 'toowl'

type Pair = readonly [id: string, en: string]

export interface ApifyActor {
  /** Unique name on Apify: apify.com/toowl/<name> */
  name: string
  published: boolean
  title: Pair
  blurb: Pair
  /** Price per event in USD and what one event is. */
  price: number
  unit: Pair
  /** The site's free browser tools doing the same job, first = main one. */
  tools: string[]
}

/** Every Actor, in the order /api/ shows them. */
export const APIFY_CATALOG: ApifyActor[] = [
  {
    name: 'pdf-to-markdown',
    published: true,
    title: ['PDF ke Markdown untuk LLM & RAG', 'PDF to Markdown for LLM & RAG'],
    blurb: [
      'Judul, daftar dan tabel tetap terstruktur. Siap untuk chunking, embedding dan prompt.',
      'Headings, lists and tables kept as structure. Ready for chunking, embeddings and prompts.',
    ],
    price: 0.001,
    unit: ['halaman', 'page'],
    tools: ['pdf-to-markdown'],
  },
  {
    name: 'ocr-image-pdf-to-text',
    published: true,
    title: ['OCR: gambar & PDF scan ke teks', 'OCR: image & scanned PDF to text'],
    blurb: [
      '8 bahasa, termasuk Indonesia. Halaman PDF yang sudah punya teks dibaca langsung tanpa OCR.',
      '8 languages. PDF pages that already have text are read directly, without OCR.',
    ],
    price: 0.002,
    unit: ['halaman', 'page'],
    tools: ['ocr', 'scan'],
  },
  {
    name: 'pdf-to-word-excel',
    published: false,
    title: ['PDF ke Word & Excel', 'PDF to Word & Excel'],
    blurb: [
      'DOCX yang bisa diedit (font, tebal/miring tetap) dan XLSX dengan tabel jadi sel, angka dan tanggal jadi nilai asli.',
      'Editable DOCX (fonts, bold/italic kept) and XLSX with tables in cells, numbers and dates as real values.',
    ],
    price: 0.002,
    unit: ['halaman', 'page'],
    tools: ['pdf-to-word', 'pdf-to-excel'],
  },
  {
    name: 'html-to-pdf',
    published: false,
    title: ['HTML, URL & Markdown ke PDF', 'HTML, URL & Markdown to PDF'],
    blurb: [
      'Chrome asli: halaman web, HTML atau Markdown jadi PDF, plus satu template HTML diisi data untuk ratusan invoice atau sertifikat.',
      'Real Chrome: web pages, HTML or Markdown to PDF, plus one HTML template filled from data for hundreds of invoices or certificates.',
    ],
    price: 0.003,
    unit: ['PDF', 'PDF'],
    tools: ['markdown-to-pdf'],
  },
  {
    name: 'pdf-password-protect',
    published: false,
    title: ['Kunci & buka password PDF', 'PDF Password Protect & Unlock'],
    blurb: [
      'AES-256, password berbeda per file (slip gaji, tagihan), larang cetak/salin/edit. Atau buka PDF yang password-nya kamu tahu.',
      'AES-256, a different password per file (payslips, statements), block print/copy/edit. Or unlock PDFs you have the password for.',
    ],
    price: 0.002,
    unit: ['PDF', 'PDF'],
    tools: ['protect-pdf', 'unlock-pdf'],
  },
  {
    name: 'office-converter',
    published: false,
    title: ['Word, Excel & PowerPoint ke PDF', 'Word, Excel & PowerPoint to PDF'],
    blurb: [
      'DOCX, XLSX, PPTX, DOC, ODT, RTF, CSV ke PDF atau PDF/A, juga DOC ke DOCX dan Excel ke CSV per sheet.',
      'DOCX, XLSX, PPTX, DOC, ODT, RTF, CSV to PDF or PDF/A, plus DOC to DOCX and Excel to CSV per sheet.',
    ],
    price: 0.005,
    unit: ['dokumen', 'document'],
    tools: ['doc-to-pdf', 'excel-to-pdf', 'ppt-to-pdf'],
  },
  {
    name: 'pdf-compressor',
    published: false,
    title: ['Kompres PDF (teks tetap teks)', 'PDF Compressor (keeps text)'],
    blurb: [
      'Gambar di dalam PDF dikecilkan, teks dan link tidak disentuh. Tidak pernah lebih besar dari aslinya.',
      'Shrinks the pictures inside, leaves text and links alone. Never bigger than the original.',
    ],
    price: 0.005,
    unit: ['PDF', 'PDF'],
    tools: ['compress-pdf'],
  },
  {
    name: 'pdf-toolkit',
    published: false,
    title: ['PDF Toolkit: gabung, pisah, putar', 'PDF Toolkit: merge, split, rotate'],
    blurb: [
      'Gabung banyak PDF, pisah per halaman atau rentang, ambil/hapus halaman, putar, buka kunci.',
      'Merge PDFs, split by page or range, extract or delete pages, rotate, unlock.',
    ],
    price: 0.002,
    unit: ['PDF', 'PDF'],
    tools: ['merge-pdf', 'split-pdf', 'organize-pdf', 'unlock-pdf'],
  },
  {
    name: 'pdf-to-image',
    published: false,
    title: ['PDF ke JPG, PNG & WebP', 'PDF to JPG, PNG & WebP'],
    blurb: [
      'Tiap halaman jadi gambar, 36–600 DPI atau ukuran tetap untuk thumbnail, ZIP per PDF.',
      'Every page as an image, 36–600 DPI or a fixed size for thumbnails, a ZIP per PDF.',
    ],
    price: 0.001,
    unit: ['halaman', 'page'],
    tools: ['pdf-to-image'],
  },
  {
    name: 'image-compressor',
    published: false,
    title: ['Kompres gambar (alternatif TinyPNG)', 'Image Compressor (TinyPNG alternative)'],
    blurb: [
      'JPG, PNG, WebP, AVIF, HEIC. Target ukuran KB, batas lebar, tidak pernah lebih besar dari aslinya.',
      'JPG, PNG, WebP, AVIF, HEIC. Target size in KB, max width, never bigger than the original.',
    ],
    price: 0.001,
    unit: ['gambar', 'image'],
    tools: ['compress-image'],
  },
  {
    name: 'image-converter',
    published: true,
    title: ['Ubah format & ukuran gambar', 'Image Converter & Resizer'],
    blurb: [
      'HEIC, AVIF, WebP, PNG, JPG, TIFF, GIF, SVG. Resize, crop, rotasi EXIF, metadata dibuang.',
      'HEIC, AVIF, WebP, PNG, JPG, TIFF, GIF, SVG. Resize, crop, EXIF rotation, metadata stripped.',
    ],
    price: 0.0015,
    unit: ['gambar', 'image'],
    tools: ['convert-image', 'crop-resize-image'],
  },
  {
    name: 'background-remover',
    published: false,
    title: ['Hapus latar belakang (AI)', 'AI Background Remover'],
    blurb: [
      'PNG transparan atau latar putih untuk marketplace, crop ke objek. Model IS-Net.',
      'Transparent PNG or a white background for marketplaces, crop to the subject. IS-Net model.',
    ],
    price: 0.01,
    unit: ['gambar', 'image'],
    tools: ['remove-background'],
  },
  {
    name: 'ai-image-upscaler',
    published: true,
    title: ['Perbesar gambar AI (Real-ESRGAN)', 'AI Image Upscaler (Real-ESRGAN)'],
    blurb: ['Perbesar 2× atau 4× dengan detail yang dipertajam, bukan sekadar diregang.', 'Upscale 2× or 4× with restored detail, not just stretched pixels.'],
    price: 0.02,
    unit: ['gambar', 'image'],
    tools: ['upscale-image'],
  },
  {
    name: 'image-to-svg',
    published: false,
    title: ['Gambar ke SVG (vektor)', 'Image to SVG Vectorizer'],
    blurb: [
      'Logo, ikon, tanda tangan dan line art jadi vektor. Warna atau hitam-putih untuk Cricut dan laser.',
      'Logos, icons, signatures and line art as vectors. Colour, or black and white for Cricut and lasers.',
    ],
    price: 0.005,
    unit: ['gambar', 'image'],
    tools: ['image-to-svg'],
  },
  {
    name: 'qr-barcode-reader',
    published: true,
    title: ['Baca QR & barcode', 'QR Code & Barcode Reader'],
    blurb: ['QR, EAN, UPC, Code 128, DataMatrix, PDF417 dan lainnya, beberapa kode per gambar.', 'QR, EAN, UPC, Code 128, DataMatrix, PDF417 and more, several codes per image.'],
    price: 0.001,
    unit: ['gambar', 'image'],
    tools: ['qr-reader'],
  },
  {
    name: 'image-to-pdf',
    published: false,
    title: ['Gambar ke PDF', 'Image to PDF'],
    blurb: [
      'Banyak foto atau scan jadi satu PDF (atau satu PDF per gambar): A4/Letter/ukuran gambar, orientasi otomatis, rotasi EXIF.',
      'Many photos or scans into one PDF (or one per image): A4/Letter/fit, auto orientation, EXIF rotation.',
    ],
    price: 0.001,
    unit: ['gambar', 'image'],
    tools: ['image-to-pdf'],
  },
  {
    name: 'watermark-images',
    published: false,
    title: ['Watermark foto massal', 'Bulk Image Watermark'],
    blurb: [
      'Logo atau teks di pojok, tengah atau pola miring berulang. Sekalian resize dan hapus data EXIF/GPS.',
      'Logo or text in a corner, the centre or a tiled diagonal pattern. Resizes and strips EXIF/GPS in the same pass.',
    ],
    price: 0.001,
    unit: ['gambar', 'image'],
    tools: ['watermark-foto'],
  },
  {
    name: 'qr-code-generator',
    published: false,
    title: ['Buat QR code massal', 'QR Code Generator'],
    blurb: ['Ribuan QR sekaligus: PNG atau SVG, warna, gaya bulat/titik, logo di tengah, satu ZIP.', 'Thousands at once: PNG or SVG, colours, rounded or dot style, logo in the middle, one ZIP.'],
    price: 0.001,
    unit: ['QR code', 'QR code'],
    tools: ['qr-generator'],
  },
  {
    name: 'barcode-generator',
    published: false,
    title: ['Buat barcode massal', 'Barcode Generator'],
    blurb: ['EAN-13, UPC, Code 128, ITF-14, GS1-128, Data Matrix dan lainnya. Check digit dicek, PNG atau SVG.', 'EAN-13, UPC, Code 128, ITF-14, GS1-128, Data Matrix and more. Check digits validated, PNG or SVG.'],
    price: 0.001,
    unit: ['barcode', 'barcode'],
    tools: ['barcode'],
  },
  {
    name: 'favicon-generator',
    published: false,
    title: ['Buat favicon lengkap', 'Favicon Generator'],
    blurb: ['Dari logo jadi favicon.ico, ikon Apple, Android/PWA, maskable dan site.webmanifest.', 'From a logo to favicon.ico, Apple, Android/PWA and maskable icons plus site.webmanifest.'],
    price: 0.01,
    unit: ['set ikon', 'icon set'],
    tools: ['favicon-generator'],
  },
  {
    name: 'video-compressor',
    published: false,
    title: ['Kompres & ubah video', 'Video Compressor & Converter'],
    blurb: ['MP4, WebM, MOV, MKV, GIF. 1080p sampai 360p, potong durasi, tanpa suara.', 'MP4, WebM, MOV, MKV, GIF. 1080p down to 360p, trim, mute.'],
    price: 0.03,
    unit: ['menit video', 'video minute'],
    tools: ['compress-video', 'gif-mp4'],
  },
  {
    name: 'video-frame-extractor',
    published: false,
    title: ['Ambil frame & thumbnail video', 'Video Frame Extractor & Thumbnails'],
    blurb: ['Per N detik, N thumbnail rata, timestamp tertentu, atau tiap ganti adegan.', 'Every N seconds, N even thumbnails, exact timestamps, or every scene change.'],
    price: 0.003,
    unit: ['video', 'video'],
    tools: ['extract-frames'],
  },
  {
    name: 'audio-converter',
    published: false,
    title: ['Ubah format audio', 'Audio Converter'],
    blurb: ['MP3, M4A, WAV, OGG, Opus, FLAC. Normalisasi loudness, potong, fade, buang hening.', 'MP3, M4A, WAV, OGG, Opus, FLAC. Loudness normalisation, trim, fades, silence removal.'],
    price: 0.002,
    unit: ['file', 'file'],
    tools: ['compress-audio'],
  },
]

const BY_NAME = new Map(APIFY_CATALOG.map((a) => [a.name, a]))

/** Tool slug → its Actor (the catalogue's tools, plus tools that share an engine). */
export const APIFY_ACTORS: Record<string, ApifyActor> = Object.fromEntries(
  APIFY_CATALOG.flatMap((a) => a.tools.map((slug) => [slug, a] as const)),
)
// Until the Image Compressor is out, compressing images goes to the converter.
if (!BY_NAME.get('image-compressor')!.published) APIFY_ACTORS['compress-image'] = BY_NAME.get('image-converter')!

const withRef = (url: string) => `${url}${url.includes('?') ? '&' : '?'}fpr=${APIFY_REF}`

/** An Actor's Store page, with the affiliate token. */
export const actorPageUrl = (a: ApifyActor) => withRef(`https://apify.com/${APIFY_USER}/${a.name}`)

/** The tool's Actor page (with the affiliate token), or null when it has none yet. */
export function apifyActorUrl(slug: string): string | null {
  const actor = APIFY_ACTORS[slug]
  return actor?.published ? actorPageUrl(actor) : null
}

/** Published Actors, for /api/. */
export const publishedActors = () => APIFY_CATALOG.filter((a) => a.published)

/** "$1 / 1,000 pages" style price. */
export function perThousand(a: ApifyActor, lang: 'id' | 'en'): string {
  const v = a.price * 1000
  const money = `$${Number.isInteger(v) ? v : v.toFixed(2)}`
  return lang === 'en' ? `${money} / 1,000 ${a.unit[1]}s` : `${money} / 1.000 ${a.unit[0]}`
}

/** All of toowl's Actors on Apify, once at least one is published. */
export function apifyProfileUrl(): string | null {
  return publishedActors().length ? withRef(`https://apify.com/${APIFY_USER}`) : null
}
