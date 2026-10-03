import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { FileText, FileType, Images, type LucideIcon } from 'lucide-react'

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
    badge: 'Baru',
    component: lazy(() => import('./image-to-pdf/ImageToPdf')),
  },
]

export function findTool(slug: string) {
  return TOOLS.find((t) => t.slug === slug)
}
