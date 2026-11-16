import { useEffect, useRef, useState } from 'react'
import { Download, ImagePlus, PenLine, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { SignaturePad } from '@/tools/sign-pdf/SignaturePad'
import { canvasBlob, decodeImage, newCanvas } from '@/lib/image'
import { downloadBlob, withExtension } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { extractInk, hexToRgb, inkBounds } from './ink'

type Source = 'draw' | 'upload'

/** Source pixels: a drawing (use its alpha) or a photo (use brightness). */
interface Picked {
  canvas: HTMLCanvasElement
  fromAlpha: boolean
  name: string
}

const COLORS: { value: string; label: readonly [string, string] }[] = [
  { value: 'original', label: ['Asli', 'Original'] },
  { value: '#111827', label: ['Hitam', 'Black'] },
  { value: '#1d4ed8', label: ['Biru', 'Blue'] },
]

const MAX_SIDE = 1600

export default function SignaturePng() {
  const t = useT()
  const [source, setSource] = useState<Source>('draw')
  const [picked, setPicked] = useState<Picked | null>(null)
  const [color, setColor] = useState('#111827')
  const [threshold, setThreshold] = useState(170)
  const [minSpeck, setMinSpeck] = useState(12)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; blob: Blob; w: number; h: number } | null>(null)
  const urlRef = useRef<string | null>(null)

  // Re-run the extraction whenever the picture or a setting changes.
  useEffect(() => {
    if (!picked) return
    let alive = true
    const { canvas } = picked
    const work = newCanvas(canvas.width, canvas.height)
    const ctx = work.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(canvas, 0, 0)
    const img = ctx.getImageData(0, 0, work.width, work.height)
    extractInk(img.data, work.width, work.height, {
      threshold,
      soft: 50,
      minSpeck: picked.fromAlpha ? 1 : minSpeck,
      color: color === 'original' ? null : hexToRgb(color),
      fromAlpha: picked.fromAlpha,
    })
    const box = inkBounds(img.data, work.width, work.height)
    if (!box) {
      setPreview(null)
      setError(t('Tidak ada tinta yang terdeteksi. Coba naikkan ambang atau pakai foto yang lebih terang.', 'No ink found. Raise the threshold or use a brighter photo.'))
      return
    }
    setError(null)
    ctx.putImageData(img, 0, 0)
    const pad = Math.round(Math.max(work.width, work.height) * 0.01)
    const l = Math.max(0, box.left - pad)
    const tp = Math.max(0, box.top - pad)
    const w = Math.min(work.width, box.right + pad + 1) - l
    const h = Math.min(work.height, box.bottom + pad + 1) - tp
    const out = newCanvas(w, h)
    out.getContext('2d')!.drawImage(work, l, tp, w, h, 0, 0, w, h)
    void canvasBlob(out).then((blob) => {
      if (!alive) return
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = URL.createObjectURL(blob)
      setPreview({ url: urlRef.current, blob, w, h })
    })
    return () => {
      alive = false
    }
  }, [picked, color, threshold, minSpeck, t])

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  async function openPhoto(file: File) {
    setError(null)
    try {
      const img = await decodeImage(file)
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
      const canvas = newCanvas(img.width * scale, img.height * scale)
      canvas.getContext('2d')!.drawImage(img.source, 0, 0, canvas.width, canvas.height)
      img.close()
      setPicked({ canvas, fromAlpha: false, name: file.name })
    } catch {
      setError(t('Gambar tidak bisa dibaca. Coba file JPG atau PNG lain.', "The image can't be read. Try another JPG or PNG."))
    }
  }

  async function useDrawing(url: string) {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = newCanvas(img.naturalWidth, img.naturalHeight)
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    setPicked({ canvas, fromAlpha: true, name: 'tanda-tangan' })
  }

  function reset() {
    setPicked(null)
    setPreview(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {!picked && (
        <>
          <Segmented
            label={t('Sumber', 'Source')}
            value={source}
            options={[
              { value: 'draw', label: t('Gambar di layar', 'Draw on screen') },
              { value: 'upload', label: t('Foto tanda tangan', 'Photo of signature') },
            ]}
            onChange={setSource}
          />
          {source === 'draw' ? (
            <SignaturePad onDone={(s) => void useDrawing(s.url)} />
          ) : (
            <FileDrop
              accept="image/*"
              label={t('Tarik foto tanda tangan ke sini', 'Drop a photo of your signature here')}
              onFiles={([f]) => void openPhoto(f)}
            />
          )}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            {source === 'draw' ? <PenLine className="mt-0.5 size-3.5 shrink-0" /> : <ImagePlus className="mt-0.5 size-3.5 shrink-0" />}
            {source === 'draw'
              ? t('Tanda tangan dipotong rapat ke goresannya, lalu jadi PNG transparan.', 'The signature is cropped tight to the strokes and saved as a transparent PNG.')
              : t('Foto tanda tangan di kertas putih dengan cahaya merata hasilnya paling bersih.', 'A photo of a signature on white paper in even light gives the cleanest result.')}
          </p>
        </>
      )}

      {picked && (
        <div className="space-y-6">
          <div
            className="grid min-h-40 place-items-center overflow-hidden rounded-2xl border p-6"
            style={{
              backgroundColor: '#fff',
              backgroundImage:
                'linear-gradient(45deg,#e4e4e7 25%,transparent 25%,transparent 75%,#e4e4e7 75%),linear-gradient(45deg,#e4e4e7 25%,transparent 25%,transparent 75%,#e4e4e7 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0,10px 10px',
            }}
          >
            {preview && <img src={preview.url} alt={t('Hasil tanda tangan', 'Signature result')} className="max-h-64 max-w-full object-contain" />}
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
            <Segmented
              label={t('Warna tinta', 'Ink colour')}
              value={color}
              options={COLORS.map((c) => ({ value: c.value, label: t(...c.label) }))}
              onChange={setColor}
            />
            {!picked.fromAlpha && (
              <>
                <label className="min-w-40 flex-1 space-y-2 text-xs font-medium text-muted-foreground">
                  {t('Ambang tinta', 'Ink threshold')}
                  <input type="range" min={60} max={230} value={threshold} onChange={(e) => setThreshold(+e.target.value)} className="w-full" />
                </label>
                <label className="min-w-40 flex-1 space-y-2 text-xs font-medium text-muted-foreground">
                  {t('Bersihkan bintik', 'Remove specks')}
                  <input type="range" min={1} max={80} value={minSpeck} onChange={(e) => setMinSpeck(+e.target.value)} className="w-full" />
                </label>
              </>
            )}
          </div>

          {error && <ErrorNote message={error} />}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!preview}
              onClick={() => preview && downloadBlob(preview.blob, withExtension(picked.name, '-transparan.png'))}
            >
              <Download />
              {t('Unduh PNG transparan', 'Download transparent PNG')}
              {preview && <span className="text-xs opacity-70">{preview.w}×{preview.h}</span>}
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw />
              {t('Ulangi', 'Start over')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
