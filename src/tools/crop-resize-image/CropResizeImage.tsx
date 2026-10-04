import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Download, FlipHorizontal2, FlipVertical2, Link2, Link2Off, Loader2, RotateCcw, RotateCw, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { IconButton } from '@/components/tool/IconButton'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { decodeImage, formatBytes, type DecodedImage } from '@/lib/image'
import { cn } from '@/lib/utils'
import { dragRect, exportImage, fitRect, orient, type Handle, type Orientation, type OutFormat, type Rect } from './crop'

const RATIOS = [
  { value: 'free', label: 'Bebas', ratio: null },
  { value: 'original', label: 'Asli', ratio: null },
  { value: '1:1', label: '1:1', ratio: 1 },
  { value: '4:3', label: '4:3', ratio: 4 / 3 },
  { value: '3:2', label: '3:2', ratio: 3 / 2 },
  { value: '16:9', label: '16:9', ratio: 16 / 9 },
  { value: '4:5', label: '4:5', ratio: 4 / 5 },
  { value: '9:16', label: '9:16', ratio: 9 / 16 },
] as const
type RatioKey = (typeof RATIOS)[number]['value']

type Resize = { mode: 'scale'; pct: number } | { mode: 'custom'; w: number; h: number; lock: boolean }
const SCALE_OPTIONS: { value: string; label: string }[] = [
  { value: '1', label: '100%' },
  { value: '0.75', label: '75%' },
  { value: '0.5', label: '50%' },
  { value: '0.25', label: '25%' },
  { value: 'custom', label: 'Kustom' },
]

