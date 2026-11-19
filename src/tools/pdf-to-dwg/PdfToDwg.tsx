import { useState } from 'react'
import { Check, Download, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { LockedPdfError, openPdf, type PdfPages } from '../pdf-to-image/convert'
import { writeDxf, type DxfResult } from './dxf'
import { readVectorPages } from './extract'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; file: File; doc: PdfPages }
  | { kind: 'error'; message: string }

/** PDF points → millimetres. */
const PT_MM = 25.4 / 72
const SCALES = [1, 20, 50, 100, 200, 500, 1000]
const UNITS = [
  { value: 1, label: 'mm' },
  { value: 10, label: 'cm' },
  { value: 1000, label: 'm' },
]

export default function PdfToDwg() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [scale, setScale] = useState(1)
  const [unit, setUnit] = useState(1)
  const [fills, setFills] = useState(true)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<DxfResult['counts'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function open(file: File) {
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a file in .pdf format.') })
      return
    }
    setError(null)
    setResult(null)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const doc = await openPdf(file, (done, total) => setStatus({ kind: 'reading', done, total }))
      setSelected(new Set([1]))
      setStatus({ kind: 'ready', file, doc })
    } catch (e) {
      setStatus({
        kind: 'error',
        message:
          e instanceof LockedPdfError
            ? t('PDF ini dikunci password. Buka kuncinya dulu dengan tool “Buka Proteksi PDF”.', 'This PDF is password-protected. Unlock it first with the “Unlock PDF” tool.')
            : t('PDF tidak bisa dibaca. Pastikan filenya tidak rusak.', "The PDF couldn't be read. Make sure the file isn't damaged."),
      })
    }
  }

  async function convert(file: File, pages: number[]) {
    setError(null)
    setResult(null)
    setProgress({ done: 0, total: pages.length })
    try {
      const vectors = await readVectorPages(file, pages, (done, total) => setProgress({ done, total }))
      const k = (PT_MM * scale) / unit
      const { text, counts } = writeDxf(vectors, { unit: k, fills, gap: (20 * scale) / unit })
      if (counts.lines + counts.circles + counts.texts + counts.fills === 0) {
        const scanned = vectors.some((v) => v.images > 0)
        setError(
          scanned
            ? t(
                'Halaman ini hanya berisi gambar (hasil scan atau foto), bukan garis vektor, jadi tidak ada yang bisa diubah jadi CAD.',
                'These pages only hold pictures (a scan or a photo), not vector lines, so there is nothing to turn into CAD.',
              )
            : t('Tidak ada garis atau teks di halaman yang dipilih.', 'No lines or text on the chosen pages.'),
        )
        return
      }
      downloadBlob(new Blob([text], { type: 'application/dxf' }), withExtension(file.name, '.dxf'))
      setResult(counts)
    } catch {
      setError(t('Gagal mengubah PDF. Coba pilih lebih sedikit halaman.', "Couldn't convert the PDF. Try fewer pages."))
    } finally {
      setProgress(null)
    }
  }

  if (status.kind === 'ready') {
    const { file, doc } = status
    const busy = progress !== null
    const pages = [...selected].sort((a, b) => a - b)
    const all = selected.size === doc.thumbs.length
    const unitLabel = UNITS.find((u) => u.value === unit)!.label
    const example = (10 * scale) / unit
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {busy
                ? t(`Membaca garis halaman ${progress.done}/${progress.total}…`, `Reading the lines of page ${progress.done}/${progress.total}…`)
                : t(`${doc.thumbs.length} halaman · ${selected.size} dipilih`, `${doc.thumbs.length} pages · ${selected.size} selected`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void convert(file, pages)} disabled={busy || selected.size === 0}>
              {busy ? <Loader2 className="animate-spin" /> : <Download />}
              {t('Unduh DXF', 'Download DXF')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
          <Segmented
            label={t('Skala gambar di PDF', 'Drawing scale in the PDF')}
            value={scale}
            options={SCALES.map((s) => ({ value: s, label: `1:${s}` }))}
            disabled={busy}
            onChange={setScale}
          />
          <Segmented label={t('Satuan hasil', 'Output units')} value={unit} options={UNITS} disabled={busy} onChange={setUnit} />
          <Segmented
            label={t('Bidang berisi warna', 'Filled areas')}
            value={fills ? 1 : 0}
            options={[
              { value: 1, label: t('Ambil (garis tepi)', 'Keep (outlines)') },
              { value: 0, label: t('Lewati', 'Skip') },
            ]}
            disabled={busy}
            onChange={(v) => setFills(v === 1)}
          />
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>
            {t(
              `Ukuran di hasil = ukuran di kertas × ${scale}, dalam ${unitLabel}. Contoh: garis 10 mm di kertas jadi ${example.toLocaleString('id-ID')} ${unitLabel}.`,
              `Sizes in the result = size on paper × ${scale}, in ${unitLabel}. E.g. a 10 mm line on paper becomes ${example.toLocaleString('en')} ${unitLabel}.`,
            )}
          </p>
          <p>
            {t(
              'Hasilnya file .dxf (format tukar resmi AutoCAD). Buka di AutoCAD, BricsCAD, atau LibreCAD, lalu Save As → .dwg bila perlu. Hanya PDF vektor (hasil ekspor dari CAD) yang bisa diubah; PDF hasil scan tidak punya garis.',
              'You get a .dxf file (AutoCAD’s official exchange format). Open it in AutoCAD, BricsCAD or LibreCAD, then Save As → .dwg if needed. Only vector PDFs (exported from CAD) can be converted; scanned PDFs have no lines.',
            )}
          </p>
        </div>

        {result && (
          <div className="flex items-start gap-3 rounded-xl border border-brand-2/40 p-4 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-2" />
            <p>
              {t('Tersimpan', 'Saved')}:{' '}
              <span className="font-mono text-xs">
                {result.lines} {t('garis', 'lines')} · {result.circles} {t('lingkaran', 'circles')} · {result.texts} {t('teks', 'texts')}
                {fills ? ` · ${result.fills} ${t('isian', 'fills')}` : ''}
              </span>
              . {t('Layer: PDF_GARIS, PDF_TEKS, PDF_ISIAN, PDF_HALAMAN.', 'Layers: PDF_GARIS (lines), PDF_TEKS (text), PDF_ISIAN (fills), PDF_HALAMAN (sheet edge).')}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {t('Klik halaman untuk memilih. Beberapa halaman diletakkan berjajar di satu file.', 'Click pages to select them. Several pages are laid side by side in one file.')}
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
                  <span className={cn('grid size-5 place-items-center rounded-md border', on ? 'border-transparent bg-gradient-brand text-brand-ink' : 'bg-background')}>
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
              : t('Membuka PDF…', 'Opening the PDF…')
            : undefined
        }
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
