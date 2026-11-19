import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Download, Loader2, RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { decodeImage, formatBytes, newCanvas } from '@/lib/image'
import { locale, useT } from '@/lib/i18n'
import { DEFAULTS, finishSvg, traceImage, TraceTimeout, type TraceMode, type TraceOptions, type TraceShape } from './trace'

/** Longest side the tracer works on; bigger pictures are scaled down first. */
const MAX_SIDE = 2000
/** Above this many shapes the picture is probably a photo. */
const BUSY_SHAPES = 3000

interface Picked {
  name: string
  pixels: Uint8ClampedArray
  width: number
  height: number
  /** Preview of what is traced (after scaling). */
  url: string
  scaled: boolean
}

interface Result {
  svg: string
  url: string
  shapes: number
  bytes: number
  ms: number
}

const CHECKER: CSSProperties = {
  backgroundColor: '#fff',
  backgroundImage:
    'linear-gradient(45deg,#e4e4e7 25%,transparent 25%,transparent 75%,#e4e4e7 75%),linear-gradient(45deg,#e4e4e7 25%,transparent 25%,transparent 75%,#e4e4e7 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0,10px 10px',
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block min-w-44 flex-1 space-y-2 text-xs font-medium text-muted-foreground">
      <span className="flex items-baseline justify-between gap-2">
        {label}
        <span className="font-mono text-foreground">{hint}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-brand-2" />
    </label>
  )
}

