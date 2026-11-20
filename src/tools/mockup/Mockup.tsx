import { useEffect, useRef, useState } from 'react'
import { Download, ImagePlus, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { canvasBlob, decodeImage, type DecodedImage } from '@/lib/image'
import { cn } from '@/lib/utils'
import { drawMockup, type Frame, type Ratio } from './draw'

const BACKGROUNDS = ['#c6ff3a,#3ad6ff', '#ff9a8b,#ff6a88', '#a18cd1,#fbc2eb', '#0f2027,#2c5364', '#f5f5f4', '#18181b', '#fde68a,#f59e0b', '#d9f99d,#4ade80']

export default function Mockup() {
  const t = useT()
  const [shot, setShot] = useState<DecodedImage | null>(null)
  const [name, setName] = useState('mockup.png')
  const [bgImage, setBgImage] = useState<DecodedImage | null>(null)
  const [frame, setFrame] = useState<Frame>('browser')
  const [dark, setDark] = useState(true)
  const [background, setBackground] = useState(BACKGROUNDS[0])
  const [transparent, setTransparent] = useState(false)
  const [shadow, setShadow] = useState(true)
  const [padding, setPadding] = useState(0.08)
  const [ratio, setRatio] = useState<Ratio>('auto')
  const [url, setUrl] = useState('toowl.my.id')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => () => shot?.close(), [shot])
  useEffect(() => () => bgImage?.close(), [bgImage])

  useEffect(() => {
    if (!shot || !canvas.current) return
    drawMockup(canvas.current, shot.source, shot.width, shot.height, {
      frame,
      dark,
      background,
      backgroundImage: bgImage?.source ?? null,
      backgroundSize: bgImage ? { width: bgImage.width, height: bgImage.height } : null,
      transparent,
      shadow,
      padding,
      ratio,
      url,
    })
  }, [shot, frame, dark, background, bgImage, transparent, shadow, padding, ratio, url])

  async function open(file: File, setter: (d: DecodedImage) => void) {
    setError('')
    try {
      setter(await decodeImage(file))
    } catch {
      setError(t('Gambar ini tidak bisa dibaca.', 'This image could not be read.'))
    }
  }

  async function save() {
    if (!canvas.current) return
    setSaving(true)
    try {
      downloadBlob(await canvasBlob(canvas.current), withExtension(name, '-mockup.png'))
    } finally {
      setSaving(false)
    }
  }

  if (!shot)
    return (
      <div className="space-y-3">
        <FileDrop
          accept="image/*"
          label={t('Tarik tangkapan layar ke sini', 'Drop a screenshot here')}
          onFiles={([f]) => {
            setName(f.name)
            void open(f, setShot)
          }}
        />
        {error && <ErrorNote message={error} />}
      </div>
    )

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-[length:16px_16px]">
        <canvas ref={canvas} className="mx-auto block h-auto max-h-[70vh] w-auto max-w-full" />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Bingkai', 'Frame')}
          value={frame}
          onChange={setFrame}
          options={[
            { value: 'browser', label: t('Browser', 'Browser') },
            { value: 'phone', label: 'HP' },
            { value: 'laptop', label: 'Laptop' },
            { value: 'none', label: t('Tanpa', 'None') },
          ]}
        />
        {frame !== 'none' && frame !== 'laptop' && (
          <Segmented
            label={t('Warna bingkai', 'Frame colour')}
            value={dark ? 'dark' : 'light'}
            onChange={(v) => setDark(v === 'dark')}
            options={[
              { value: 'dark', label: t('Gelap', 'Dark') },
              { value: 'light', label: t('Terang', 'Light') },
            ]}
          />
        )}
        <Segmented
          label={t('Rasio', 'Ratio')}
          value={ratio}
          onChange={setRatio}
          options={(['auto', '16:9', '4:3', '1:1', '4:5', '9:16'] as const).map((r) => ({ value: r, label: r === 'auto' ? t('Pas', 'Fit') : r }))}
        />
      </div>

      {frame === 'browser' && (
        <label className="block space-y-2 text-xs font-medium text-muted-foreground">
          <span className="block">{t('Alamat di bilah browser', 'Address in the browser bar')}</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full max-w-sm rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('Latar', 'Background')}</p>
        <div className="flex flex-wrap items-center gap-2">
          {BACKGROUNDS.map((b) => {
            const [a, c] = b.split(',')
            return (
              <button
                key={b}
                type="button"
                aria-label={b}
                onClick={() => {
                  setBackground(b)
                  setTransparent(false)
                  setBgImage(null)
                }}
                className={cn('size-9 rounded-lg border-2', !transparent && !bgImage && background === b ? 'border-brand-2' : 'border-transparent')}
                style={{ background: c ? `linear-gradient(135deg, ${a}, ${c})` : a }}
              />
            )
          })}
          <input
            type="color"
            aria-label={t('Warna sendiri', 'Custom colour')}
            value={background.split(',')[0]}
            onChange={(e) => {
              setBackground(e.target.value)
              setTransparent(false)
              setBgImage(null)
            }}
            className="size-9 cursor-pointer rounded-lg border bg-transparent"
          />
          <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'cursor-pointer')}>
            <ImagePlus />
            {t('Gambar latar', 'Background image')}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) {
                  setTransparent(false)
                  void open(f, setBgImage)
                }
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
            {t('Transparan', 'Transparent')}
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} />
          {t('Bayangan', 'Shadow')}
        </label>
        <label className="flex items-center gap-3">
          {t('Jarak tepi', 'Padding')}
          <input type="range" min={0} max={0.3} step={0.01} value={padding} onChange={(e) => setPadding(Number(e.target.value))} />
        </label>
      </div>

      {error && <ErrorNote message={error} />}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void save()} disabled={saving}>
          <Download />
          {t('Unduh PNG', 'Download PNG')}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setShot(null)
            setError('')
          }}
        >
          <X />
          {t('Ganti gambar', 'Change image')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          'Hasil PNG memakai ukuran asli tangkapan layar, jadi tetap tajam untuk presentasi atau promosi. Bingkai digambar dari bentuk sederhana, tanpa logo atau desain merek mana pun.',
          'The PNG keeps the screenshot at full size, so it stays sharp for slides or promotion. Frames are drawn from simple shapes, with no logo or design of any brand.',
        )}
      </p>
    </div>
  )
}
