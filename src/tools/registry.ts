import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import {
  FileArchive,
  FileCode,
  FileImage,
  FileLock,
  FileSpreadsheet,
  FileText,
  FileType,
  Images,
  LockOpen,
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
  /** Lazy so each tool's libraries load only when that tool is opened. */
  component: LazyExoticComponent<ComponentType>
}

// Adding a tool: create src/tools/<slug>/ with a default-exported component,
// then add one entry here. Nothing else needs to change.
export const TOOLS: Tool[] = [
  {
    slug: 'doc-to-pdf',
    title: 'Word ke PDF',
    description: 'Ubah dokumen Word (.docx) jadi PDF, langsung unduh.',
    icon: FileText,
    formats: 'DOCX → PDF',
    component: lazy(() => import('./doc-to-pdf/DocToPdf')),
  },
  {
    slug: 'pdf-to-word',
    title: 'PDF ke Word',
    description: 'Ambil teks dari PDF jadi dokumen Word (.docx) yang bisa diedit.',
    icon: FileType,
    formats: 'PDF → DOCX',
    component: lazy(() => import('./pdf-to-word/PdfToWord')),
  },
  {
    slug: 'image-to-pdf',
    title: 'Gambar ke PDF',
    description: 'Gabungkan foto dan gambar jadi satu PDF — atur urutan, putar, dan pilih ukuran kertas.',
    icon: Images,
    formats: 'JPG / PNG → PDF',
    component: lazy(() => import('./image-to-pdf/ImageToPdf')),
  },
  {
    slug: 'ppt-to-pdf',
    title: 'PowerPoint ke PDF',
    description: 'Ubah presentasi PowerPoint (.pptx) jadi PDF, satu halaman per slide.',
    icon: Presentation,
    formats: 'PPTX → PDF',
    component: lazy(() => import('./ppt-to-pdf/PptToPdf')),
  },
  {
    slug: 'excel-to-pdf',
    title: 'Excel ke PDF',
    description: 'Ubah spreadsheet Excel (.xlsx) atau CSV jadi PDF tabel yang rapi, lengkap dengan warna dan format angka.',
    icon: FileSpreadsheet,
    formats: 'XLSX / CSV → PDF',
    component: lazy(() => import('./excel-to-pdf/ExcelToPdf')),
  },
  {
    slug: 'pdf-to-excel',
    title: 'PDF ke Excel',
    description: 'Ambil tabel dari PDF jadi spreadsheet Excel (.xlsx) — angka langsung bisa dihitung.',
    icon: Sheet,
    formats: 'PDF → XLSX',
    component: lazy(() => import('./pdf-to-excel/PdfToExcel')),
  },
  {
    slug: 'pdf-to-ppt',
    title: 'PDF ke PowerPoint',
    description: 'Ubah tiap halaman PDF jadi slide PowerPoint (.pptx) — teksnya tetap bisa diedit.',
    icon: MonitorPlay,
    formats: 'PDF → PPTX',
    component: lazy(() => import('./pdf-to-ppt/PdfToPpt')),
  },
  {
    slug: 'pdf-to-image',
    title: 'PDF ke Gambar',
    description: 'Simpan halaman PDF sebagai gambar PNG atau JPG, hingga 300 dpi.',
    icon: FileImage,
    formats: 'PDF → PNG / JPG',
    badge: 'Baru',
    component: lazy(() => import('./pdf-to-image/PdfToImage')),
  },
  {
    slug: 'compress-pdf',
    title: 'Kompres PDF',
    description: 'Perkecil ukuran PDF dengan mengecilkan foto di dalamnya — teks tetap tajam.',
    icon: FileArchive,
    formats: 'PDF → PDF',
    badge: 'Baru',
    component: lazy(() => import('./compress-pdf/CompressPdf')),
  },
  {
    slug: 'pdf-to-markdown',
    title: 'PDF ke Markdown',
    description: 'Ambil isi PDF jadi Markdown: judul, tebal/miring, daftar, dan tabel.',
    icon: FileCode,
    formats: 'PDF → MD',
    badge: 'Baru',
    component: lazy(() => import('./pdf-to-markdown/PdfToMarkdown')),
  },
  {
    slug: 'protect-pdf',
    title: 'Proteksi PDF',
    description: 'Kunci PDF dengan password (AES-256) dan batasi cetak, salin, atau ubah.',
    icon: FileLock,
    formats: 'PDF → PDF + password',
    badge: 'Baru',
    component: lazy(() => import('./protect-pdf/ProtectPdf')),
  },
  {
    slug: 'unlock-pdf',
    title: 'Buka Proteksi PDF',
    description: 'Hapus password atau batasan dari PDF milikmu.',
    icon: LockOpen,
    formats: 'PDF + password → PDF',
    badge: 'Baru',
    component: lazy(() => import('./unlock-pdf/UnlockPdf')),
  },
]

export function findTool(slug: string) {
  return TOOLS.find((t) => t.slug === slug)
}