export default function ImageToSvg() {
  const t = useT()
  const [picked, setPicked] = useState<Picked | null>(null)
  const [opts, setOpts] = useState<TraceOptions>(DEFAULTS)
  const [fill, setFill] = useState('#000000')
  const [raw, setRaw] = useState<{ svg: string; ms: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resultUrl = useRef<string | null>(null)

  const set = <K extends keyof TraceOptions>(key: K, value: TraceOptions[K]) => setOpts((o) => ({ ...o, [key]: value }))

  // Trace again shortly after the picture or a setting changes; a newer run cancels the older one.
  useEffect(() => {
    if (!picked) return
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      setBusy(true)
      setError(null)
      const start = performance.now()
      traceImage(picked.pixels, picked.width, picked.height, opts, ctrl.signal)
        .then((svg) => {
          setRaw({ svg, ms: performance.now() - start })
          setBusy(false)
        })
        .catch((err: unknown) => {
          if (ctrl.signal.aborted) return
          setBusy(false)
          setError(
            err instanceof TraceTimeout
              ? t(
                  'Gambar ini terlalu rumit untuk dijiplak. Coba mode hitam-putih, kurangi detail warna, atau naikkan "Bersihkan bintik".',
                  'This picture is too complex to trace. Try black & white, lower the colour detail, or raise "Remove specks".',
                )
              : t(
                  'Penjiplakan gagal untuk gambar dan pengaturan ini. Coba ubah pengaturan atau pakai mode lain.',
                  'Tracing failed for this image and these settings. Change a setting or try the other mode.',
                ),
          )
        })
    }, 250)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [picked, opts, t])

  // Recolouring a black-and-white trace needs no new trace.
  const result = useMemo<Result | null>(() => {
    if (!raw || !picked) return null
    const { svg, shapes } = finishSvg(raw.svg, picked.width, picked.height, opts.mode === 'bw' ? fill : null)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    return { svg, url: URL.createObjectURL(blob), shapes, bytes: blob.size, ms: raw.ms }
  }, [raw, picked, fill, opts.mode])

  useEffect(() => {
    if (resultUrl.current && resultUrl.current !== result?.url) URL.revokeObjectURL(resultUrl.current)
    resultUrl.current = result?.url ?? null
  }, [result])

  useEffect(
    () => () => {
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current)
    },
    [],
  )
  useEffect(
    () => () => {
      if (picked) URL.revokeObjectURL(picked.url)
    },
    [picked],
  )

  async function open(file: File) {
    setError(null)
    setOpening(true)
    try {
      const img = await decodeImage(file)
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
      const canvas = newCanvas(img.width * scale, img.height * scale)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height)
      img.close()
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r))
      setRaw(null)
      setPicked({
        name: file.name,
        pixels: data,
        width: canvas.width,
        height: canvas.height,
        url: URL.createObjectURL(blob ?? file),
        scaled: scale < 1,
      })
    } catch {
      setError(t('Gambar tidak bisa dibaca. Coba file PNG atau JPG lain.', "The image can't be read. Try another PNG or JPG."))
    } finally {
      setOpening(false)
    }
  }

  function reset() {
    setPicked(null)
    setRaw(null)
    setError(null)
  }

  if (!picked) {
    return (
      <div className="space-y-4">
        <FileDrop
          accept="image/*"
          label={t('Tarik logo atau gambar ke sini', 'Drop a logo or image here')}
          busyLabel={opening ? t('Membuka gambar…', 'Opening image…') : undefined}
          onFiles={([f]) => void open(f)}
        />
        {error && <ErrorNote message={error} />}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            'Paling bagus untuk logo, ikon, stiker, tanda tangan, dan ilustrasi dengan warna rata. Foto biasa tidak cocok: hasilnya jadi ribuan bentuk kecil dan filenya besar.',
            'Works best on logos, icons, stickers, signatures and flat-colour illustrations. Ordinary photos are a poor fit: they turn into thousands of tiny shapes and a large file.',
          )}
        </p>
      </div>
    )
  }

  const tooBusy = result && result.shapes > BUSY_SHAPES

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <figure className="space-y-2">
          <figcaption className="font-mono text-xs text-muted-foreground">{t('Asli', 'Original')}</figcaption>
          <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border p-3" style={CHECKER}>
            <img src={picked.url} alt={t('Gambar asli', 'Original image')} className="max-h-full max-w-full object-contain" />
          </div>
        </figure>
        <figure className="space-y-2">
          <figcaption className="font-mono text-xs text-muted-foreground">SVG</figcaption>
          <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl border p-3" style={CHECKER}>
            {result && <img src={result.url} alt={t('Hasil SVG', 'SVG result')} className="max-h-full max-w-full object-contain" />}
            {busy && (
              <div className="absolute inset-0 grid place-items-center bg-background/50">
                <span className="flex items-center gap-2 rounded-full border bg-popover px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t('Menjiplak…', 'Tracing…')}
                </span>
              </div>
            )}
          </div>
        </figure>
      </div>

      {result && (
        <p className="-mt-2 text-right font-mono text-xs text-muted-foreground">
          {formatBytes(result.bytes)} · {result.shapes.toLocaleString(locale())} {t('bentuk', 'shapes')} ·{' '}
          {(result.ms / 1000).toLocaleString(locale(), { maximumFractionDigits: 1 })} {t('detik', 's')}
        </p>
      )}

      {tooBusy && (
        <p className="flex items-start gap-2 rounded-xl border px-3 py-2 text-xs text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-brand-2" />
          {t(
            'Hasilnya sangat banyak bentuk, biasanya karena gambarnya foto atau penuh gradasi. Coba kurangi detail warna atau naikkan "Bersihkan bintik".',
            'This result has a great many shapes, usually because the picture is a photo or full of gradients. Lower the colour detail or raise "Remove specks".',
          )}
        </p>
      )}

      <div className="space-y-5 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <Segmented<TraceMode>
            label={t('Mode', 'Mode')}
            value={opts.mode}
            options={[
              { value: 'color', label: t('Warna', 'Colour') },
              { value: 'bw', label: t('Hitam-putih', 'Black & white') },
            ]}
            onChange={(v) => set('mode', v)}
          />
          <Segmented<TraceShape>
            label={t('Bentuk garis', 'Outline')}
            value={opts.shape}
            options={[
              { value: 'spline', label: t('Kurva', 'Curves') },
              { value: 'polygon', label: t('Garis lurus', 'Straight') },
              { value: 'pixel', label: t('Piksel', 'Pixels') },
            ]}
            onChange={(v) => set('shape', v)}
          />
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {opts.mode === 'color' ? (
            <>
              <Slider
                label={t('Detail warna', 'Colour detail')}
                hint={`${opts.detail}/7`}
                value={opts.detail}
                min={1}
                max={7}
                onChange={(v) => set('detail', v)}
              />
              <Slider
                label={t('Gabung warna mirip', 'Merge similar colours')}
                hint={String(opts.merge)}
                value={opts.merge}
                min={1}
                max={96}
                onChange={(v) => set('merge', v)}
              />
            </>
          ) : (
            <>
              <Slider
                label={t('Ambang gelap', 'Darkness threshold')}
                hint={String(opts.threshold)}
                value={opts.threshold}
                min={20}
                max={235}
                onChange={(v) => set('threshold', v)}
              />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t('Warna hasil', 'Fill colour')}</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={fill}
                    onChange={(e) => setFill(e.target.value)}
                    aria-label={t('Warna hasil', 'Fill colour')}
                    className="h-9 w-12 cursor-pointer rounded-lg border bg-background p-1"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={opts.invert} onChange={(e) => set('invert', e.target.checked)} className="size-4" />
                    {t('Jiplak bagian terang', 'Trace the light parts')}
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <Slider
            label={t('Bersihkan bintik', 'Remove specks')}
            hint={`${opts.speckle} px`}
            value={opts.speckle}
            min={1}
            max={12}
            onChange={(v) => set('speckle', v)}
          />
          {opts.shape === 'spline' && (
            <Slider
              label={t('Sudut tajam', 'Sharp corners')}
              hint={`${opts.corner}°`}
              value={opts.corner}
              min={0}
              max={180}
              step={5}
              onChange={(v) => set('corner', v)}
            />
          )}
        </div>
        {picked.scaled && (
          <p className="text-xs text-muted-foreground">
            {t(
              `Gambar diperkecil ke ${picked.width}×${picked.height} px dulu supaya cepat. SVG tetap tajam di ukuran berapa pun.`,
              `The image was scaled to ${picked.width}×${picked.height} px first to keep it quick. The SVG stays sharp at any size.`,
            )}
          </p>
        )}
      </div>

      {error && <ErrorNote message={error} />}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={!result || busy}
          onClick={() => result && downloadBlob(new Blob([result.svg], { type: 'image/svg+xml' }), withExtension(picked.name, '.svg'))}
        >
          <Download />
          {t('Unduh SVG', 'Download SVG')}
        </Button>
        <CopyButton text={result && !busy ? result.svg : ''} label={t('Salin kode SVG', 'Copy SVG code')} variant="outline" />
        <Button variant="ghost" onClick={() => setOpts(DEFAULTS)}>
          {t('Pengaturan awal', 'Reset settings')}
        </Button>
        <Button variant="ghost" onClick={reset}>
          <RotateCcw />
          {t('Gambar lain', 'Another image')}
        </Button>
      </div>
    </div>
  )
}
