import { useState } from 'react'
import { Check, Download, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { exportImages, LockedPdfError, openPdf, type ImageFormat, type PdfPages } from './convert'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; doc: PdfPages }
  | { kind: 'error'; message: string }

const FORMAT_OPTIONS: { value: ImageFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
]
export default function PdfToImage() {
  const t = useT()
  const DPI_OPTIONS: { value: number; label: string }[] = [
    { value: 72, label: t('72 dpi · layar', '72 dpi · screen') },
    { value: 150, label: t('150 dpi · standar', '150 dpi · standard') },
    { value: 300, label: t('300 dpi · cetak', '300 dpi · print') },
  ]
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<ImageFormat>('png')
  const [dpi, setDpi] = useState(150)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const doc = status.kind === 'ready' ? status.doc : null

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a file in .pdf format.') })
      return
    }
    setFile(next)
    setError(null)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const opened = await openPdf(next, (done, total) => setStatus({ kind: 'reading', done, total }))
      setSelected(new Set(opened.thumbs.map((_, i) => i + 1)))
      setStatus({ kind: 'ready', doc: opened })
    } catch (e) {
      setStatus({
        kind: 'error',
        message:
          e instanceof LockedPdfError
            ? t(
                'PDF ini dikunci password. Buka kuncinya dulu dengan tool “Buka Proteksi PDF”.',
                'This PDF is password-protected. Unlock it first with the “Unlock PDF” tool.',
              )
            : t('PDF tidak bisa dibaca. Pastikan filenya tidak rusak.', "The PDF couldn't be read. Make sure the file isn't damaged."),
      })
    }
  }

  async function download(pages: number[]) {
    if (!doc || !file || !pages.length) return
    setError(null)
    setProgress({ done: 0, total: pages.length })
    try {
      const { blob, fileName } = await exportImages(
        file,
        pages,
        { dpi, format, baseName: file.name.replace(/\.pdf$/i, '') },
        (done, total) => setProgress({ done, total }),
      )
      downloadBlob(blob, fileName)
    } catch {
      setError(t('Gagal membuat gambar. Coba resolusi yang lebih kecil.', "Couldn't create the images. Try a lower resolution."))
    } finally {
      setProgress(null)
    }
  }

  if (doc && file) {
    const busy = progress !== null
    const pages = [...selected].sort((a, b) => a - b)
    const all = selected.size === doc.thumbs.length

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {busy
                ? t(`Membuat gambar ${progress.done}/${progress.total}…`, `Creating image ${progress.done}/${progress.total}…`)
                : t(
                    `${doc.thumbs.length} halaman · ${selected.size} dipilih${selected.size > 1 ? ' → ZIP' : ''}`,
                    `${doc.thumbs.length} pages · ${selected.size} selected${selected.size > 1 ? ' → ZIP' : ''}`,
                  )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void download(pages)} disabled={busy || selected.size === 0}>
              {busy ? <Loader2 className="animate-spin" /> : <Download />}
              {selected.size > 1
                ? t(`Unduh ${selected.size} gambar`, `Download ${selected.size} images`)
                : t('Unduh gambar', 'Download image')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
          <Segmented label="Format" value={format} options={FORMAT_OPTIONS} disabled={busy} onChange={setFormat} />
          <Segmented label={t('Resolusi', 'Resolution')} value={dpi} options={DPI_OPTIONS} disabled={busy} onChange={setDpi} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {t('Klik halaman untuk memilih atau membatalkan.', 'Click a page to select or deselect it.')}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setSelected(all ? new Set() : new Set(doc.thumbs.map((_, i) => i + 1)))}
            className="text-xs font-medium text-brand-2 hover:underline"
          >
            {all ? t('Batalkan semua', 'Deselect all') : t('Pilih semua', 'Select all')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {doc.thumbs.map((thumb, i) => {
            const n = i + 1
            const on = selected.has(n)
            return (
              <button
                key={n}
                type="button"
                disabled={busy}
                aria-pressed={on}
                onClick={() =>
                  setSelected((prev) => {
                    const next = new Set(prev)
                    if (next.has(n)) next.delete(n)
                    else next.add(n)
                    return next
                  })
                }
                className={cn(
                  'group relative rounded-2xl border bg-card p-2.5 text-left transition-all',
                  on ? 'border-brand-2/60 ring-2 ring-brand-2/30' : 'opacity-60 hover:opacity-100',
                )}
              >
                <div className="grid place-items-center rounded-lg bg-muted/60 p-2">
                  <img src={thumb} alt={t(`Halaman ${n}`, `Page ${n}`)} className="max-h-56 rounded-sm shadow-md ring-1 ring-black/5" />
                </div>
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="font-mono text-[11px] text-muted-foreground">{t(`Halaman ${n}`, `Page ${n}`)}</span>
                  <span
                    className={cn(
                      'grid size-5 place-items-center rounded-md border',
                      on ? 'border-transparent bg-gradient-brand text-white' : 'bg-background',
                    )}
                  >
                    {on && <Check className="size-3.5" />}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label={t('Tarik file .pdf ke sini', 'Drag a .pdf file here')}
        busyLabel={
          status.kind === 'reading'
            ? status.total
              ? t(`Menyiapkan pratinjau ${status.done}/${status.total}…`, `Preparing preview ${status.done}/${status.total}…`)
              : t(`Membuka ${file?.name}…`, `Opening ${file?.name}…`)
            : undefined
        }
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
