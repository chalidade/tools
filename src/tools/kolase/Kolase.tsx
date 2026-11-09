import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { canvasBlob, decodeImage, newCanvas, UnreadableImageError, type DecodedImage } from '@/lib/image'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { computeRects, coverCrop, RATIOS, type LayoutId, type RatioId } from './layout'

interface Photo {
  id: number
  name: string
  img: DecodedImage
  thumb: string
}

const MAX = 9
const BACKGROUNDS = { white: '#ffffff', black: '#111111', gray: '#e4e4e7' } as const
type Bg = keyof typeof BACKGROUNDS

function render(canvas: HTMLCanvasElement, photos: Photo[], o: { layout: LayoutId; ratio: RatioId; gap: number; radius: number; bg: Bg }) {
  const [W, H] = RATIOS[o.ratio]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = BACKGROUNDS[o.bg]
  ctx.fillRect(0, 0, W, H)
  const rects = computeRects(o.layout, photos.length, W, H, o.gap)
  rects.forEach((r, i) => {
    const { img } = photos[i]
    const c = coverCrop(img.width, img.height, r.w, r.h)
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(r.x, r.y, r.w, r.h, Math.min(o.radius, r.w / 2, r.h / 2))
    ctx.clip()
    ctx.drawImage(img.source, c.sx, c.sy, c.sw, c.sh, r.x, r.y, r.w, r.h)
    ctx.restore()
  })
}

export default function Kolase() {
  const t = useT()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [layout, setLayout] = useState<LayoutId>('grid')
  const [ratio, setRatio] = useState<RatioId>('1:1')
  const [gap, setGap] = useState(16)
  const [radius, setRadius] = useState(24)
  const [bg, setBg] = useState<Bg>('white')
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nextId = useRef(1)
  const photosRef = useRef<Photo[]>([])
  photosRef.current = photos

  useEffect(
    () => () =>
      photosRef.current.forEach((p) => {
        p.img.close()
        URL.revokeObjectURL(p.thumb)
      }),
    [],
  )

  useEffect(() => {
    if (canvasRef.current && photos.length) render(canvasRef.current, photos, { layout, ratio, gap, radius, bg })
  }, [photos, layout, ratio, gap, radius, bg])

  async function add(files: File[]) {
    setError(null)
    setBusy(true)
    const room = MAX - photos.length
    const added: Photo[] = []
    let failed = false
    for (const f of files.slice(0, room)) {
      try {
        const img = await decodeImage(f)
        added.push({ id: nextId.current++, name: f.name, img, thumb: URL.createObjectURL(f) })
      } catch (e) {
        if (e instanceof UnreadableImageError) failed = true
        else throw e
      }
    }
    setPhotos((p) => [...p, ...added])
    setBusy(false)
    if (failed) setError(t('Sebagian file bukan gambar yang bisa dibaca (JPG, PNG, WebP).', 'Some files were not readable images (JPG, PNG, WebP).'))
    else if (files.length > room) setError(t(`Maksimal ${MAX} foto.`, `At most ${MAX} photos.`))
  }

  function move(i: number, d: number) {
    setPhotos((p) => {
      const j = i + d
      if (j < 0 || j >= p.length) return p
      const next = [...p]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function remove(i: number) {
    const p = photos[i]
    p.img.close()
    URL.revokeObjectURL(p.thumb)
    setPhotos((all) => all.filter((_, k) => k !== i))
  }

  async function save() {
    const canvas = newCanvas(1, 1)
    render(canvas, photos, { layout, ratio, gap, radius, bg })
    const blob = await canvasBlob(canvas, format === 'png' ? 'image/png' : 'image/jpeg', 0.92)
    downloadBlob(blob, `kolase.${format}`)
  }

  const layouts: { value: LayoutId; label: string }[] = [
    { value: 'grid', label: t('Grid', 'Grid') },
    { value: 'strip-v', label: t('Strip tegak', 'Vertical strip') },
    { value: 'strip-h', label: t('Strip datar', 'Horizontal strip') },
    { value: 'big', label: t('Satu besar', 'One big') },
  ]

  return (
    <div className="space-y-6">
      {photos.length < MAX && (
        <FileDrop
          multiple
          accept="image/*"
          label={photos.length ? t('Tambah foto', 'Add photos') : t('Tarik 2–9 foto ke sini', 'Drop 2–9 photos here')}
          busyLabel={busy ? t('Membuka foto…', 'Opening photos…') : undefined}
          onFiles={(f) => void add(f)}
        />
      )}
      {error && <ErrorNote message={error} />}

      {photos.length > 0 && (
        <>
          <ul className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <li key={p.id} className="relative">
                <img src={p.thumb} alt={p.name} className="size-20 rounded-lg border object-cover" />
                <button
                  type="button"
                  aria-label={t('Hapus', 'Remove')}
                  onClick={() => remove(i)}
                  className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background"
                >
                  <X className="size-3" />
                </button>
                <div className="mt-1 flex justify-center gap-1">
                  <button type="button" aria-label={t('Geser maju', 'Move earlier')} disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 text-muted-foreground disabled:opacity-30">
                    <ArrowLeft className="size-4" />
                  </button>
                  <button type="button" aria-label={t('Geser mundur', 'Move later')} disabled={i === photos.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 text-muted-foreground disabled:opacity-30">
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex justify-center rounded-2xl border bg-muted/40 p-3">
              <canvas ref={canvasRef} className="max-h-[70vh] w-auto max-w-full rounded-lg shadow" aria-label={t('Pratinjau kolase', 'Collage preview')} />
            </div>
            <div className="space-y-4 rounded-2xl border bg-card p-4">
              <Segmented label={t('Tata letak', 'Layout')} value={layout} options={layouts} onChange={setLayout} />
              <Segmented
                label={t('Rasio', 'Ratio')}
                value={ratio}
                options={(Object.keys(RATIOS) as RatioId[]).map((r) => ({ value: r, label: r }))}
                onChange={setRatio}
              />
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Jarak', 'Spacing')}: {gap}px
                <input type="range" min={0} max={60} value={gap} onChange={(e) => setGap(+e.target.value)} className="w-full" />
              </label>
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Sudut membulat', 'Corner radius')}: {radius}px
                <input type="range" min={0} max={120} value={radius} onChange={(e) => setRadius(+e.target.value)} className="w-full" />
              </label>
              <Segmented
                label={t('Latar', 'Background')}
                value={bg}
                options={[
                  { value: 'white', label: t('Putih', 'White') },
                  { value: 'gray', label: t('Abu', 'Gray') },
                  { value: 'black', label: t('Hitam', 'Black') },
                ]}
                onChange={setBg}
              />
              <Segmented label={t('Format', 'Format')} value={format} options={[{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }]} onChange={setFormat} />
              <Button className="w-full" onClick={() => void save()}>
                <Download />
                {t('Unduh kolase', 'Download collage')}
              </Button>
              {photos.length < 2 && (
                <p className="text-xs text-muted-foreground">{t('Tambah minimal 2 foto untuk kolase.', 'Add at least 2 photos for a collage.')}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
