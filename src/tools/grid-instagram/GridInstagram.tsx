import { useEffect, useRef, useState } from 'react'
import { Download, FileArchive, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { canvasBlob, decodeImage, newCanvas, UnreadableImageError, type DecodedImage } from '@/lib/image'
import { downloadBlob, withExtension } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { planTiles, tileName, type Mode, type Plan, type Tile, type TileRatio } from './grid'

const GRIDS = [
  { value: '3x1', cols: 3, rows: 1 },
  { value: '3x2', cols: 3, rows: 2 },
  { value: '3x3', cols: 3, rows: 3 },
] as const
type GridId = (typeof GRIDS)[number]['value']

function drawTile(canvas: HTMLCanvasElement, img: DecodedImage, t: Tile) {
  canvas.width = t.w
  canvas.height = t.h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img.source, t.sx, t.sy, t.sw, t.sh, 0, 0, t.w, t.h)
}

export default function GridInstagram() {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<DecodedImage | null>(null)
  const [busy, setBusy] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('grid')
  const [grid, setGrid] = useState<GridId>('3x3')
  const [slides, setSlides] = useState(3)
  const [ratio, setRatio] = useState<TileRatio>('1:1')
  const [fx, setFx] = useState(0.5)
  const [fy, setFy] = useState(0.5)
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<DecodedImage | null>(null)
  imgRef.current = img
  useEffect(() => () => imgRef.current?.close(), [])

  const g = GRIDS.find((x) => x.value === grid)!
  const plan: Plan | null = img
    ? planTiles(img.width, img.height, mode, mode === 'grid' ? g.cols : slides, g.rows, ratio, fx, fy)
    : null

  // Preview: the whole photo dimmed, the used part bright, with the cut lines.
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !img || !plan) return
    const scale = Math.min(1, 900 / Math.max(img.width, img.height))
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    const ctx = c.getContext('2d')!
    ctx.drawImage(img.source, 0, 0, c.width, c.height)
    const { sx, sy, sw, sh } = plan.crop
    const X = sx * scale
    const Y = sy * scale
    const W = sw * scale
    const H = sh * scale
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, c.width, Y)
    ctx.fillRect(0, Y + H, c.width, c.height - Y - H)
    ctx.fillRect(0, Y, X, H)
    ctx.fillRect(X + W, Y, c.width - X - W, H)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = Math.max(2, c.width / 400)
    ctx.strokeRect(X, Y, W, H)
    ctx.beginPath()
    for (let i = 1; i < plan.cols; i++) {
      ctx.moveTo(X + (W * i) / plan.cols, Y)
      ctx.lineTo(X + (W * i) / plan.cols, Y + H)
    }
    for (let i = 1; i < plan.rows; i++) {
      ctx.moveTo(X, Y + (H * i) / plan.rows)
      ctx.lineTo(X + W, Y + (H * i) / plan.rows)
    }
    ctx.stroke()
    ctx.font = `600 ${Math.max(14, Math.round(W / plan.cols / 5))}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const tile of plan.tiles) {
      const cx = X + (W * (tile.col + 0.5)) / plan.cols
      const cy = Y + (H * (tile.row + 0.5)) / plan.rows
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(14, W / plan.cols / 7), 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(String(tile.order), cx, cy)
    }
  })

  async function open(files: File[]) {
    setError(null)
    setBusy(true)
    try {
      const next = await decodeImage(files[0])
      img?.close()
      setImg(next)
      setFile(files[0])
      setFx(0.5)
      setFy(0.5)
    } catch (e) {
      if (e instanceof UnreadableImageError) setError(t('File ini bukan gambar yang bisa dibaca (JPG, PNG, WebP).', 'This is not a readable image (JPG, PNG, WebP).'))
      else throw e
    } finally {
      setBusy(false)
    }
  }

  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  async function tileBlob(tile: Tile) {
    const c = newCanvas(tile.w, tile.h)
    drawTile(c, img!, tile)
    return canvasBlob(c, mime, 0.93)
  }
  const base = file ? withExtension(file.name, '').replace(/\.$/, '') : 'foto'

  async function saveOne(tile: Tile) {
    downloadBlob(await tileBlob(tile), tileName(base, tile, plan!.tiles.length, format))
  }

  async function saveZip() {
    if (!img || !plan) return
    setZipping(true)
    setError(null)
    try {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      for (const tile of plan.tiles) zip.file(tileName(base, tile, plan.tiles.length, format), await tileBlob(tile), { binary: true })
      downloadBlob(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), `${base}-${mode}.zip`)
    } catch {
      setError(t('Gagal membuat ZIP.', 'Could not build the ZIP.'))
    } finally {
      setZipping(false)
    }
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept="image/*"
        label={img ? t('Ganti foto', 'Change photo') : t('Tarik satu foto ke sini', 'Drop one photo here')}
        busyLabel={busy ? t('Membuka foto…', 'Opening photo…') : undefined}
        onFiles={(f) => void open(f)}
      />
      {error && <ErrorNote message={error} />}

      {img && plan && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="flex justify-center rounded-2xl border bg-muted/40 p-3">
              <canvas ref={canvasRef} className="max-h-[70vh] w-auto max-w-full rounded-lg shadow" aria-label={t('Pratinjau potongan', 'Cut preview')} />
            </div>
            <p className="text-sm text-muted-foreground">
              {mode === 'grid'
                ? t('Angka = urutan unggah. Unggah dari angka 1: tiap kotak jadi satu postingan, dan profil akan tersusun benar.', 'Numbers are the upload order. Post number 1 first: each tile is one post, and your profile ends up in the right order.')
                : t('Angka = urutan slide carousel, dari kiri ke kanan.', 'Numbers are the carousel slide order, left to right.')}
            </p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {[...plan.tiles]
                .sort((a, b) => a.order - b.order)
                .map((tile) => (
                  <TileThumb key={tile.index} img={img} tile={tile} label={t(`Unduh ${tile.order}`, `Download ${tile.order}`)} onSave={() => void saveOne(tile)} />
                ))}
            </ul>
          </div>

          <div className="space-y-4 self-start rounded-2xl border bg-card p-4">
            <Segmented
              label={t('Jenis', 'Type')}
              value={mode}
              options={[
                { value: 'grid', label: t('Grid profil', 'Profile grid') },
                { value: 'carousel', label: t('Carousel', 'Carousel') },
              ]}
              onChange={setMode}
            />
            {mode === 'grid' ? (
              <Segmented label={t('Jumlah kotak', 'Tiles')} value={grid} options={GRIDS.map((x) => ({ value: x.value, label: String(x.cols * x.rows) }))} onChange={setGrid} />
            ) : (
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Jumlah slide', 'Slides')}: {slides}
                <input type="range" min={2} max={10} value={slides} onChange={(e) => setSlides(+e.target.value)} className="w-full" />
              </label>
            )}
            <Segmented
              label={mode === 'grid' ? t('Rasio kotak', 'Tile ratio') : t('Rasio slide', 'Slide ratio')}
              value={ratio}
              options={[
                { value: '1:1', label: '1:1' },
                { value: '4:5', label: '4:5' },
                { value: '3:4', label: '3:4' },
              ]}
              onChange={setRatio}
            />
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t('Geser area potong (kiri–kanan)', 'Move the crop (left–right)')}
              <input type="range" min={0} max={100} value={fx * 100} onChange={(e) => setFx(+e.target.value / 100)} className="w-full" />
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t('Geser area potong (atas–bawah)', 'Move the crop (up–down)')}
              <input type="range" min={0} max={100} value={fy * 100} onChange={(e) => setFy(+e.target.value / 100)} className="w-full" />
            </label>
            <Segmented label="Format" value={format} options={[{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }]} onChange={setFormat} />
            <Button className="w-full" onClick={() => void saveZip()} disabled={zipping}>
              {zipping ? <Loader2 className="animate-spin" /> : <FileArchive />}
              {t('Unduh semua (ZIP)', 'Download all (ZIP)')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t(`Setiap kotak ${plan.tiles[0].w}×${plan.tiles[0].h} px. Foto tidak diunggah.`, `Each tile is ${plan.tiles[0].w}×${plan.tiles[0].h} px. The photo is not uploaded.`)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function TileThumb({ img, tile, label, onSave }: { img: DecodedImage; tile: Tile; label: string; onSave: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const k = 160 / Math.max(tile.w, tile.h)
    const c = ref.current
    c.width = Math.round(tile.w * k)
    c.height = Math.round(tile.h * k)
    c.getContext('2d')!.drawImage(img.source, tile.sx, tile.sy, tile.sw, tile.sh, 0, 0, c.width, c.height)
  }, [img, tile])
  return (
    <li className="space-y-1">
      <canvas ref={ref} className="w-full rounded-lg border" />
      <button type="button" onClick={onSave} className="flex w-full items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted">
        <Download className="size-3" />
        {label}
      </button>
    </li>
  )
}
