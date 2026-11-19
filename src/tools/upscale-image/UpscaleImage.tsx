import { useEffect, useRef, useState } from 'react'
import { Download, RotateCcw, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { ProgressCard } from '@/components/tool/SizeResult'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { canvasBlob, decodeImage, formatBytes, newCanvas, UnreadableImageError, type DecodedImage } from '@/lib/image'
import { useT } from '@/lib/i18n'
import { CancelledError, MAX_INPUT_PIXELS, upscale, type Backend } from './upscale'

type Format = 'png' | 'jpg'
type Phase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'working'; done: number; total: number; startedAt: number }
  | { kind: 'done'; url: string; blob: Blob; width: number; height: number; backend?: Backend }

const ACCEPT = 'image/jpeg,image/png,image/webp,image/bmp,image/avif,image/gif'

export default function UpscaleImage() {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [image, setImage] = useState<DecodedImage | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scale, setScale] = useState<2 | 4>(4)
  const [format, setFormat] = useState<Format>('png')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [split, setSplit] = useState(50)
  const signal = useRef({ cancelled: false })

  // Free the object URLs when they are replaced.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])
  useEffect(() => () => void (phase.kind === 'done' && URL.revokeObjectURL(phase.url)), [phase])

  async function open(next: File) {
    setError(null)
    setPhase({ kind: 'idle' })
    try {
      const decoded = await decodeImage(next)
      image?.close()
      setImage(decoded)
      setFile(next)
      setPreview(URL.createObjectURL(next))
      setFormat(/png|webp|gif/i.test(next.type) ? 'png' : 'jpg')
    } catch (e) {
      setError(
        e instanceof UnreadableImageError
          ? t('Gambar tidak bisa dibuka. Coba JPG, PNG, atau WebP.', "The image couldn't be opened. Try JPG, PNG or WebP.")
          : t('Gagal membuka gambar.', "Couldn't open the image."),
      )
    }
  }

  function reset() {
    image?.close()
    setImage(null)
    setFile(null)
    setPreview(null)
    setPhase({ kind: 'idle' })
    setError(null)
  }

  async function run() {
    if (!image || !file) return
    setError(null)
    signal.current = { cancelled: false }
    setPhase({ kind: 'loading' })
    const startedAt = Date.now()
    try {
      const canvas = await upscale(image, {
        scale,
        signal: signal.current,
        onProgress: (done, total) => setPhase({ kind: 'working', done, total, startedAt }),
      })
      let target = canvas
      if (format === 'jpg') {
        // JPG has no transparency: put it on white.
        target = newCanvas(canvas.width, canvas.height)
        const ctx = target.getContext('2d')!
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, target.width, target.height)
        ctx.drawImage(canvas, 0, 0)
      }
      const blob = await canvasBlob(target, format === 'png' ? 'image/png' : 'image/jpeg', 0.92)
      const { width, height } = canvas
      canvas.width = canvas.height = 0
      target.width = target.height = 0
      setPhase({ kind: 'done', url: URL.createObjectURL(blob), blob, width, height })
    } catch (e) {
      setPhase({ kind: 'idle' })
      if (e instanceof CancelledError) return
      setError(
        t(
          'Upscale gagal. Biasanya karena memori perangkat tidak cukup: coba skala 2× atau gambar yang lebih kecil.',
          'Upscaling failed, usually because the device ran out of memory: try 2× or a smaller image.',
        ),
      )
    }
  }

  function save() {
    if (phase.kind !== 'done' || !file) return
    const base = file.name.replace(/\.[^.]+$/, '')
    downloadBlob(phase.blob, `${base}-${scale}x.${format}`)
  }

  if (!image || !file || !preview) {
    return (
      <div className="space-y-6">
        <FileDrop accept={ACCEPT} label={t('Tarik foto atau gambar ke sini', 'Drag a photo or image here')} onFiles={([f]) => void open(f)} />
        {error && <ErrorNote message={error} />}
        <p className="text-xs text-muted-foreground">
          {t(
            'Pertama kali dipakai, model AI dan mesinnya (±12 MB) diunduh sekali dari situs ini, lalu tersimpan di browser. Fotomu tidak pernah diunggah.',
            'The first time, the AI model and its runtime (~12 MB) are downloaded once from this site and kept by the browser. Your photo is never uploaded.',
          )}
        </p>
      </div>
    )
  }

  const tooBig = image.width * image.height > MAX_INPUT_PIXELS[scale]
  const busy = phase.kind === 'loading' || phase.kind === 'working'
  const outW = image.width * scale
  const outH = image.height * scale

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{file.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {image.width}×{image.height} → {outW}×{outH} px
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {phase.kind === 'done' ? (
            <Button onClick={save}>
              <Download />
              {t(`Unduh ${format.toUpperCase()}`, `Download ${format.toUpperCase()}`)}
            </Button>
          ) : (
            <Button onClick={() => void run()} disabled={busy || tooBig}>
              <Sparkles />
              {t(`Upscale ${scale}×`, `Upscale ${scale}×`)}
            </Button>
          )}
          <Button variant="ghost" disabled={busy} onClick={reset}>
            <RotateCcw />
            {t('Gambar lain', 'Another image')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
        <Segmented
          label={t('Perbesar', 'Enlarge')}
          value={scale}
          options={[
            { value: 2, label: '2×' },
            { value: 4, label: '4×' },
          ]}
          disabled={busy}
          onChange={(v) => {
            setScale(v)
            setPhase({ kind: 'idle' })
          }}
        />
        <Segmented
          label="Format"
          value={format}
          options={[
            { value: 'png', label: 'PNG' },
            { value: 'jpg', label: 'JPG' },
          ]}
          disabled={busy}
          onChange={(v) => {
            setFormat(v)
            setPhase({ kind: 'idle' })
          }}
        />
      </div>

      {tooBig && (
        <ErrorNote
          message={t(
            `Gambar ini terlalu besar untuk ${scale}× di browser (maks. ${(MAX_INPUT_PIXELS[scale] / 1e6).toFixed(0)} megapiksel). Pilih 2× atau perkecil dulu dengan “Crop & Resize Gambar”.`,
            `This image is too large for ${scale}× in the browser (max. ${(MAX_INPUT_PIXELS[scale] / 1e6).toFixed(0)} megapixels). Pick 2× or shrink it first with “Crop & Resize Image”.`,
          )}
        />
      )}

      {phase.kind === 'loading' && (
        <ProgressCard label={t('Memuat model AI…', 'Loading the AI model…')} progress={0} startedAt={Date.now()} />
      )}
      {phase.kind === 'working' && (
        <ProgressCard
          label={t(`Memproses bagian ${phase.done}/${phase.total}…`, `Processing tile ${phase.done}/${phase.total}…`)}
          progress={phase.total ? phase.done / phase.total : 0}
          startedAt={phase.startedAt}
          action={
            <Button variant="ghost" size="sm" onClick={() => (signal.current.cancelled = true)}>
              <X />
              {t('Batal', 'Cancel')}
            </Button>
          }
        />
      )}

      {phase.kind === 'done' ? (
        <div className="space-y-3">
          <div
            className="relative mx-auto overflow-hidden rounded-2xl border bg-muted/60"
            style={{ aspectRatio: `${image.width} / ${image.height}`, maxWidth: `min(100%, calc(70vh * ${image.width / image.height}))` }}
          >
            {/* Left of the handle: the original stretched by the browser; right: the AI result. */}
            <img src={phase.url} alt={t('Hasil upscale', 'Upscaled result')} className="absolute inset-0 size-full object-contain" />
            <img
              src={preview}
              alt={t('Asli', 'Original')}
              className="absolute inset-0 size-full object-contain [image-rendering:auto]"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-brand-fill" style={{ left: `${split}%` }} />
            <span className="absolute top-2 left-2 rounded-md bg-background/80 px-2 py-0.5 font-mono text-[11px]">{t('Asli', 'Original')}</span>
            <span className="absolute top-2 right-2 rounded-md bg-background/80 px-2 py-0.5 font-mono text-[11px]">{scale}× AI</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={(e) => setSplit(+e.target.value)}
            aria-label={t('Geser untuk membandingkan', 'Slide to compare')}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            {t('Geser untuk membandingkan. Perbesar halaman untuk melihat detail.', 'Slide to compare. Zoom the page in to see the detail.')}{' '}
            <span className="font-mono">
              {phase.width}×{phase.height} px · {formatBytes(phase.blob.size)}
            </span>
          </p>
        </div>
      ) : (
        !busy && (
          <div className="overflow-hidden rounded-2xl border bg-muted/60 p-3">
            <img src={preview} alt={file.name} className="mx-auto max-h-[60vh] rounded-sm object-contain" />
          </div>
        )
      )}

      {error && <ErrorNote message={error} />}

      <p className="text-xs text-muted-foreground">
        {t(
          'Pakai model Real-ESRGAN di perangkatmu (GPU lewat WebGPU bila ada). Di HP atau laptop lama tanpa WebGPU prosesnya bisa beberapa menit. Cocok untuk foto yang pecah atau buram karena kecil; wajah atau teks yang sangat kabur tidak bisa dipulihkan sepenuhnya.',
          'Runs the Real-ESRGAN model on your device (GPU via WebGPU when available). On older phones or laptops without WebGPU it can take a few minutes. Works best on photos that are small or pixelated; very blurry faces or text cannot be fully recovered.',
        )}
      </p>
    </div>
  )
}
