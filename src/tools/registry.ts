import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import {
  Braces,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileLock,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  ImageDown,
  Images,
  LockOpen,
  Minimize2,
  MonitorPlay,
  Presentation,
  Sheet,
  type LucideIcon,
} from 'lucide-react'

export interface Tool {
  /** URL segment: the tool lives at #/<slug>. */
  slug: string
  title: string
  description: string
  icon: LucideIcon
  /** Accepted input → produced output, shown as chips on the card. */
  formats: string
  /** Optional short label on the card, e.g. "Baru". */
  badge?: string
  /** Which group the tool is listed under on the home page. */
  category: CategoryId
  /** Extra words people search with (file extensions, everyday terms). */
  keywords: string[]
  /** Lazy so each tool's libraries load only when that tool is opened. */
  component: LazyExoticComponent<ComponentType>
}

export type CategoryId = 'to-pdf' | 'from-pdf' | 'pdf' | 'media' | 'dev'

/** Home page groups, in display order. */
export const CATEGORIES: { id: CategoryId; title: string; description: string }[] = [
  { id: 'to-pdf', title: 'Ke PDF', description: 'Dokumen, presentasi, spreadsheet, dan gambar jadi PDF.' },
  {
    id: 'from-pdf',
    title: 'Dari PDF',
    description: 'Ambil isi PDF ke Word, Excel, PowerPoint, gambar, atau Markdown.',
  },
  { id: 'pdf', title: 'Olah & Amankan PDF', description: 'Perkecil, kunci, dan buka kunci PDF.' },
  { id: 'media', title: 'Gambar & Media', description: 'Perkecil foto, video, dan audio.' },
  { id: 'dev', title: 'Developer', description: 'Rapikan dan padatkan data.' },
]

