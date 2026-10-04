import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, RotateCcw, Stamp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { isPdfFile, openErrorMessage, pageThumbs, type PageThumb } from '@/lib/pdf-doc'
import {
  COLORS,
  HALF_CAP,
  layoutWatermark,
  measureText,
  readWatermarkImage,
  watermarkPdf,
  type WatermarkColor,
  type WatermarkLayout,
  type WatermarkOptions,
  type WatermarkSize,
} from './watermark'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'ready'; preview: PageThumb; pages: number }
  | { kind: 'error'; message: string }

const KIND_OPTIONS: { value: WatermarkOptions['kind']; label: string }[] = [
  { value: 'text', label: 'Teks' },
  { value: 'image', label: 'Gambar / logo' },
]
const COLOR_OPTIONS: { value: WatermarkColor; label: string }[] = [
  { value: 'gray', label: 'Abu-abu' },
  { value: 'red', label: 'Merah' },
  { value: 'blue', label: 'Biru' },
  { value: 'black', label: 'Hitam' },
]
const LAYOUT_OPTIONS: { value: WatermarkLayout; label: string }[] = [
  { value: 'center', label: 'Satu di tengah' },
  { value: 'tile', label: 'Berulang' },
]
const ANGLE_OPTIONS: { value: number; label: string }[] = [
  { value: 45, label: 'Diagonal' },
  { value: 0, label: 'Mendatar' },
]
const SIZE_OPTIONS: { value: WatermarkSize; label: string }[] = [
  { value: 'sm', label: 'Kecil' },
  { value: 'md', label: 'Sedang' },
  { value: 'lg', label: 'Besar' },
]
const OPACITY_OPTIONS: { value: number; label: string }[] = [
  { value: 0.15, label: 'Samar' },
  { value: 0.3, label: 'Sedang' },
  { value: 0.5, label: 'Tebal' },
]

const css = (c: [number, number, number]) => `rgb(${c.map((v) => Math.round(v * 255)).join(' ')})`

