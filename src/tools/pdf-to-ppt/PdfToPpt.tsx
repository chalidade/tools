import { useState } from 'react'
import { Download, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { buildPptx, LockedPdfError, readPdfPages, type SlideMode, type SlidePage } from './convert'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; pages: SlidePage[] }
  | { kind: 'error'; message: string }

export default function PdfToPpt() {
  const t = useT()
  const MODE_OPTIONS: { value: SlideMode; label: string }[] = [
    { value: 'editable', label: t('Teks bisa diedit', 'Editable text') },
    { value: 'image', label: t('Persis seperti PDF', 'Exactly like the PDF') },
  ]
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<SlideMode>('editable')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(next: File) {
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a file in .pdf format.') })
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
            ? t(
                'PDF ini dikunci password. Buka kuncinya dulu, lalu coba lagi.',
                'This PDF is password-protected. Unlock it first, then try again.',
              )
            : t('PDF tidak bisa dibaca. Pastikan filenya tidak rusak.', "The PDF couldn't be read. Make sure the file isn't damaged."),
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
      setError(t('Gagal membuat PowerPoint. Coba PDF yang lebih kecil.', "Couldn't create the PowerPoint. Try a smaller PDF."))
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
              {t(`${pages.length} halaman → ${pages.length} slide`, `${pages.length} pages → ${pages.length} slides`)}
              {mode === 'editable' && t(` · ${textBoxes} kotak teks`, ` · ${textBoxes} text boxes`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void download(pages)} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Download />}
              {t('Unduh PowerPoint', 'Download PowerPoint')}
            </Button>
            <Button variant="ghost" disabled={saving} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 rounded-2xl border bg-card p-4">
          <Segmented label={t('Isi slide', 'Slide content')} value={mode} options={MODE_OPTIONS} disabled={saving} onChange={setMode} />
          <p className="max-w-md text-xs text-muted-foreground">
            {mode === 'editable'
              ? t(
                  'Latar slide berisi bentuk, warna, dan gambar dari PDF; semua teks jadi kotak teks yang bisa diedit di posisi aslinya.',
                  'The slide background holds the shapes, colors and images from the PDF; all text becomes editable text boxes in its original position.',
                )
              : t(
                  'Setiap slide berupa gambar halaman PDF — tampilannya persis, tapi isinya tidak bisa diedit.',
                  'Each slide is an image of the PDF page — it looks exactly the same, but the content can’t be edited.',
                )}
          </p>
        </div>

        {mode === 'editable' && textBoxes === 0 && (
          <ErrorNote
            message={t(
              'PDF ini tidak berisi teks (mungkin hasil scan), jadi slide hanya berisi gambar halamannya.',
              'This PDF has no text (it may be a scan), so the slides only contain images of its pages.',
            )}
          />
        )}
        {error && <ErrorNote message={error} />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page, i) => (
            <figure key={i} className="rounded-2xl border bg-card p-2.5">
              <div
                className="relative overflow-hidden rounded-lg bg-white ring-1 ring-black/5"
                style={{ aspectRatio: `${page.width} / ${page.height}` }}
              >
                <img src={page.image} alt={t(`Halaman ${i + 1}`, `Page ${i + 1}`)} className="absolute inset-0 size-full" />
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
        label={t('Tarik file .pdf ke sini', 'Drag a .pdf file here')}
        busyLabel={
          status.kind === 'reading'
            ? status.total
              ? t(`Menyiapkan slide ${status.done}/${status.total}…`, `Preparing slide ${status.done}/${status.total}…`)
              : t(`Membuka ${file?.name}…`, `Opening ${file?.name}…`)
            : undefined
        }
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