// Adding a tool: create src/tools/<slug>/ with a default-exported component,
// then add one entry here (with its category). Nothing else needs to change.
export const TOOLS: Tool[] = [
  {
    slug: 'doc-to-pdf',
    category: 'to-pdf',
    keywords: ['word', 'docx', 'doc', 'dokumen', 'surat', 'cv', 'konversi'],
    title: 'Word ke PDF',
    description: 'Ubah dokumen Word (.docx) jadi PDF, langsung unduh.',
    icon: FileText,
    formats: 'DOCX → PDF',
    component: lazy(() => import('./doc-to-pdf/DocToPdf')),
  },
  {
    slug: 'pdf-to-word',
    category: 'from-pdf',
    keywords: ['word', 'docx', 'edit', 'ubah', 'dokumen', 'konversi'],
    title: 'PDF ke Word',
    description: 'Ambil teks dari PDF jadi dokumen Word (.docx) yang bisa diedit.',
    icon: FileType,
    formats: 'PDF → DOCX',
    component: lazy(() => import('./pdf-to-word/PdfToWord')),
  },
  {
    slug: 'image-to-pdf',
    category: 'to-pdf',
    keywords: ['foto', 'gambar', 'jpg', 'jpeg', 'png', 'webp', 'scan', 'gabung', 'konversi'],
    title: 'Gambar ke PDF',
    description: 'Gabungkan foto dan gambar jadi satu PDF — atur urutan, putar, dan pilih ukuran kertas.',
    icon: Images,
    formats: 'JPG / PNG → PDF',
    component: lazy(() => import('./image-to-pdf/ImageToPdf')),
  },
  {
    slug: 'ppt-to-pdf',
    category: 'to-pdf',
    keywords: ['powerpoint', 'pptx', 'ppt', 'presentasi', 'slide', 'konversi'],
    title: 'PowerPoint ke PDF',
    description: 'Ubah presentasi PowerPoint (.pptx) jadi PDF, satu halaman per slide.',
    icon: Presentation,
    formats: 'PPTX → PDF',
    component: lazy(() => import('./ppt-to-pdf/PptToPdf')),
  },
  {
    slug: 'excel-to-pdf',
    category: 'to-pdf',
    keywords: ['excel', 'xlsx', 'xls', 'csv', 'spreadsheet', 'tabel', 'laporan', 'konversi'],
    title: 'Excel ke PDF',
    description:
      'Ubah spreadsheet Excel (.xlsx) atau CSV jadi PDF tabel yang rapi, lengkap dengan warna dan format angka.',
    icon: FileSpreadsheet,
    formats: 'XLSX / CSV → PDF',
    component: lazy(() => import('./excel-to-pdf/ExcelToPdf')),
  },
  {
    slug: 'pdf-to-excel',
    category: 'from-pdf',
    keywords: ['excel', 'xlsx', 'spreadsheet', 'tabel', 'csv', 'data', 'konversi'],
    title: 'PDF ke Excel',
    description: 'Ambil tabel dari PDF jadi spreadsheet Excel (.xlsx) — angka langsung bisa dihitung.',
    icon: Sheet,
    formats: 'PDF → XLSX',
    component: lazy(() => import('./pdf-to-excel/PdfToExcel')),
  },
  {
    slug: 'pdf-to-ppt',
    category: 'from-pdf',
    keywords: ['powerpoint', 'pptx', 'presentasi', 'slide', 'konversi'],
    title: 'PDF ke PowerPoint',
    description: 'Ubah tiap halaman PDF jadi slide PowerPoint (.pptx) — teksnya tetap bisa diedit.',
    icon: MonitorPlay,
    formats: 'PDF → PPTX',
    component: lazy(() => import('./pdf-to-ppt/PdfToPpt')),
  },
  {
    slug: 'pdf-to-image',
    category: 'from-pdf',
    keywords: ['gambar', 'foto', 'png', 'jpg', 'jpeg', 'screenshot', 'konversi'],
    title: 'PDF ke Gambar',
    description: 'Simpan halaman PDF sebagai gambar PNG atau JPG, hingga 300 dpi.',
    icon: FileImage,
    formats: 'PDF → PNG / JPG',
    component: lazy(() => import('./pdf-to-image/PdfToImage')),
  },
  {
    slug: 'compress-pdf',
    category: 'pdf',
    keywords: ['kompres', 'perkecil', 'kecilkan', 'ukuran', 'ringan', 'compress', 'optimasi'],
    title: 'Kompres PDF',
    description: 'Perkecil ukuran PDF dengan mengecilkan foto di dalamnya — teks tetap tajam.',
    icon: FileArchive,
    formats: 'PDF → PDF',
    component: lazy(() => import('./compress-pdf/CompressPdf')),
  },
  {
    slug: 'pdf-to-markdown',
    category: 'from-pdf',
    keywords: ['markdown', 'md', 'teks', 'text', 'notion', 'obsidian', 'konversi'],
    title: 'PDF ke Markdown',
    description: 'Ambil isi PDF jadi Markdown: judul, tebal/miring, daftar, dan tabel.',
    icon: FileCode,
    formats: 'PDF → MD',
    component: lazy(() => import('./pdf-to-markdown/PdfToMarkdown')),
  },
  {
    slug: 'protect-pdf',
    category: 'pdf',
    keywords: ['password', 'kunci', 'sandi', 'enkripsi', 'encrypt', 'aman', 'lock'],
    title: 'Proteksi PDF',
    description: 'Kunci PDF dengan password (AES-256) dan batasi cetak, salin, atau ubah.',
    icon: FileLock,
    formats: 'PDF → PDF + password',
    component: lazy(() => import('./protect-pdf/ProtectPdf')),
  },
  {
    slug: 'unlock-pdf',
    category: 'pdf',
    keywords: ['password', 'buka', 'sandi', 'dekripsi', 'decrypt', 'unlock', 'hapus password'],
    title: 'Buka Proteksi PDF',
    description: 'Hapus password atau batasan dari PDF milikmu.',
    icon: LockOpen,
    formats: 'PDF + password → PDF',
    component: lazy(() => import('./unlock-pdf/UnlockPdf')),
  },
  {
    slug: 'compress-video',
    category: 'media',
    keywords: ['video', 'mp4', 'mov', 'webm', 'kompres', 'perkecil', 'kecilkan', 'whatsapp', 'compress'],
    title: 'Kompres Video',
    description: 'Perkecil ukuran video dengan encoder bawaan perangkat — cepat, tanpa upload.',
    icon: FileVideo,
    formats: 'MP4 / MOV / WebM → MP4',
    badge: 'Baru',
    component: lazy(() => import('./compress-video/CompressVideo')),
  },
  {
    slug: 'compress-image',
    category: 'media',
    keywords: [
      'foto',
      'gambar',
      'jpg',
      'jpeg',
      'png',
      'webp',
      'kompres',
      'perkecil',
      'kecilkan',
      'resize',
      'compress',
      'exif',
    ],
    title: 'Kompres Gambar',
    description: 'Perkecil foto dan gambar sekaligus banyak — JPG atau WebP, metadata GPS ikut dihapus.',
    icon: ImageDown,
    formats: 'JPG / PNG / WebP → JPG / WebP',
    badge: 'Baru',
    component: lazy(() => import('./compress-image/CompressImage')),
  },
  {
    slug: 'compress-audio',
    category: 'media',
    keywords: [
      'audio',
      'musik',
      'lagu',
      'mp3',
      'm4a',
      'aac',
      'opus',
      'ogg',
      'wav',
      'podcast',
      'suara',
      'kompres',
      'perkecil',
      'compress',
      'ekstrak',
    ],
    title: 'Kompres Audio',
    description: 'Perkecil file audio ke MP3, AAC, atau Opus — bisa juga mengambil suara dari video.',
    icon: FileAudio,
    formats: 'Audio / Video → MP3 / M4A / OGG',
    badge: 'Baru',
    component: lazy(() => import('./compress-audio/CompressAudio')),
  },
  {
    slug: 'json-beautify',
    category: 'dev',
    keywords: ['json', 'format', 'rapikan', 'pretty', 'beautify', 'indent', 'validasi', 'validator'],
    title: 'JSON Beautifier',
    description: 'Rapikan JSON dengan indentasi, urutkan key, dan temukan kesalahan sintaks beserta posisinya.',
    icon: Braces,
    formats: 'JSON → JSON rapi',
    badge: 'Baru',
    component: lazy(() => import('./json/JsonBeautify')),
  },
  {
    slug: 'json-minify',
    category: 'dev',
    keywords: ['json', 'minify', 'padatkan', 'kecilkan', 'compress'],
    title: 'JSON Minify',
    description: 'Padatkan JSON jadi satu baris tanpa spasi — angka dan teks tidak berubah sedikit pun.',
    icon: Minimize2,
    formats: 'JSON → JSON ringkas',
    badge: 'Baru',
    component: lazy(() => import('./json/JsonMinify')),
  },
]

export function findTool(slug: string) {
  return TOOLS.find((t) => t.slug === slug)
}
