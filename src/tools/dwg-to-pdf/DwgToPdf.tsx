import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Layers, Loader2, RotateCcw } from 'lucide-react'
import type { DwgDatabase } from '@mlightcad/libredwg-web'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { buildDrawing, type Measure } from './cad'
import { drawCanvas, helveticaMeasure, layoutPage, writePdf, type ColorMode, type Orientation, type Paper } from './draw'
import { readCad, versionName } from './read'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'ready'; file: File; db: DwgDatabase; dxf: boolean; version: string; measure: Measure }
  | { kind: 'error'; message: string }

const PAPER_OPTIONS: { value: Paper; label: string }[] = (['A4', 'A3', 'A2', 'A1', 'A0'] as const).map((p) => ({ value: p, label: p }))
const SCALES = [0, 1, 20, 50, 100, 200, 500, 1000]
/** Millimetres per drawing unit, for files that do not say ($INSUNITS = 0). */
const UNIT_OPTIONS = [
  { value: 1, label: 'mm' },
  { value: 10, label: 'cm' },
  { value: 1000, label: 'm' },
  { value: 25.4, label: 'inch' },
]

export default function DwgToPdf() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [paper, setPaper] = useState<Paper>('A3')
  const [orientation, setOrientation] = useState<Orientation>('auto')
  const [scale, setScale] = useState(0)
  const [unit, setUnit] = useState(1)
  const [mode, setMode] = useState<ColorMode>('color')
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [showLayers, setShowLayers] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  async function open(file: File) {
    if (!/\.(dwg|dxf)$/i.test(file.name)) {
      setStatus({ kind: 'error', message: t('Pilih file berformat .dwg atau .dxf.', 'Choose a .dwg or .dxf file.') })
      return
    }
    setStatus({ kind: 'reading' })
    setError(null)
    setHidden(new Set())
    try {
      const [{ db, dxf, version }, measure] = await Promise.all([readCad(file), helveticaMeasure()])
      setStatus({ kind: 'ready', file, db, dxf, version, measure })
    } catch {
      setStatus({
        kind: 'error',
        message: t(
          'File tidak bisa dibaca. Pastikan filenya tidak rusak; DWG sangat baru atau dari aplikasi selain AutoCAD kadang belum didukung — coba simpan ulang sebagai DWG 2018 atau DXF.',
          "The file couldn't be read. Make sure it isn't damaged; very new DWGs or ones from apps other than AutoCAD are sometimes unsupported — try saving it again as DWG 2018 or DXF.",
        ),
      })
    }
  }

  const ready = status.kind === 'ready' ? status : null
  const drawing = useMemo(
    () => (ready ? buildDrawing(ready.db, { measure: ready.measure, dxf: ready.dxf, hidden }) : null),
    [ready, hidden],
  )
  const unitMm = drawing?.unitMm || unit
  const page = useMemo(
    () => (drawing && drawing.shapes.length ? layoutPage(drawing, { paper, orientation, scale, unitMm, mode }) : null),
    [drawing, paper, orientation, scale, unitMm, mode],
  )

  // Redraw the preview whenever the page or the box size changes.
  useEffect(() => {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box || !drawing || !page) return
    const paint = () => {
      const px = Math.min(1600, box.clientWidth * Math.min(window.devicePixelRatio || 1, 2))
      drawCanvas(canvas, drawing, page, mode, px / page.width)
    }
    paint()
    const ro = new ResizeObserver(paint)
    ro.observe(box)
    return () => ro.disconnect()
  }, [drawing, page, mode])

  async function download() {
    if (!ready || !drawing || !page) return
    setBusy(true)
    setError(null)
    try {
      const blob = await writePdf(drawing, page, mode, ready.file.name.replace(/\.(dwg|dxf)$/i, ''))
      downloadBlob(blob, withExtension(ready.file.name, '.pdf'))
    } catch {
      setError(t('Gagal membuat PDF. Coba kertas yang lebih kecil atau sembunyikan beberapa layer.', "Couldn't create the PDF. Try a smaller paper or hide some layers."))
    } finally {
      setBusy(false)
    }
  }

  if (ready && drawing) {
    const empty = drawing.shapes.length === 0
    const scaleOptions = SCALES.map((s) => ({ value: s, label: s === 0 ? t('Pas kertas', 'Fit to page') : `1:${s}` }))
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{ready.file.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {versionName(ready.version)} · {drawing.layers.length} layer · {page ? `${paper} ${page.width > page.height ? t('lanskap', 'landscape') : t('potret', 'portrait')}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void download()} disabled={busy || empty}>
              {busy ? <Loader2 className="animate-spin" /> : <Download />}
              {t('Unduh PDF', 'Download PDF')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
          <Segmented label={t('Kertas', 'Paper')} value={paper} options={PAPER_OPTIONS} disabled={busy} onChange={setPaper} />
          <Segmented
            label={t('Arah', 'Orientation')}
            value={orientation}
            options={[
              { value: 'auto', label: t('Otomatis', 'Auto') },
              { value: 'portrait', label: t('Potret', 'Portrait') },
              { value: 'landscape', label: t('Lanskap', 'Landscape') },
            ]}
            disabled={busy}
            onChange={setOrientation}
          />
          <Segmented
            label={t('Warna', 'Colour')}
            value={mode}
            options={[
              { value: 'color', label: t('Sesuai gambar', 'As drawn') },
              { value: 'mono', label: t('Hitam', 'Black') },
            ]}
            disabled={busy}
            onChange={setMode}
          />
          <Segmented label={t('Skala', 'Scale')} value={scale} options={scaleOptions} disabled={busy} onChange={setScale} />
          {scale > 0 && !drawing.unitMm && (
            <Segmented label={t('Satuan gambar', 'Drawing units')} value={unit} options={UNIT_OPTIONS} disabled={busy} onChange={setUnit} />
          )}
        </div>

        {drawing.layers.length > 1 && (
          <div className="rounded-2xl border bg-card p-4">
            <button
              type="button"
              onClick={() => setShowLayers((v) => !v)}
              className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium"
              aria-expanded={showLayers}
            >
              <span className="flex items-center gap-2">
                <Layers className="size-4 text-brand-2" />
                {t('Layer', 'Layers')}
                <span className="font-mono text-xs text-muted-foreground">
                  {drawing.layers.length - hidden.size}/{drawing.layers.length} {t('tampil', 'shown')}
                </span>
              </span>
              <span className="text-xs text-brand-2">{showLayers ? t('Tutup', 'Close') : t('Atur', 'Choose')}</span>
            </button>
            {showLayers && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {drawing.layers.map((name) => {
                  const on = !hidden.has(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setHidden((prev) => {
                          const next = new Set(prev)
                          if (next.has(name)) next.delete(name)
                          else next.add(name)
                          return next
                        })
                      }
                      className={cn(
                        'max-w-56 truncate rounded-lg border px-2.5 py-1 font-mono text-xs transition-colors',
                        on ? 'border-brand-2/50 text-foreground' : 'text-muted-foreground line-through opacity-60',
                      )}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {empty ? (
          <ErrorNote
            message={t(
              'Tidak ada gambar di Model space file ini (atau semua layernya disembunyikan).',
              'There is nothing to draw in this file’s model space (or all its layers are hidden).',
            )}
          />
        ) : (
          <div ref={boxRef} className="overflow-hidden rounded-2xl border bg-muted/60 p-3 sm:p-5">
            <canvas ref={canvasRef} className="mx-auto block h-auto w-full max-w-full rounded-sm shadow-md ring-1 ring-black/5" />
          </div>
        )}

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {page?.overflow && (
            <p className="text-destructive">
              {t('Pada skala ini gambar lebih besar dari kertas, jadi tepinya terpotong. Pilih kertas lebih besar atau skala lain.', 'At this scale the drawing is larger than the paper, so its edges are cut off. Pick a bigger paper or another scale.')}
            </p>
          )}
          <p>
            {t(
              'Yang dicetak adalah Model space. Garis dan teks tetap vektor, jadi PDF tajam saat diperbesar. Teks memakai Helvetica, bukan font asli gambar.',
              'Model space is what gets printed. Lines and text stay vector, so the PDF stays sharp when zoomed. Text uses Helvetica, not the drawing’s own fonts.',
            )}
          </p>
          {drawing.skipped.length > 0 && (
            <p>
              {t('Tidak digambar (belum didukung): ', 'Not drawn (not supported yet): ')}
              <span className="font-mono">{drawing.skipped.join(', ')}</span>
            </p>
          )}
          {drawing.strays > 0 && (
            <p>
              {t(
                `${drawing.strays} objek yang jauh di luar gambar utama diabaikan saat menentukan batas halaman.`,
                `${drawing.strays} object(s) far outside the main drawing were ignored when fitting the page.`,
              )}
            </p>
          )}
        </div>

        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".dwg,.dxf"
        label={t('Tarik file .dwg atau .dxf ke sini', 'Drag a .dwg or .dxf file here')}
        busyLabel={status.kind === 'reading' ? t('Membaca gambar… (pertama kali memuat pembaca DWG, ±8 MB)', 'Reading the drawing… (first time loads the DWG reader, ~8 MB)') : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
