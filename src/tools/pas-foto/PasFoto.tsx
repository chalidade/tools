import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { canvasBlob, decodeImage, newCanvas, type DecodedImage } from '@/lib/image'
import { DPI, mmToPx, PAPERS, SIZES, sheetLayout } from './layout'
import { renderPhoto, type Bg } from './photo'

type Out = 'image/jpeg' | 'image/png' | 'pdf'

export default function PasFoto() {
  const t = useT()
  const [img, setImg] = useState<DecodedImage | null>(null)
  const [name, setName] = useState('pas-foto')
  const [error, setError] = useState(false)
  const [sizeId, setSizeId] = useState('3x4')
  const [bg, setBg] = useState<Bg>('red')
  const [tolerance, setTolerance] = useState(20)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ ox: 0, oy: 0 })
  const [paperId, setPaperId] = useState('4r')
  const [copies, setCopies] = useState(8)
  const [out, setOut] = useState<Out>('image/jpeg')
  const [busy, setBusy] = useState(false)
  const photoRef = useRef<HTMLCanvasElement>(null)
  const sheetRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const size = SIZES.find((s) => s.id === sizeId)!
  const paper = PAPERS.find((p) => p.id === paperId)!
  const W = mmToPx(size.w * 10)
  const H = mmToPx(size.h * 10)
  const sheet = useMemo(() => sheetLayout(paper, size.w * 10, size.h * 10, copies), [paper, size, copies])
  const maxCopies = useMemo(() => sheetLayout(paper, size.w * 10, size.h * 10, 999).cells.length, [paper, size])

  // The frame must stay covered by the picture.
  const clampPan = useCallback(
    (ox: number, oy: number, z: number) => {
      if (!img) return { ox: 0, oy: 0 }
      const s = Math.max(W / img.width, H / img.height) * z
      const mx = Math.max(0, (img.width * s - W) / 2)
      const my = Math.max(0, (img.height * s - H) / 2)
      return { ox: Math.min(mx, Math.max(-mx, ox)), oy: Math.min(my, Math.max(-my, oy)) }
    },
    [img, W, H],
  )

  const view = useMemo(() => ({ zoom, ...clampPan(pan.ox, pan.oy, zoom) }), [zoom, pan, clampPan])

  // Redraw the photo and the print sheet whenever something changes.
  useEffect(() => {
    if (!img || !photoRef.current || !sheetRef.current) return
    const photo = renderPhoto(img, W, H, view, bg, tolerance)
    const shown = photoRef.current
    shown.width = W
    shown.height = H
    shown.getContext('2d')!.drawImage(photo, 0, 0)
    const sc = sheetRef.current
    // The preview is a quarter of print resolution; the download renders at full size.
    drawSheet(sc, photo, sheet, 0.25)
  }, [img, W, H, view, bg, tolerance, sheet])

  useEffect(() => () => img?.close(), [img])

  async function open([file]: File[]) {
    setError(false)
    try {
      const decoded = await decodeImage(file)
      setImg(decoded)
      setName(file.name.replace(/\.[^.]+$/, '') + '-pasfoto')
      setZoom(1)
      setPan({ ox: 0, oy: 0 })
    } catch {
      setError(true)
    }
  }

  function onDown(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy }
  }
  function onMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drag.current) return
    const k = W / e.currentTarget.getBoundingClientRect().width
    setPan({ ox: drag.current.ox + (e.clientX - drag.current.x) * k, oy: drag.current.oy + (e.clientY - drag.current.y) * k })
  }

  async function download(what: 'photo' | 'sheet') {
    if (!img) return
    setBusy(true)
    try {
      const photo = renderPhoto(img, W, H, view, bg, tolerance)
      if (what === 'photo') {
        downloadBlob(await canvasBlob(photo, 'image/png'), `${name}-${size.id}.png`)
        return
      }
      const canvas = newCanvas(mmToPx(sheet.paperW), mmToPx(sheet.paperH))
      drawSheet(canvas, photo, sheet, 1)
      if (out === 'pdf') {
        const { jsPDF } = await import('jspdf')
        const pdf = new jsPDF({ orientation: sheet.paperW > sheet.paperH ? 'l' : 'p', unit: 'mm', format: [sheet.paperW, sheet.paperH] })
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, sheet.paperW, sheet.paperH)
        downloadBlob(pdf.output('blob'), `${name}-${paper.id}.pdf`)
      } else {
        const blob = await canvasBlob(canvas, out, 0.95)
        downloadBlob(blob, `${name}-${paper.id}.${out === 'image/png' ? 'png' : 'jpg'}`)
      }
    } finally {
      setBusy(false)
    }
  }

  if (!img) {
    return (
      <div className="space-y-6">
        <FileDrop accept="image/jpeg,image/png,image/webp" label={t('Tarik foto ke sini', 'Drop a photo here')} onFiles={(f) => void open(f)} />
        {error && <ErrorNote message={t('Gambar ini tidak bisa dibaca.', "This image can't be read.")} />}
        <p className="text-center text-xs text-muted-foreground">
          {t(
            'Pakai foto wajah dengan latar polos (dinding atau kain satu warna) supaya latar mudah diganti.',
            'Use a face photo against a plain backdrop (a wall or cloth of one color) so the background is easy to swap.',
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="space-y-3">
          <canvas
            ref={photoRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            className="w-full cursor-grab touch-none rounded-2xl border bg-muted active:cursor-grabbing"
            style={{ aspectRatio: `${size.w} / ${size.h}` }}
          />
          <p className="text-xs text-muted-foreground">{t('Geser foto untuk mengatur posisi wajah.', 'Drag the photo to position the face.')}</p>
          <label className="block space-y-2">
            <span className="flex justify-between text-xs font-medium text-muted-foreground">
              Zoom <span className="font-mono text-foreground">{zoom.toFixed(1)}×</span>
            </span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[var(--brand-2)]"
            />
          </label>
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
            <Segmented
              label={t('Ukuran foto (cm)', 'Photo size (cm)')}
              value={sizeId}
              options={SIZES.map((s) => ({ value: s.id, label: `${s.w}×${s.h}` }))}
              onChange={setSizeId}
            />
            <Segmented
              label={t('Warna latar', 'Background')}
              value={bg}
              options={[
                { value: 'red', label: t('Merah', 'Red') },
                { value: 'blue', label: t('Biru', 'Blue') },
                { value: 'white', label: t('Putih', 'White') },
                { value: 'keep', label: t('Asli', 'Original') },
              ]}
              onChange={setBg}
            />
            {bg !== 'keep' && (
              <label className="min-w-48 flex-1 space-y-2">
                <span className="flex justify-between text-xs font-medium text-muted-foreground">
                  {t('Toleransi latar', 'Backdrop tolerance')} <span className="font-mono text-foreground">{tolerance}</span>
                </span>
                <input
                  type="range"
                  min={4}
                  max={60}
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  className="w-full accent-[var(--brand-2)]"
                />
              </label>
            )}
          </div>
          {bg !== 'keep' && (
            <p className="text-xs text-muted-foreground">
              {t(
                'Latar dikenali dari warna di tepi atas foto. Naikkan toleransi bila masih ada sisa latar lama; turunkan bila rambut atau baju ikut terhapus. Hasil terbaik dengan latar polos.',
                'The backdrop is detected from the colors along the top edge. Raise the tolerance if some old backdrop is left; lower it if hair or clothes get eaten. Works best with a plain backdrop.',
              )}
            </p>
          )}

          <div className="flex flex-wrap items-end gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
            <Segmented
              label={t('Kertas cetak', 'Print paper')}
              value={paperId}
              options={PAPERS.map((p) => ({ value: p.id, label: p.label }))}
              onChange={(id) => {
                setPaperId(id)
                setCopies(999)
              }}
            />
            <label className="min-w-40 space-y-2">
              <span className="flex justify-between text-xs font-medium text-muted-foreground">
                {t('Jumlah', 'Copies')} <span className="font-mono text-foreground">{sheet.cells.length}</span>
              </span>
              <input
                type="range"
                min={1}
                max={maxCopies}
                value={Math.min(copies, maxCopies)}
                onChange={(e) => setCopies(Number(e.target.value))}
                className="w-full accent-[var(--brand-2)]"
              />
            </label>
            <Segmented
              label={t('Simpan lembar sebagai', 'Save sheet as')}
              value={out}
              options={[
                { value: 'image/jpeg', label: 'JPG' },
                { value: 'image/png', label: 'PNG' },
                { value: 'pdf', label: 'PDF' },
              ]}
              onChange={setOut}
            />
          </div>

          <canvas ref={sheetRef} className="max-h-96 w-full rounded-2xl border bg-muted object-contain" />
          <p className="text-xs text-muted-foreground">
            {t(
              `Lembar ${paper.label}, ${DPI} dpi — cetak dengan skala 100% (tanpa “fit to page”) agar ukurannya tepat. Garis tipis abu-abu adalah panduan potong.`,
              `${paper.label} sheet, ${DPI} dpi — print at 100% scale (no “fit to page”) so the size is exact. The thin grey lines are cut guides.`,
            )}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void download('sheet')} disabled={busy}>
              <Download />
              {t('Unduh lembar cetak', 'Download print sheet')}
            </Button>
            <Button variant="outline" onClick={() => void download('photo')} disabled={busy}>
              <Download />
              {t('Unduh satu foto (PNG)', 'Download single photo (PNG)')}
            </Button>
            <Button variant="ghost" onClick={() => setImg(null)}>
              {t('Ganti foto', 'Change photo')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Lays copies of `photo` out on a white sheet with hairline cut guides. `scale` 1 = 300 dpi. */
function drawSheet(canvas: HTMLCanvasElement, photo: HTMLCanvasElement, sheet: ReturnType<typeof sheetLayout>, scale: number) {
  const px = (mm: number) => (mm / 25.4) * DPI * scale
  canvas.width = Math.round(px(sheet.paperW))
  canvas.height = Math.round(px(sheet.paperH))
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const w = (photo.width / DPI) * 25.4
  const h = (photo.height / DPI) * 25.4
  ctx.strokeStyle = '#bbb'
  ctx.lineWidth = Math.max(1, scale * 2)
  for (const c of sheet.cells) {
    ctx.drawImage(photo, px(c.x), px(c.y), px(w), px(h))
    ctx.strokeRect(px(c.x), px(c.y), px(w), px(h))
  }
}