type FormatChoice = 'same' | OutFormat
const FORMAT_OPTIONS: { value: FormatChoice; label: string }[] = [
  { value: 'same', label: 'Sama' },
  { value: 'jpeg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
]
const EXT: Record<OutFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' }

const HANDLES: { handle: Handle; className: string }[] = [
  { handle: 'nw', className: '-left-1.5 -top-1.5 cursor-nwse-resize' },
  { handle: 'ne', className: '-right-1.5 -top-1.5 cursor-nesw-resize' },
  { handle: 'sw', className: '-left-1.5 -bottom-1.5 cursor-nesw-resize' },
  { handle: 'se', className: '-right-1.5 -bottom-1.5 cursor-nwse-resize' },
  { handle: 'n', className: 'left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize' },
  { handle: 's', className: 'left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize' },
  { handle: 'w', className: 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize' },
  { handle: 'e', className: 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize' },
]

interface Drag {
  handle: Handle
  startX: number
  startY: number
  from: Rect
  /** Image pixels per screen pixel. */
  scale: number
}

const sameFormat = (file: File): OutFormat =>
  file.type === 'image/jpeg' ? 'jpeg' : file.type === 'image/webp' ? 'webp' : 'png'

export default function CropResizeImage() {
  const [file, setFile] = useState<File | null>(null)
  const [image, setImage] = useState<DecodedImage | null>(null)
  const [orientation, setOrientation] = useState<Orientation>({ rotation: 0, flipX: false, flipY: false })
  const [view, setView] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null)
  const [ratioKey, setRatioKey] = useState<RatioKey>('free')
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 })
  const [resize, setResize] = useState<Resize>({ mode: 'scale', pct: 1 })
  const [format, setFormat] = useState<FormatChoice>('same')
  const [quality, setQuality] = useState(0.9)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const drag = useRef<Drag | null>(null)

  const W = view?.canvas.width ?? 0
  const H = view?.canvas.height ?? 0
  const ratio = ratioKey === 'original' ? W / H : (RATIOS.find((r) => r.value === ratioKey)?.ratio ?? null)

  async function open(next: File) {
    setError(null)
    setLoading(true)
    try {
      const decoded = await decodeImage(next)
      image?.close()
      setFile(next)
      setImage(decoded)
      setOrientation({ rotation: 0, flipX: false, flipY: false })
      setRatioKey('free')
      setResize({ mode: 'scale', pct: 1 })
    } catch {
      setError('Gambar tidak bisa dibaca browser ini. Coba JPG, PNG, atau WebP.')
    } finally {
      setLoading(false)
    }
  }

  // Redraw the rotated/flipped image, and start the crop over on it.
  useEffect(() => {
    if (!image) return
    const canvas = orient(image, orientation)
    const preview = document.createElement('canvas')
    const s = Math.min(1, 1600 / Math.max(canvas.width, canvas.height))
    preview.width = Math.round(canvas.width * s)
    preview.height = Math.round(canvas.height * s)
    preview.getContext('2d')!.drawImage(canvas, 0, 0, preview.width, preview.height)
    let url = ''
    let current = true
    preview.toBlob((b) => {
      if (!b || !current) return
      url = URL.createObjectURL(b)
      setView({ canvas, url })
    })
    return () => {
      current = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [image, orientation])

  // A new image, orientation, or ratio resets the crop to the largest fitting box.
  useEffect(() => {
    if (W && H) setCrop(fitRect(W, H, ratio))
  }, [W, H, ratio])

  const out = useMemo(() => {
    if (!crop.w) return { w: 0, h: 0 }
    if (resize.mode === 'scale') return { w: Math.max(1, Math.round(crop.w * resize.pct)), h: Math.max(1, Math.round(crop.h * resize.pct)) }
    return { w: resize.w, h: resize.lock ? Math.max(1, Math.round((resize.w * crop.h) / crop.w)) : resize.h }
  }, [crop, resize])

  function startDrag(e: PointerEvent<HTMLElement>, handle: Handle) {
    e.stopPropagation()
    e.preventDefault()
    const box = e.currentTarget.closest('[data-crop-area]')
    if (!box) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { handle, startX: e.clientX, startY: e.clientY, from: crop, scale: W / box.getBoundingClientRect().width }
  }

  function onDrag(e: PointerEvent<HTMLElement>) {
    const d = drag.current
    if (!d) return
    setCrop(dragRect(d.from, d.handle, (e.clientX - d.startX) * d.scale, (e.clientY - d.startY) * d.scale, ratio, W, H))
  }

  const endDrag = () => (drag.current = null)

  const outFormat: OutFormat = format === 'same' ? (file ? sameFormat(file) : 'png') : format

  async function save() {
    if (!view || !file || !out.w || !out.h) return
    setSaving(true)
    setError(null)
    try {
      const blob = await exportImage(view.canvas, crop, out, outFormat, quality)
      downloadBlob(blob, `${file.name.replace(/\.[^.]+$/, '')}-${out.w}x${out.h}.${EXT[outFormat]}`)
    } catch {
      setError('Gagal menyimpan gambar. Coba ukuran yang lebih kecil.')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    image?.close()
    setImage(null)
    setView(null)
    setFile(null)
  }

  if (!image || !view || !file) {
    return (
      <div className="space-y-6">
        <FileDrop
          accept="image/*"
          label="Tarik gambar ke sini"
          busyLabel={loading ? 'Membuka gambar…' : undefined}
          onFiles={([f]) => void open(f)}
        />
        <p className="text-center text-xs text-muted-foreground">JPG, PNG, WebP, GIF, BMP, SVG.</p>
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  const pct = (v: number, of: number) => `${(v / of) * 100}%`
  const box = { left: pct(crop.x, W), top: pct(crop.y, H), width: pct(crop.w, W), height: pct(crop.h, H) }
  const lossy = outFormat !== 'png'
  const customW = resize.mode === 'custom' ? resize.w : out.w

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {W} × {H} px · {formatBytes(file.size)} → potong {Math.round(crop.w)} × {Math.round(crop.h)} → hasil{' '}
            <span className="font-medium text-foreground">
              {out.w} × {out.h} px
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={saving || !out.w || !out.h}>
            {saving ? <Loader2 className="animate-spin" /> : <Download />}
            Unduh {EXT[outFormat].toUpperCase()}
          </Button>
          <Button variant="ghost" disabled={saving} onClick={reset}>
            <RotateCcw />
            Gambar lain
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex">
              <IconButton
                label="Putar ke kiri"
                onClick={() => setOrientation((o) => ({ ...o, rotation: ((o.rotation + 270) % 360) as Orientation['rotation'] }))}
              >
                <Undo2 />
              </IconButton>
              <IconButton
                label="Putar ke kanan"
                onClick={() => setOrientation((o) => ({ ...o, rotation: ((o.rotation + 90) % 360) as Orientation['rotation'] }))}
              >
                <RotateCw />
              </IconButton>
              <IconButton label="Balik mendatar" onClick={() => setOrientation((o) => ({ ...o, flipX: !o.flipX }))}>
                <FlipHorizontal2 />
              </IconButton>
              <IconButton label="Balik tegak" onClick={() => setOrientation((o) => ({ ...o, flipY: !o.flipY }))}>
                <FlipVertical2 />
              </IconButton>
            </div>
            <button
              type="button"
              onClick={() => setCrop(fitRect(W, H, ratio))}
              className="text-xs font-medium text-brand-2 hover:underline"
            >
              Reset potongan
            </button>
          </div>

          <div className="grid place-items-center rounded-2xl border bg-muted/60 p-4">
            <div
              data-crop-area
              className="relative max-h-[70vh] select-none"
              style={{ aspectRatio: `${W} / ${H}`, width: `min(100%, calc(70vh * ${W / H}))` }}
            >
              {/* Image and dimmed surroundings, clipped to the image. */}
              <div className="absolute inset-0 overflow-hidden">
                <img src={view.url} alt="" draggable={false} className="absolute inset-0 size-full" />
                {crop.w > 0 && (
                  <div
                    onPointerDown={(e) => startDrag(e, 'move')}
                    onPointerMove={onDrag}
                    onPointerUp={endDrag}
                    className="absolute cursor-move touch-none outline-2 outline-white shadow-[0_0_0_9999px_rgb(0_0_0/0.55)]"
                    style={box}
                  >
                    {/* Rule-of-thirds guides. */}
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                      {Array.from({ length: 9 }, (_, i) => (
                        <span key={i} className="border-[0.5px] border-white/40" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Handles sit outside the clip so they stay grabbable at the image edges. */}
              {crop.w > 0 && (
                <div className="pointer-events-none absolute" style={box}>
                  {HANDLES.map(({ handle, className }) => (
                    <span
                      key={handle}
                      onPointerDown={(e) => startDrag(e, handle)}
                      onPointerMove={onDrag}
                      onPointerUp={endDrag}
                      className={cn(
                        'pointer-events-auto absolute size-3 touch-none rounded-sm border border-black/30 bg-white shadow',
                        className,
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Seret kotak untuk memindah, tarik titik putihnya untuk mengubah potongan.</p>
        </div>

        <div className="space-y-5 rounded-2xl border bg-card p-5">
          <Segmented label="Rasio potongan" value={ratioKey} options={[...RATIOS]} onChange={setRatioKey} />

          <div className="space-y-3">
            <Segmented
              label="Ukuran hasil"
              value={resize.mode === 'custom' ? 'custom' : String(resize.pct)}
              options={SCALE_OPTIONS}
              onChange={(v) =>
                setResize(v === 'custom' ? { mode: 'custom', w: out.w, h: out.h, lock: true } : { mode: 'scale', pct: Number(v) })
              }
            />
            {resize.mode === 'custom' && (
              <div className="flex items-end gap-2">
                <NumberField
                  label="Lebar (px)"
                  value={customW}
                  onChange={(w) => setResize({ ...resize, w })}
                />
                <button
                  type="button"
                  aria-label={resize.lock ? 'Lepas kunci rasio' : 'Kunci rasio'}
                  title={resize.lock ? 'Rasio terkunci' : 'Rasio bebas'}
                  onClick={() => setResize({ ...resize, lock: !resize.lock, h: out.h })}
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-xl border',
                    resize.lock ? 'border-brand-2/40 bg-brand-2/10 text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {resize.lock ? <Link2 className="size-4" /> : <Link2Off className="size-4" />}
                </button>
                <NumberField
                  label="Tinggi (px)"
                  value={out.h}
                  disabled={resize.lock}
                  onChange={(h) => setResize({ ...resize, h })}
                />
              </div>
            )}
          </div>

          <Segmented label="Format" value={format} options={FORMAT_OPTIONS} onChange={setFormat} />
          {lossy && (
            <label className="block space-y-2">
              <span className="flex justify-between text-xs font-medium text-muted-foreground">
                Kualitas <span className="font-mono text-foreground">{Math.round(quality * 100)}</span>
              </span>
              <input
                type="range"
                min={40}
                max={100}
                step={5}
                value={Math.round(quality * 100)}
                onChange={(e) => setQuality(Number(e.target.value) / 100)}
                className="w-full accent-[var(--brand-2)]"
              />
            </label>
          )}
          {outFormat === 'jpeg' && (
            <p className="text-xs text-muted-foreground">JPG tidak punya transparansi — area transparan jadi putih.</p>
          )}
        </div>
      </div>

      {error && <ErrorNote message={error} />}
    </div>
  )
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <label className="block min-w-0 flex-1 space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        min={1}
        max={16384}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.min(16384, Math.max(1, Math.round(Number(e.target.value) || 1))))}
        className="h-10 w-full rounded-xl border bg-background px-3 font-mono text-sm outline-none focus:border-brand-2/60 disabled:opacity-60"
      />
    </label>
  )
}
