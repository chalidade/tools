import { lazy, Suspense, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { useT } from '@/lib/i18n'

// One reader for four formats. Each tool page (PDF, Word, Excel, PowerPoint)
// leads with its own format, but any of them opens whatever file is dropped,
// so a visitor never has to go looking for the right page. Everything is read
// in the browser; each format's libraries load only when such a file opens.

export type DocKind = 'pdf' | 'docx' | 'xlsx' | 'pptx'

const PdfView = lazy(() => import('./PdfView'))
const DocxView = lazy(() => import('./DocxView'))
const SheetView = lazy(() => import('./SheetView'))
const SlidesView = lazy(() => import('./SlidesView'))

const ACCEPT: Record<DocKind, string> = {
  pdf: '.pdf,application/pdf',
  docx: '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: '.xlsx,.xlsm,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: '.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

const LABEL: Record<DocKind, [string, string]> = {
  pdf: ['Tarik file PDF ke sini', 'Drag a PDF here'],
  docx: ['Tarik file Word (.docx) ke sini', 'Drag a Word file (.docx) here'],
  xlsx: ['Tarik file Excel (.xlsx) atau CSV ke sini', 'Drag an Excel file (.xlsx) or CSV here'],
  pptx: ['Tarik file PowerPoint (.pptx) ke sini', 'Drag a PowerPoint file (.pptx) here'],
}

type Detected = { kind: DocKind } | { legacy: 'doc' | 'xls' | 'ppt' } | null

function detect(file: File): Detected {
  const name = file.name.toLowerCase()
  const ext = name.slice(name.lastIndexOf('.') + 1)
  if (ext === 'pdf' || file.type === 'application/pdf') return { kind: 'pdf' }
  if (ext === 'docx' || file.type.includes('wordprocessingml')) return { kind: 'docx' }
  if (ext === 'xlsx' || ext === 'xlsm' || ext === 'csv' || file.type === 'text/csv' || file.type.includes('spreadsheetml')) return { kind: 'xlsx' }
  if (ext === 'pptx' || file.type.includes('presentationml')) return { kind: 'pptx' }
  if (ext === 'doc' || ext === 'xls' || ext === 'ppt') return { legacy: ext }
  return null
}

export function Reader({ kind }: { kind: DocKind }) {
  const t = useT()
  const [opened, setOpened] = useState<{ file: File; kind: DocKind } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function open(file: File) {
    const found = detect(file)
    if (found && 'kind' in found) {
      setError(null)
      setOpened({ file, kind: found.kind })
      return
    }
    if (found) {
      const [app, modern] = { doc: ['Word', '.docx'], xls: ['Excel', '.xlsx'], ppt: ['PowerPoint', '.pptx'] }[found.legacy]
      setError(
        t(
          `Format .${found.legacy} lama (${app} 97–2003) belum bisa dibuka. Simpan ulang sebagai ${modern} di ${app} atau LibreOffice, lalu coba lagi.`,
          `The old .${found.legacy} format (${app} 97–2003) can't be opened yet. Save it again as ${modern} in ${app} or LibreOffice, then try again.`,
        ),
      )
      return
    }
    setError(
      t(
        'Format ini belum didukung. Pilih file PDF, Word (.docx), Excel (.xlsx/.csv), atau PowerPoint (.pptx).',
        "This format isn't supported. Choose a PDF, Word (.docx), Excel (.xlsx/.csv) or PowerPoint (.pptx) file.",
      ),
    )
  }

  const reset = () => setOpened(null)

  if (opened) {
    const props = { file: opened.file, onReset: reset }
    return (
      <Suspense
        fallback={
          <div className="flex items-center gap-2 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t(`Membuka ${opened.file.name}…`, `Opening ${opened.file.name}…`)}
          </div>
        }
      >
        {/* key: a new file always starts a fresh viewer. */}
        {opened.kind === 'pdf' && <PdfView key={opened.file.name + opened.file.lastModified} {...props} />}
        {opened.kind === 'docx' && <DocxView key={opened.file.name + opened.file.lastModified} {...props} />}
        {opened.kind === 'xlsx' && <SheetView key={opened.file.name + opened.file.lastModified} {...props} />}
        {opened.kind === 'pptx' && <SlidesView key={opened.file.name + opened.file.lastModified} {...props} />}
      </Suspense>
    )
  }

  // The page's own format first, then the others it also opens.
  const accept = [kind, ...(['pdf', 'docx', 'xlsx', 'pptx'] as const).filter((k) => k !== kind)].map((k) => ACCEPT[k]).join(',')

  return (
    <div className="space-y-4">
      <FileDrop accept={accept} label={t(...LABEL[kind])} onFiles={([f]) => open(f)} />
      {error && <ErrorNote message={error} />}
      <p className="text-center text-xs text-muted-foreground">
        {t(
          'Bisa juga membuka PDF, Word, Excel, dan PowerPoint — file dibaca di perangkatmu, tidak di-upload.',
          'Also opens PDF, Word, Excel and PowerPoint files — read on your device, never uploaded.',
        )}
      </p>
    </div>
  )
}
