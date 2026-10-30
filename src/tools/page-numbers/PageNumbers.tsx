import { useEffect, useMemo, useState } from 'react'
import { ListOrdered, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { isPdfFile, openErrorMessage, pageThumbs, type PageThumb } from '@/lib/pdf-doc'
import { labelOrigin, numberFor, numberPdf, pageLabel, type HPos, type NumberFormat, type NumberOptions, type VPos } from './numbers'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'ready'; pages: number; thumb: PageThumb }
  | { kind: 'error'; message: string }

type Option<V> = { value: V; label: readonly [string, string] }

const FORMATS: Option<NumberFormat>[] = [
  { value: 'plain', label: ['1', '1'] },
  { value: 'of-total', label: ['1 / 10', '1 / 10'] },
  { value: 'word', label: ['Halaman 1', 'Page 1'] },
  { value: 'dash', label: ['- 1 -', '- 1 -'] },
]
const VPOS: Option<VPos>[] = [
  { value: 'bottom', label: ['Bawah', 'Bottom'] },
  { value: 'top', label: ['Atas', 'Top'] },
]
const HPOS: Option<HPos>[] = [
  { value: 'left', label: ['Kiri', 'Left'] },
  { value: 'center', label: ['Tengah', 'Center'] },
  { value: 'right', label: ['Kanan', 'Right'] },
]
const SIZES: Option<number>[] = [
  { value: 9, label: ['Kecil', 'Small'] },
  { value: 11, label: ['Sedang', 'Medium'] },
  { value: 14, label: ['Besar', 'Large'] },
]

/** Whole number from a text box, kept within bounds. */
const toInt = (s: string, min: number, max: number) => Math.min(max, Math.max(min, Math.floor(Number(s)) || min))

export default function PageNumbers() {
  const t = useT()
  const opt = <V,>(list: Option<V>[]) => list.map((o) => ({ value: o.value, label: t(...o.label) }))
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [opts, setOpts] = useState<NumberOptions>({ format: 'plain', v: 'bottom', h: 'center', fromPage: 1, startAt: 1, size: 11 })
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof NumberOptions>(key: K, value: NumberOptions[K]) => setOpts((o) => ({ ...o, [key]: value }))
  const pages = status.kind === 'ready' ? status.pages : 0

  // Keep the first numbered page inside the document.
  useEffect(() => {
    if (pages && opts.fromPage > pages) setOpts((o) => ({ ...o, fromPage: pages }))
  }, [pages, opts.fromPage])

  async function open(next: File) {
    if (!isPdfFile(next)) {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a .pdf file.') })
      return
    }
    setFile(next)
    setError(null)
    setStatus({ kind: 'reading' })
    try {
      const { count, thumbs } = await pageThumbs(next, 700, undefined, [1])
      setOpts((o) => ({ ...o, fromPage: 1 }))
      setStatus({ kind: 'ready', pages: count, thumb: thumbs[0] })
    } catch (e) {
      setStatus({ kind: 'error', message: openErrorMessage(e) })
    }
  }

  async function save() {
    if (!file) return
    setError(null)
    setProgress({ done: 0, total: 0 })
    try {
      const blob = await numberPdf(file, opts, (done, total) => setProgress({ done, total }))
      downloadBlob(blob, file.name.replace(/\.pdf$/i, '') + t('-nomor.pdf', '-numbered.pdf'))
    } catch (e) {
      setError(openErrorMessage(e))
    } finally {
      setProgress(null)
    }
  }

  // The preview shows page 1; when numbering starts later it shows the first numbered label anyway.
  const sample = useMemo(() => {
    if (status.kind !== 'ready') return null
    const last = numberFor(status.pages, opts) ?? opts.startAt
    const text = pageLabel(opts.format, opts.startAt, last)
    const { width: W, height: H } = status.thumb
    // Helvetica averages ~0.52 em per character; good enough for placement.
    const width = text.length * opts.size * 0.52
    return { text, W, H, ...labelOrigin(W, H, width, opts.size, opts.v, opts.h), width }
  }, [status, opts])

  if (status.kind === 'ready' && file && sample) {
    const busy = progress !== null
    const numbered = status.pages - opts.fromPage + 1
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {busy && progress.total
                ? t(`Memberi nomor… halaman ${progress.done}/${progress.total}`, `Numbering… page ${progress.done}/${progress.total}`)
                : t(
                    `${status.pages} halaman — ${numbered} halaman diberi nomor.`,
                    `${status.pages} pages — ${numbered} will be numbered.`,
                  )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <ListOrdered />}
              {t('Beri nomor & unduh', 'Number & download')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5 rounded-2xl border bg-card p-5">
            <Segmented label={t('Format', 'Format')} value={opts.format} options={opt(FORMATS)} disabled={busy} onChange={(v) => set('format', v)} />
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              <Segmented label={t('Posisi vertikal', 'Vertical position')} value={opts.v} options={opt(VPOS)} disabled={busy} onChange={(v) => set('v', v)} />
              <Segmented label={t('Posisi horizontal', 'Horizontal position')} value={opts.h} options={opt(HPOS)} disabled={busy} onChange={(v) => set('h', v)} />
              <Segmented label={t('Ukuran', 'Size')} value={opts.size} options={opt(SIZES)} disabled={busy} onChange={(v) => set('size', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t('Mulai dari halaman', 'Start on page')}</span>
                <input
                  type="number"
                  min={1}
                  max={status.pages}
                  value={opts.fromPage}
                  disabled={busy}
                  onChange={(e) => set('fromPage', toInt(e.target.value, 1, status.pages))}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-brand-2/60"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t('Nomor pertama', 'First number')}</span>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={opts.startAt}
                  disabled={busy}
                  onChange={(e) => set('startAt', toInt(e.target.value, 0, 9999))}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-brand-2/60"
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                'Halaman sebelum “Mulai dari halaman” dibiarkan tanpa nomor (mis. sampul).',
                'Pages before “Start on page” stay unnumbered (e.g. a cover).',
              )}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('Pratinjau halaman 1', 'Page 1 preview')}</p>
            <div className="grid place-items-center rounded-2xl border bg-muted/60 p-4">
              <div className="relative w-full max-w-md shadow-md ring-1 ring-black/5" style={{ aspectRatio: `${sample.W} / ${sample.H}` }}>
                <img src={status.thumb.src} alt={t('Halaman 1', 'Page 1')} className="absolute inset-0 size-full" />
                {opts.fromPage === 1 && (
                  <svg viewBox={`0 0 ${sample.W} ${sample.H}`} className="absolute inset-0 size-full overflow-hidden" aria-hidden>
                    <text
                      x={sample.x}
                      y={sample.H - sample.y}
                      fontFamily="Helvetica, Arial, sans-serif"
                      fontSize={opts.size}
                      textLength={sample.width}
                      lengthAdjust="spacingAndGlyphs"
                      fill="#1a1a1a"
                      style={{ whiteSpace: 'pre' }}
                    >
                      {sample.text}
                    </text>
                  </svg>
                )}
              </div>
            </div>
            {opts.fromPage > 1 && (
              <p className="text-xs text-muted-foreground">
                {t('Halaman 1 tidak diberi nomor, jadi pratinjau tidak menampilkannya.', 'Page 1 is not numbered, so the preview shows none.')}
              </p>
            )}
          </div>
        </div>

        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label={t('Tarik file .pdf ke sini', 'Drop a .pdf file here')}
        busyLabel={status.kind === 'reading' ? t(`Membuka ${file?.name}…`, `Opening ${file?.name}…`) : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
