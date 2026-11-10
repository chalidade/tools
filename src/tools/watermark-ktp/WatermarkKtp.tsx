import { useEffect, useRef, useState } from 'react'
import { Download, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { canvasBlob, decodeImage, newCanvas, UnreadableImageError, type DecodedImage } from '@/lib/image'
import { downloadBlob, withExtension } from '@/lib/download'
import { locale, useT } from '@/lib/i18n'
import { tileCenters, watermarkText } from './tile'

const COLORS = { gray: '128,128,128', black: '0,0,0', white: '255,255,255', red: '220,38,38' } as const
type Color = keyof typeof COLORS

interface Opts {
  text: string
  size: number // % of the shorter side
  angle: number // degrees
  opacity: number // 0–100
  spacing: number // 0–100
  color: Color
}

function render(canvas: HTMLCanvasElement, img: DecodedImage, scale: number, o: Opts) {
  const W = Math.max(1, Math.round(img.width * scale))
  const H = Math.max(1, Math.round(img.height * scale))
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img.source, 0, 0, W, H)
  if (!o.text.trim()) return
  const fontPx = Math.max(8, (Math.min(W, H) * o.size) / 100)
  ctx.font = `600 ${fontPx}px Geist, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const tw = ctx.measureText(o.text).width
  const gap = (o.spacing / 100) * fontPx * 3
  const centers = tileCenters(W, H, tw, fontPx, gap, gap)
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.rotate((o.angle * Math.PI) / 180)
  ctx.fillStyle = `rgba(${COLORS[o.color]},${o.opacity / 100})`
  if (o.color !== 'gray') {
    ctx.strokeStyle = `rgba(${o.color === 'white' ? '0,0,0' : '255,255,255'},${(o.opacity / 100) * 0.5})`
    ctx.lineWidth = Math.max(1, fontPx / 14)
    ctx.lineJoin = 'round'
  }
  for (const c of centers) {
    if (o.color !== 'gray') ctx.strokeText(o.text, c.x, c.y)
    ctx.fillText(o.text, c.x, c.y)
  }
  ctx.restore()
}

export default function WatermarkKtp() {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<DecodedImage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [purpose, setPurpose] = useState('')
  const [withDate, setWithDate] = useState(true)
  const [size, setSize] = useState(5)
  const [angle, setAngle] = useState(-30)
  const [opacity, setOpacity] = useState(45)
  const [spacing, setSpacing] = useState(30)
  const [color, setColor] = useState<Color>('gray')
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<DecodedImage | null>(null)
  imgRef.current = img

  useEffect(() => () => imgRef.current?.close(), [])

  const date = withDate ? new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const text = watermarkText(purpose || t('pendaftaran', 'registration'), date, t('Hanya untuk verifikasi', 'Only for verification of'))
  const opts: Opts = { text, size, angle, opacity, spacing, color }

  useEffect(() => {
    if (!img || !canvasRef.current) return
    render(canvasRef.current, img, Math.min(1, 1200 / Math.max(img.width, img.height)), opts)
  })

  async function open([f]: File[]) {
    setError(null)
    try {
      const next = await decodeImage(f)
      img?.close()
      setImg(next)
      setFile(f)
    } catch (e) {
      if (e instanceof UnreadableImageError) setError(t('File ini bukan gambar yang bisa dibaca (JPG, PNG, WebP, HEIC dari Safari).', 'This file is not a readable image (JPG, PNG, WebP, or HEIC in Safari).'))
      else throw e
    }
  }

  async function save() {
    if (!img || !file) return
    const canvas = newCanvas(1, 1)
    render(canvas, img, 1, opts)
    const blob = await canvasBlob(canvas, format === 'png' ? 'image/png' : 'image/jpeg', 0.92)
    downloadBlob(blob, withExtension(file.name.replace(/\.[^.]+$/, '') + '-wm', '.' + (format === 'png' ? 'png' : 'jpg')))
  }

  return (
    <div className="space-y-6">
      <FileDrop accept="image/*" label={img ? t('Ganti foto', 'Choose another photo') : t('Tarik foto KTP / SIM / paspor ke sini', 'Drop a photo of your ID here')} onFiles={(f) => void open(f)} />
      {error && <ErrorNote message={error} />}
      {img && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex justify-center rounded-2xl border bg-muted/40 p-3">
            <canvas ref={canvasRef} className="max-h-[70vh] w-auto max-w-full rounded-lg shadow" aria-label={t('Pratinjau watermark', 'Watermark preview')} />
          </div>
          <div className="space-y-4 rounded-2xl border bg-card p-4">
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t('Untuk keperluan', 'Purpose')}
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={t('pendaftaran', 'registration')}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs">{text}</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={withDate} onChange={(e) => setWithDate(e.target.checked)} />
              {t('Sertakan tanggal hari ini', "Include today's date")}
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t('Ukuran teks', 'Text size')}: {size}%
              <input type="range" min={2} max={12} value={size} onChange={(e) => setSize(+e.target.value)} className="w-full" />
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t('Sudut', 'Angle')}: {angle}°
              <input type="range" min={-90} max={90} value={angle} onChange={(e) => setAngle(+e.target.value)} className="w-full" />
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t('Transparansi', 'Opacity')}: {opacity}%
              <input type="range" min={10} max={90} value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="w-full" />
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t('Kerapatan', 'Spacing')}: {spacing}
              <input type="range" min={0} max={100} value={spacing} onChange={(e) => setSpacing(+e.target.value)} className="w-full" />
            </label>
            <Segmented
              label={t('Warna', 'Color')}
              value={color}
              options={[
                { value: 'gray', label: t('Abu', 'Gray') },
                { value: 'black', label: t('Hitam', 'Black') },
                { value: 'white', label: t('Putih', 'White') },
                { value: 'red', label: t('Merah', 'Red') },
              ]}
              onChange={setColor}
            />
            <Segmented label={t('Format', 'Format')} value={format} options={[{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }]} onChange={setFormat} />
            <Button className="w-full" onClick={() => void save()}>
              <Download />
              {t('Unduh foto ber-watermark', 'Download watermarked photo')}
            </Button>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              {t('Foto disimpan ulang tanpa EXIF (lokasi GPS, kamera, tanggal). Tidak ada yang dikirim ke server.', 'The photo is re-saved without EXIF (GPS, camera, date). Nothing is sent to a server.')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
