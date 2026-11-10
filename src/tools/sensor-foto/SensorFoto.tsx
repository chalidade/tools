import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Download, TriangleAlert, Undo2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { canvasBlob, decodeImage, newCanvas, UnreadableImageError, type DecodedImage } from '@/lib/image'
import { downloadBlob, withExtension } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { blurRadius, blurRGBA, pixelBlock, pixelateRGBA, rectFrom, type Mode, type Region } from './effects'

const PREVIEW_MAX = 1400

/** The whole picture pixelated or blurred, at the given canvas size. */
function effectCanvas(img: DecodedImage, W: number, H: number, mode: 'pixel' | 'blur', level: number) {
  const c = newCanvas(W, H)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img.source, 0, 0, W, H)
  const data = ctx.getImageData(0, 0, W, H)
  const out = mode === 'pixel' ? pixelateRGBA(data.data, W, H, pixelBlock(W, level)) : blurRGBA(data.data, W, H, blurRadius(W, level))
  ctx.putImageData(new ImageData(out as Uint8ClampedArray<ArrayBuffer>, W, H), 0, 0)
  return c
}

function tracePath(ctx: CanvasRenderingContext2D, r: Region, s: number) {
  if (r.kind === 'rect') {
    ctx.fillRect(r.x * s, r.y * s, r.w * s, r.h * s)
    return
  }
  ctx.lineWidth = r.size * s
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  r.points.forEach((p, i) => (i ? ctx.lineTo(p.x * s, p.y * s) : ctx.moveTo(p.x * s, p.y * s)))
  if (r.points.length === 1) ctx.lineTo(r.points[0].x * s + 0.01, r.points[0].y * s)
  ctx.stroke()
}

function paint(canvas: HTMLCanvasElement, img: DecodedImage, regions: Region[], mode: Mode, fx: HTMLCanvasElement | null) {
  const W = canvas.width
  const s = W / img.width
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img.source, 0, 0, W, canvas.height)
  if (!regions.length) return
  if (mode === 'black' || !fx) {
    ctx.fillStyle = ctx.strokeStyle = '#000'
    regions.forEach((r) => tracePath(ctx, r, s))
    return
  }
  const mask = newCanvas(W, canvas.height)
  const m = mask.getContext('2d')!
  m.fillStyle = m.strokeStyle = '#000'
  regions.forEach((r) => tracePath(m, r, s))
  const layer = newCanvas(W, canvas.height)
  const l = layer.getContext('2d')!
  l.drawImage(fx, 0, 0)
  l.globalCompositeOperation = 'destination-in'
  l.drawImage(mask, 0, 0)
  ctx.drawImage(layer, 0, 0)
}

