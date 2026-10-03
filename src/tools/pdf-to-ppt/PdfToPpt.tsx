import { useState } from 'react'
import { Download, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { buildPptx, LockedPdfError, readPdfPages, type SlideMode, type SlidePage } from './convert'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; pages: SlidePage[] }
  | { kind: 'error'; message: string }

const MODE_OPTIONS: { value: SlideMode; label: string }[] = [
  { value: 'editable', label: 'Teks bisa diedit' },
  { value: 'image', label: 'Persis seperti PDF' },
]

export default function PdfToPpt() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<SlideMode>('editable')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: 'Pilih file berformat .pdf.' })
      return
    }
    setFile(next)
    setError(null)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const pages = await readPdfPages(next, (done, total) => setStatus({ kind: 'reading', done, total }))
      setStatus({ kind: 'ready', pages })
    } catch (e) {
      setStatus({
        kind: 'error',
        message:
          e instanceof LockedPdfError
            ? 'PDF ini dikunci password. Buka kuncinya dulu, lalu coba lagi.'
            : 'PDF tidak bisa dibaca. Pastikan filenya tidak rusak.',
      })
    }
  }

  async function download(pages: SlidePage[]) {
    if (!file) return
    setSaving(true)
    setError(null)
    try {
      downloadBlob(await buildPptx(pages, mode), withExtension(file.name, '.pptx'))
    } catch {
      setError('Gagal membuat PowerPoint. Coba PDF yang lebih kecil.')
    } finally {
      setSaving(false)
    }
  }

  if (status.kind === 'ready' && file) {
    const { pages } = status
    const textBoxes = pages.reduce((n, p) => n + p.boxes.length, 0)

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {pages.length} halaman → {pages.length} slide
              {mode === 'editable' && ` · ${textBoxes} kotak teks`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void download(pages)} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Download />}
              Unduh PowerPoint
            </Button>
            <Button variant="ghost" disabled={saving} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              File lain
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 rounded-2xl border bg-card p-4">
          <Segmented label="Isi slide" value={mode} options={MODE_OPTIONS} disabled={saving} onChange={setMode} />
          <p className="max-w-md text-xs text-muted-foreground">
            {mode === 'editable'
              ? 'Latar slide berisi bentuk, warna, dan gambar dari PDF; semua teks jadi kotak teks yang bisa diedit di posisi aslinya.'
              : 'Setiap slide berupa gambar halaman PDF — tampilannya persis, tapi isinya tidak bisa diedit.'}
          </p>
        </div>

        {mode === 'editable' && textBoxes === 0 && (
          <ErrorNote message="PDF ini tidak berisi teks (mungkin hasil scan), jadi slide hanya berisi gambar halamannya." />
        )}
        {error && <ErrorNote message={error} />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page, i) => (
            <figure key={i} className="rounded-2xl border bg-card p-2.5">
              <div
                className="relative overflow-hidden rounded-lg bg-white ring-1 ring-black/5"
                style={{ aspectRatio: `${page.width} / ${page.height}` }}
              >
                <img src={page.image} alt={`Halaman ${i + 1}`} className="absolute inset-0 size-full" />
              </div>
              <figcaption className="mt-2 px-1 font-mono text-[11px] text-muted-foreground">Slide {i + 1}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label="Tarik file .pdf ke sini"
        busyLabel={
          status.kind === 'reading'
            ? status.total
              ? `Menyiapkan slide ${status.done}/${status.total}…`
              : `Membuka ${file?.name}…`
            : undefined
        }
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