export default function WatermarkPdf() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [opts, setOpts] = useState<WatermarkOptions>({
    kind: 'text',
    text: 'RAHASIA',
    image: null,
    color: 'gray',
    opacity: 0.3,
    angle: 45,
    layout: 'center',
    size: 'md',
  })
  /** Text width at 1 pt; null = has characters the PDF font can't draw. */
  const [textWidth, setTextWidth] = useState<number | null>(0)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof WatermarkOptions>(key: K, value: WatermarkOptions[K]) =>
    setOpts((o) => ({ ...o, [key]: value }))

  useEffect(() => {
    let current = true
    void measureText(opts.text).then((w) => current && setTextWidth(w))
    return () => {
      current = false
    }
  }, [opts.text])

  // Release the preview URL of a replaced watermark image.
  useEffect(() => {
    const url = opts.image?.url
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [opts.image])

  async function open(next: File) {
    if (!isPdfFile(next)) {
      setStatus({ kind: 'error', message: 'Pilih file berformat .pdf.' })
      return
    }
    setFile(next)
    setError(null)
    setStatus({ kind: 'reading' })
    try {
      const { count, thumbs } = await pageThumbs(next, 900, undefined, [1])
      setStatus({ kind: 'ready', preview: thumbs[0], pages: count })
    } catch (e) {
      setStatus({ kind: 'error', message: openErrorMessage(e) })
    }
  }

  async function pickImage(picked: File) {
    setError(null)
    try {
      set('image', await readWatermarkImage(picked))
    } catch {
      setError('Gambar tidak bisa dibaca. Pakai PNG atau JPG.')
    }
  }

  const textProblem =
    opts.kind === 'text'
      ? !opts.text.trim()
        ? 'Tulis teks watermark.'
        : textWidth === null
          ? 'Teks berisi huruf yang belum didukung (mis. emoji atau aksara non-Latin). Pakai huruf Latin, angka, dan tanda baca biasa.'
          : null
      : !opts.image
        ? 'Pilih gambar atau logo untuk watermark.'
        : null

  const preview = status.kind === 'ready' ? status.preview : null
  const layout = useMemo(
    () => (preview && !textProblem ? layoutWatermark(preview.width, preview.height, opts, textWidth ?? 0) : null),
    [preview, opts, textWidth, textProblem],
  )

  async function save() {
    if (!file || textProblem) return
    setError(null)
    setProgress({ done: 0, total: 0 })
    try {
      const blob = await watermarkPdf(file, opts, (done, total) => setProgress({ done, total }))
      downloadBlob(blob, file.name.replace(/\.pdf$/i, '') + '-watermark.pdf')
    } catch (e) {
      setError(openErrorMessage(e))
    } finally {
      setProgress(null)
    }
  }

  if (status.kind === 'ready' && preview && file) {
    const busy = progress !== null
    const { width: W, height: H } = preview

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {busy && progress.total
                ? `Memberi watermark… halaman ${progress.done}/${progress.total}`
                : `${status.pages} halaman — watermark dipasang di semua halaman.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={busy || !!textProblem}>
              {busy ? <Loader2 className="animate-spin" /> : <Stamp />}
              Pasang &amp; unduh
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              File lain
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5 rounded-2xl border bg-card p-5">
            <Segmented label="Jenis" value={opts.kind} options={KIND_OPTIONS} disabled={busy} onChange={(v) => set('kind', v)} />

            {opts.kind === 'text' ? (
              <>
                <label className="block space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Teks watermark</span>
                  <input
                    value={opts.text}
                    onChange={(e) => set('text', e.target.value)}
                    disabled={busy}
                    maxLength={80}
                    placeholder="RAHASIA"
                    className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-brand-2/60"
                  />
                </label>
                <Segmented label="Warna" value={opts.color} options={COLOR_OPTIONS} disabled={busy} onChange={(v) => set('color', v)} />
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Gambar watermark</p>
                <div className="flex items-center gap-3">
                  {opts.image && (
                    <img src={opts.image.url} alt="" className="size-14 rounded-lg border bg-muted/60 object-contain p-1" />
                  )}
                  <Button variant="outline" disabled={busy} onClick={() => imageRef.current?.click()}>
                    <ImagePlus />
                    {opts.image ? 'Ganti gambar' : 'Pilih gambar'}
                  </Button>
                  <input
                    ref={imageRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const picked = e.target.files?.[0]
                      e.target.value = ''
                      if (picked) void pickImage(picked)
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">PNG dengan latar transparan memberi hasil paling rapi.</p>
              </div>
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-4">
              <Segmented label="Posisi" value={opts.layout} options={LAYOUT_OPTIONS} disabled={busy} onChange={(v) => set('layout', v)} />
              <Segmented label="Arah" value={opts.angle} options={ANGLE_OPTIONS} disabled={busy} onChange={(v) => set('angle', v)} />
              <Segmented label="Ukuran" value={opts.size} options={SIZE_OPTIONS} disabled={busy} onChange={(v) => set('size', v)} />
              <Segmented
                label="Ketebalan"
                value={opts.opacity}
                options={OPACITY_OPTIONS}
                disabled={busy}
                onChange={(v) => set('opacity', v)}
              />
            </div>

            {textProblem && opts.kind === 'text' && <p className="text-xs text-destructive">{textProblem}</p>}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Pratinjau halaman 1</p>
            <div className="grid place-items-center rounded-2xl border bg-muted/60 p-4">
              <div className="relative w-full max-w-md shadow-md ring-1 ring-black/5" style={{ aspectRatio: `${W} / ${H}` }}>
                <img src={preview.src} alt="Halaman 1" className="absolute inset-0 size-full" />
                {layout && (
                  <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-hidden" aria-hidden>
                    {layout.stamps.map(({ cx, cy }, i) => {
                      // PDF space has y up; SVG has y down.
                      const y = H - cy
                      const rotate = `rotate(${-opts.angle} ${cx} ${y})`
                      return opts.kind === 'image' && opts.image ? (
                        <image
                          key={i}
                          href={opts.image.url}
                          x={cx - layout.width / 2}
                          y={y - layout.height / 2}
                          width={layout.width}
                          height={layout.height}
                          opacity={opts.opacity}
                          transform={rotate}
                          preserveAspectRatio="none"
                        />
                      ) : (
                        <text
                          key={i}
                          x={cx}
                          y={y + layout.size * HALF_CAP}
                          textAnchor="middle"
                          fontFamily="Helvetica, Arial, sans-serif"
                          fontWeight={700}
                          fontSize={layout.size}
                          textLength={layout.width}
                          lengthAdjust="spacingAndGlyphs"
                          fill={css(COLORS[opts.color])}
                          fillOpacity={opts.opacity}
                          transform={rotate}
                          style={{ whiteSpace: 'pre' }}
                        >
                          {opts.text}
                        </text>
                      )
                    })}
                  </svg>
                )}
              </div>
            </div>
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
        label="Tarik file .pdf ke sini"
        busyLabel={status.kind === 'reading' ? `Membuka ${file?.name}…` : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
