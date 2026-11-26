import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { decodeImage, formatBytes, type DecodedImage } from '@/lib/image'
import { fitSize, POSITIONS, type Position } from './layout'
import { outputType, type ProcessOpts } from './process'
import { renderMarked, type Logo, type MarkOpts } from './render'
import type { Job } from './worker'

interface Item {
  id: number
  file: File
  result?: Blob
  error?: boolean
}

const ARROWS: Record<string, string> = { tl: '↖', tc: '↑', tr: '↗', ml: '←', mc: '•', mr: '→', bl: '↙', bc: '↓', br: '↘' }
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'
let nextId = 1

function extFor(type: string) {
  return type === 'image/png' ? 'png' : 'jpg'
}

export default function WatermarkFoto() {
  const t = useT()
  const [items, setItems] = useState<Item[]>([])
  const [current, setCurrent] = useState(0)
  const [kind, setKind] = useState<'text' | 'logo'>('text')
  const [text, setText] = useState('© Toko Saya')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoId, setLogoId] = useState(0)
  const [color, setColor] = useState<'white' | 'black'>('white')
  const [position, setPosition] = useState<Position>('br')
  const [size, setSize] = useState(25)
  const [opacity, setOpacity] = useState(70)
  const [spacing, setSpacing] = useState(60)
  const [angle, setAngle] = useState(-30)
  const [maxSide, setMaxSide] = useState(0)
  const [format, setFormat] = useState<'auto' | 'jpg' | 'png'>('auto')
  const [running, setRunning] = useState<{ done: number; total: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const photoRef = useRef<DecodedImage | null>(null)
  const logoRef = useRef<(Logo & { close: () => void }) | null>(null)
  const [previewReady, setPreviewReady] = useState(0)
  const workerRef = useRef<Worker | null>(null)

  const tile = position === 'tile'
  const mark: MarkOpts = { kind, text, color, size: tile ? Math.min(size, 40) : size, opacity, position, margin: 3, spacing, angle }
  const markKey = JSON.stringify([mark, logoId, maxSide, format])

  useEffect(() => () => {
    photoRef.current?.close()
    logoRef.current?.close()
    workerRef.current?.terminate()
  }, [])

  // Load the photo being previewed.
  const previewFile = items[current]?.file
  useEffect(() => {
    let alive = true
    if (!previewFile) return
    void decodeImage(previewFile).then(
      (img) => {
        if (!alive) return img.close()
        photoRef.current?.close()
        photoRef.current = img
        setPreviewReady((n) => n + 1)
      },
      () => {
        if (alive) setMessage(t('Foto ini tidak bisa dibaca.', "This photo can't be read."))
      },
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewFile])

  // Load the logo.
  useEffect(() => {
    let alive = true
    logoRef.current?.close()
    logoRef.current = null
    if (!logoFile) return setPreviewReady((n) => n + 1)
    void createImageBitmap(logoFile).then(
      (bmp) => {
        if (!alive) return bmp.close()
        logoRef.current = { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
        setPreviewReady((n) => n + 1)
      },
      () => setMessage(t('Logo ini tidak bisa dibaca.', "This logo can't be read.")),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoFile])

  // Redraw the preview.
  useEffect(() => {
    const canvas = canvasRef.current
    const img = photoRef.current
    if (!canvas || !img) return
    const { w, h } = fitSize(img.width, img.height, 1000)
    canvas.width = w
    canvas.height = h
    renderMarked(canvas.getContext('2d')!, img.source, w, h, mark, logoRef.current)
  }, [markKey, previewReady]) // eslint-disable-line react-hooks/exhaustive-deps

  function add(files: File[]) {
    setMessage(null)
    setItems((prev) => [...prev.map((i) => ({ ...i, result: undefined, error: false })), ...files.map((file) => ({ id: nextId++, file }))])
  }

  function remove(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    setCurrent(0)
  }

  function pickLogo([f]: File[]) {
    setMessage(null)
    setLogoFile(f)
    setLogoId((n) => n + 1)
    setItems((prev) => prev.map((i) => ({ ...i, result: undefined })))
  }

  async function run() {
    if (kind === 'logo' && !logoFile) return setMessage(t('Pilih file logo dulu.', 'Choose a logo file first.'))
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      return setMessage(t('Browser ini belum mendukung pemrosesan massal. Coba Chrome, Edge, Firefox, atau Safari terbaru.', 'This browser cannot batch-process yet. Try a current Chrome, Edge, Firefox or Safari.'))
    }
    setMessage(null)
    const opts: ProcessOpts = { mark, maxSide, format, quality: 0.92 }
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    const list = items
    setItems(list.map((i) => ({ ...i, result: undefined, error: false })))
    setRunning({ done: 0, total: list.length })
    try {
      for (let n = 0; n < list.length; n++) {
        const item = list[n]
        const reply = await new Promise<{ blob?: Blob; error?: boolean }>((resolve) => {
          worker.onmessage = (e) => resolve(e.data)
          worker.onerror = () => resolve({ error: true })
          const job: Job = { id: item.id, file: item.file, opts, logo: kind === 'logo' ? logoFile : null, logoId }
          worker.postMessage(job)
        })
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, result: reply.blob, error: !reply.blob } : i)))
        setRunning({ done: n + 1, total: list.length })
      }
    } finally {
      worker.terminate()
      workerRef.current = null
      setRunning(null)
    }
  }

  function nameOf(item: Item) {
    return item.file.name.replace(/\.[^.]+$/, '') + '-wm.' + extFor(outputType(item.file, format))
  }

  async function downloadAll() {
    const done = items.filter((i) => i.result)
    if (done.length === 1) return downloadBlob(done[0].result!, nameOf(done[0]))
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const used = new Set<string>()
    for (const item of done) {
      let name = nameOf(item)
      for (let n = 2; used.has(name); n++) name = nameOf(item).replace(/(\.[^.]+)$/, `-${n}$1`)
      used.add(name)
      zip.file(name, item.result!, { compression: 'STORE' })
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), tr('foto-watermark', 'watermarked-photos') + '.zip')
  }

  if (!items.length) {
    return (
      <div className="space-y-6">
        <FileDrop accept={ACCEPT} multiple label={t('Tarik foto produk ke sini', 'Drop product photos here')} onFiles={add} />
        <p className="text-center text-xs text-muted-foreground">
          {t(
            'JPG, PNG, WebP — bisa puluhan sekaligus. Diproses di perangkatmu, metadata (lokasi GPS, kamera) ikut dibuang.',
            'JPG, PNG, WebP — dozens at once. Processed on your device; metadata (GPS, camera) is removed.',
          )}
        </p>
      </div>
    )
  }

  const done = items.filter((i) => i.result)
  const failed = items.filter((i) => i.error)
  const busy = running !== null

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <div className="flex justify-center rounded-2xl border bg-muted/40 p-3">
            <canvas ref={canvasRef} className="max-h-[65vh] w-auto max-w-full rounded-lg shadow" aria-label={t('Pratinjau watermark', 'Watermark preview')} />
          </div>
          <p className="text-xs text-muted-foreground">{t('Pratinjau: ', 'Preview: ')}{previewFile?.name}</p>
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-4">
          <Segmented label={t('Jenis watermark', 'Watermark type')} value={kind} options={[{ value: 'text', label: t('Teks', 'Text') }, { value: 'logo', label: 'Logo' }]} onChange={setKind} disabled={busy} />
          {kind === 'text' ? (
            <>
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Teks', 'Text')}
                <input value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground" />
              </label>
              <Segmented label={t('Warna', 'Color')} value={color} options={[{ value: 'white', label: t('Putih', 'White') }, { value: 'black', label: t('Hitam', 'Black') }]} onChange={setColor} />
            </>
          ) : (
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t('File logo (PNG transparan disarankan)', 'Logo file (transparent PNG works best)')}
              <input type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml" onChange={(e) => e.target.files?.[0] && pickLogo([e.target.files[0]])} className="block w-full text-sm text-foreground" />
            </label>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('Posisi', 'Position')}</p>
            <div className="grid w-32 grid-cols-3 gap-1" role="radiogroup" aria-label={t('Posisi', 'Position')}>
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={position === p}
                  aria-label={p}
                  onClick={() => setPosition(p)}
                  className={`h-9 rounded-md border text-sm transition-colors ${position === p ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:text-foreground'}`}
                >
                  {ARROWS[p]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={tile} onChange={(e) => setPosition(e.target.checked ? 'tile' : 'br')} />
              {t('Ulangi memenuhi foto (pola)', 'Repeat across the photo (pattern)')}
            </label>
          </div>

          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Ukuran', 'Size')}: {mark.size}% {t('dari lebar foto', 'of photo width')}
            <input type="range" min={5} max={tile ? 40 : 80} value={mark.size} onChange={(e) => setSize(+e.target.value)} className="w-full" />
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Opasitas', 'Opacity')}: {opacity}%
            <input type="range" min={10} max={100} value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="w-full" />
          </label>
          {tile && (
            <>
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Jarak antar tanda', 'Spacing')}: {spacing}%
                <input type="range" min={0} max={200} step={5} value={spacing} onChange={(e) => setSpacing(+e.target.value)} className="w-full" />
              </label>
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Sudut', 'Angle')}: {angle}°
                <input type="range" min={-90} max={90} value={angle} onChange={(e) => setAngle(+e.target.value)} className="w-full" />
              </label>
            </>
          )}
          <Segmented
            label={t('Ukuran hasil (sisi terpanjang)', 'Output size (longer side)')}
            value={maxSide}
            options={[{ value: 0, label: t('Asli', 'Original') }, { value: 2048, label: '2048' }, { value: 1200, label: '1200' }, { value: 800, label: '800' }]}
            onChange={setMaxSide}
            disabled={busy}
          />
          <Segmented
            label={t('Format', 'Format')}
            value={format}
            options={[{ value: 'auto', label: t('Otomatis', 'Auto') }, { value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }]}
            onChange={setFormat}
            disabled={busy}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void run()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Play />}
            {busy ? t(`Memproses ${running!.done}/${running!.total}…`, `Processing ${running!.done}/${running!.total}…`) : t(`Beri watermark ${items.length} foto`, `Watermark ${items.length} photo(s)`)}
          </Button>
          <Button variant="outline" disabled={!done.length || busy} onClick={() => void downloadAll()}>
            <Download />
            {done.length > 1 ? t(`Unduh ZIP (${done.length})`, `Download ZIP (${done.length})`) : t('Unduh', 'Download')}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => { setItems([]); setCurrent(0) }}>
            {t('Mulai lagi', 'Start over')}
          </Button>
        </div>
        {message && <ErrorNote message={message} />}
        {failed.length > 0 && <ErrorNote message={t(`${failed.length} foto gagal diproses.`, `${failed.length} photo(s) failed.`)} />}
        <ul className="divide-y rounded-xl border">
          {items.map((item, idx) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <button type="button" className={`min-w-0 flex-1 truncate text-left ${idx === current ? 'font-medium' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setCurrent(idx)}>
                {item.file.name}
              </button>
              <span className="shrink-0 text-xs text-muted-foreground">
                {item.result ? `✓ ${formatBytes(item.result.size)}` : item.error ? '✗' : formatBytes(item.file.size)}
              </span>
              <button type="button" aria-label={t('Hapus', 'Remove')} disabled={busy} onClick={() => remove(item.id)} className="text-muted-foreground hover:text-foreground disabled:opacity-40">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <FileDrop accept={ACCEPT} multiple label={t('Tambah foto lagi', 'Add more photos')} busyLabel={busy ? t('Memproses…', 'Processing…') : undefined} onFiles={add} />
        <p className="text-xs text-muted-foreground">
          {t('Semua diproses di perangkatmu; tidak ada foto yang dikirim ke server. Metadata (lokasi GPS, kamera) tidak ikut ke hasil.', 'Everything is processed on your device; no photo is sent to a server. Metadata (GPS, camera) is left out of the result.')}
        </p>
      </div>
    </div>
  )
}
