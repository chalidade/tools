import { useMemo, useState } from 'react'
import { Check, Loader2, RotateCcw, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { isPdfFile, openErrorMessage, pageThumbs, type PageThumb } from '@/lib/pdf-doc'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { chunkPages, parseRanges, splitPdf, type PageGroup } from './split'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; thumbs: PageThumb[] }
  | { kind: 'error'; message: string }

type Mode = 'select' | 'ranges' | 'every'

/** Alternating tints so neighbouring groups stand apart on the page grid. */
const GROUP_TINTS = ['bg-brand-1', 'bg-brand-2']

export default function SplitPdf() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<Mode>('select')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [ranges, setRanges] = useState('')
  const [every, setEvery] = useState(1)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const thumbs = status.kind === 'ready' ? status.thumbs : null
  const count = thumbs?.length ?? 0

  async function open(next: File) {
    if (!isPdfFile(next)) {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a .pdf file.') })
      return
    }
    setFile(next)
    setError(null)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const { thumbs } = await pageThumbs(next, 240, (done, total) => setStatus({ kind: 'reading', done, total }))
      setSelected(new Set())
      setRanges(thumbs.length > 1 ? `1-${Math.ceil(thumbs.length / 2)}, ${Math.ceil(thumbs.length / 2) + 1}-${thumbs.length}` : '1')
      setEvery(1)
      setStatus({ kind: 'ready', thumbs })
    } catch (e) {
      setStatus({ kind: 'error', message: openErrorMessage(e) })
    }
  }

  /** What will be saved, or why not yet. */
  const plan: PageGroup[] | string = useMemo(() => {
    if (!count) return []
    if (mode === 'select') {
      if (!selected.size) return t('Klik halaman yang ingin diambil.', 'Click the pages you want to keep.')
      return [[...selected].sort((a, b) => a - b)]
    }
    if (mode === 'ranges') return parseRanges(ranges, count)
    return chunkPages(count, Math.max(1, every))
  }, [mode, selected, ranges, every, count, t])

  const groups = typeof plan === 'string' ? [] : plan
  const groupOf = useMemo(() => {
    const map = new Map<number, number>()
    groups.forEach((g, i) => g.forEach((n) => map.has(n) || map.set(n, i)))
    return map
  }, [groups])

  async function save() {
    if (!file || !groups.length) return
    setError(null)
    setProgress({ done: 0, total: groups.length })
    try {
      const { blob, fileName } = await splitPdf(file, groups, file.name.replace(/\.pdf$/i, ''), (done, total) =>
        setProgress({ done, total }),
      )
      downloadBlob(blob, fileName)
    } catch (e) {
      setError(openErrorMessage(e))
    } finally {
      setProgress(null)
    }
  }

  if (thumbs && file) {
    const busy = progress !== null
    const allSelected = selected.size === count

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {busy
                ? t(`Membuat PDF ${progress.done}/${progress.total}…`, `Creating PDF ${progress.done}/${progress.total}…`)
                : groups.length
                  ? t(
                      `${count} halaman → ${groups.length} file PDF${groups.length > 1 ? ' (ZIP)' : ''}`,
                      `${count} pages → ${groups.length} PDF file${groups.length > 1 ? 's (ZIP)' : ''}`,
                    )
                  : t(`${count} halaman`, `${count} pages`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={busy || !groups.length}>
              {busy ? <Loader2 className="animate-spin" /> : <Scissors />}
              {groups.length > 1
                ? t(`Pisah jadi ${groups.length} PDF`, `Split into ${groups.length} PDFs`)
                : t('Pisah & unduh', 'Split & download')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
          <Segmented
            label={t('Cara memisah', 'How to split')}
            value={mode}
            options={[
              { value: 'select', label: t('Ambil halaman', 'Pick pages') },
              { value: 'ranges', label: t('Rentang', 'Ranges') },
              { value: 'every', label: t('Per N halaman', 'Every N pages') },
            ]}
            disabled={busy}
            onChange={setMode}
          />
          {mode === 'ranges' && (
            <label className="block min-w-60 flex-1 space-y-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t('Rentang halaman — satu PDF per rentang', 'Page ranges — one PDF per range')}
              </span>
              <input
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                disabled={busy}
                placeholder="1-3, 5, 8-10"
                spellCheck={false}
                className="h-10 w-full rounded-xl border bg-background px-3 font-mono text-sm outline-none focus:border-brand-2/60"
              />
            </label>
          )}
          {mode === 'every' && (
            <label className="block space-y-2">
              <span className="text-xs font-medium text-muted-foreground">{t('Halaman per file', 'Pages per file')}</span>
              <input
                type="number"
                min={1}
                max={count}
                value={every}
                onChange={(e) => setEvery(Math.min(count, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
                disabled={busy}
                className="h-10 w-24 rounded-xl border bg-background px-3 font-mono text-sm outline-none focus:border-brand-2/60"
              />
            </label>
          )}
        </div>

        {typeof plan === 'string' && mode !== 'select' && <ErrorNote message={plan} />}

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {mode === 'select'
              ? t(
                  'Klik halaman untuk memilih — halaman terpilih disimpan jadi satu PDF.',
                  'Click pages to select them — the selected pages are saved as one PDF.',
                )
              : t(
                  'Label di tiap halaman menunjukkan file PDF tempat halaman itu masuk.',
                  'The label on each page shows which PDF file it goes into.',
                )}
          </p>
          {mode === 'select' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setSelected(allSelected ? new Set() : new Set(thumbs.map((_, i) => i + 1)))}
              className="text-xs font-medium text-brand-2 hover:underline"
            >
              {allSelected ? t('Batalkan semua', 'Deselect all') : t('Pilih semua', 'Select all')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {thumbs.map((thumb, i) => {
            const n = i + 1
            const group = groupOf.get(n)
            const on = group !== undefined
            const tint = group !== undefined ? GROUP_TINTS[group % GROUP_TINTS.length] : ''
            return (
              <button
                key={n}
                type="button"
                disabled={busy || mode !== 'select'}
                aria-pressed={mode === 'select' ? on : undefined}
                onClick={() =>
                  setSelected((prev) => {
                    const next = new Set(prev)
                    if (next.has(n)) next.delete(n)
                    else next.add(n)
                    return next
                  })
                }
                className={cn(
                  'relative rounded-xl border bg-card p-2 text-left transition-all disabled:cursor-default',
                  on ? 'border-brand-2/60 ring-2 ring-brand-2/30' : 'opacity-50',
                  mode === 'select' && !on && 'hover:opacity-100',
                )}
              >
                <div className="grid place-items-center rounded-md bg-muted/60 p-1.5">
                  <img src={thumb.src} alt={t(`Halaman ${n}`, `Page ${n}`)} className="max-h-40 rounded-sm shadow-sm ring-1 ring-black/5" />
                </div>
                <div className="mt-1.5 flex items-center justify-between px-0.5">
                  <span className="font-mono text-[11px] text-muted-foreground">{n}</span>
                  {mode === 'select' ? (
                    <span
                      className={cn(
                        'grid size-4 place-items-center rounded border',
                        on ? 'border-transparent bg-gradient-brand text-white' : 'bg-background',
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                  ) : (
                    on && (
                      <span className={cn('rounded px-1 font-mono text-[10px] font-medium text-white', tint)}>
                        PDF {group + 1}
                      </span>
                    )
                  )}
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
        label={t('Tarik file .pdf ke sini', 'Drop a .pdf file here')}
        busyLabel={
          status.kind === 'reading'
            ? status.total
              ? t(`Menyiapkan pratinjau ${status.done}/${status.total}…`, `Preparing previews ${status.done}/${status.total}…`)
              : t(`Membuka ${file?.name}…`, `Opening ${file?.name}…`)
            : undefined
        }
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