export default function SensorFoto() {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<DecodedImage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [regions, setRegions] = useState<Region[]>([])
  const [draft, setDraft] = useState<Region | null>(null)
  const [tool, setTool] = useState<'rect' | 'brush'>('rect')
  const [mode, setMode] = useState<Mode>('black')
  const [level, setLevel] = useState(6)
  const [brush, setBrush] = useState(40)
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<DecodedImage | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  imgRef.current = img

  useEffect(() => () => imgRef.current?.close(), [])

  const previewScale = img ? Math.min(1, PREVIEW_MAX / Math.max(img.width, img.height)) : 1
  const fx = useMemo(() => {
    if (!img || mode === 'black') return null
    return effectCanvas(img, Math.round(img.width * previewScale), Math.round(img.height * previewScale), mode, level)
  }, [img, mode, level, previewScale])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!img || !canvas) return
    canvas.width = Math.round(img.width * previewScale)
    canvas.height = Math.round(img.height * previewScale)
    paint(canvas, img, draft ? [...regions, draft] : regions, mode, fx)
  }, [img, regions, draft, mode, fx, previewScale])

  async function open([f]: File[]) {
    setError(null)
    try {
      const next = await decodeImage(f)
      img?.close()
      setImg(next)
      setFile(f)
      setRegions([])
      setDraft(null)
    } catch (e) {
      if (e instanceof UnreadableImageError) setError(t('File ini bukan gambar yang bisa dibaca (JPG, PNG, WebP, HEIC dari Safari).', 'This file is not a readable image (JPG, PNG, WebP, or HEIC in Safari).'))
      else throw e
    }
  }

  function point(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - rect.left) / rect.width) * img!.width, y: ((e.clientY - rect.top) / rect.height) * img!.height }
  }
  const brushSize = () => (brush / 1000) * img!.width

  function down(e: PointerEvent<HTMLCanvasElement>) {
    if (!img) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = point(e)
    start.current = p
    setDraft(tool === 'rect' ? rectFrom(p, p) : { kind: 'brush', size: brushSize(), points: [p] })
  }
  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!start.current) return
    const p = point(e)
    setDraft((d) => {
      if (!d) return d
      if (d.kind === 'rect') return rectFrom(start.current!, p)
      return { ...d, points: [...d.points, p] }
    })
  }
  function up() {
    if (!start.current) return
    start.current = null
    setDraft((d) => {
      if (d && (d.kind === 'brush' || (d.w > 2 && d.h > 2))) setRegions((r) => [...r, d])
      return null
    })
  }

  async function save() {
    if (!img || !file) return
    const canvas = newCanvas(img.width, img.height)
    const full = mode === 'black' ? null : effectCanvas(img, canvas.width, canvas.height, mode, level)
    paint(canvas, img, regions, mode, full)
    const blob = await canvasBlob(canvas, format === 'png' ? 'image/png' : 'image/jpeg', 0.92)
    downloadBlob(blob, withExtension(file.name.replace(/\.[^.]+$/, '') + '-sensor', '.' + (format === 'png' ? 'png' : 'jpg')))
  }

  return (
    <div className="space-y-6">
      <FileDrop accept="image/*" label={img ? t('Ganti foto', 'Choose another photo') : t('Tarik foto yang mau disensor ke sini', 'Drop the photo to censor here')} onFiles={(f) => void open(f)} />
      {error && <ErrorNote message={error} />}
      {img && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex justify-center rounded-2xl border bg-muted/40 p-3">
            <canvas
              ref={canvasRef}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              style={{ touchAction: 'none' }}
              className="max-h-[70vh] w-auto max-w-full cursor-crosshair rounded-lg shadow"
              aria-label={t('Foto yang disensor — seret untuk menutup bagian', 'Photo to censor — drag to cover an area')}
            />
          </div>
          <div className="space-y-4 rounded-2xl border bg-card p-4">
            <Segmented
              label={t('Alat', 'Tool')}
              value={tool}
              options={[
                { value: 'rect', label: t('Kotak', 'Box') },
                { value: 'brush', label: t('Kuas', 'Brush') },
              ]}
              onChange={setTool}
            />
            {tool === 'brush' && (
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Ukuran kuas', 'Brush size')}: {brush}
                <input type="range" min={10} max={150} value={brush} onChange={(e) => setBrush(+e.target.value)} className="w-full" />
              </label>
            )}
            <Segmented
              label={t('Model sensor', 'Style')}
              value={mode}
              options={[
                { value: 'black', label: t('Blok hitam', 'Black block') },
                { value: 'pixel', label: t('Piksel', 'Pixelate') },
                { value: 'blur', label: 'Blur' },
              ]}
              onChange={setMode}
            />
            {mode !== 'black' && (
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Kekuatan', 'Strength')}: {level}
                <input type="range" min={1} max={10} value={level} onChange={(e) => setLevel(+e.target.value)} className="w-full" />
              </label>
            )}
            {mode !== 'black' && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                {t(
                  'Blur atau piksel yang tipis pada teks kecil (NIK, plat nomor) kadang bisa ditebak. Untuk data penting, pakai blok hitam.',
                  'Light blur or pixelation over small text (ID numbers, plates) can sometimes be guessed. Use black blocks for anything important.',
                )}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={!regions.length} onClick={() => setRegions((r) => r.slice(0, -1))}>
                <Undo2 />
                {t('Urungkan', 'Undo')}
              </Button>
              <Button variant="outline" className="flex-1" disabled={!regions.length} onClick={() => setRegions([])}>
                <Trash2 />
                {t('Hapus semua', 'Clear')}
              </Button>
            </div>
            <Segmented label={t('Format', 'Format')} value={format} options={[{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }]} onChange={setFormat} />
            <Button className="w-full" disabled={!regions.length} onClick={() => void save()}>
              <Download />
              {t('Unduh foto tersensor', 'Download censored photo')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t(
                'Foto digambar ulang dan disimpan sebagai gambar baru tanpa EXIF, jadi bagian yang ditutup benar-benar hilang. Tidak ada yang dikirim ke server.',
                'The photo is redrawn and saved as a new image without EXIF, so covered areas are really gone. Nothing is sent to a server.',
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
