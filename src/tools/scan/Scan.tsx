import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Download, FileDown, Loader2, Plus, RotateCw, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { canvasBlob, decodeImage, newCanvas } from '@/lib/image'
import { cn } from '@/lib/utils'
import {
  applyScanMode,
  defaultQuad,
  detectDocument,
  isConvex,
  outputSize,
  warpQuad,
  type Pt,
  type Quad,
  type Rgba,
  type ScanMode,
} from './geometry'

interface Page {
  id: number
  name: string
  /** The photo, shrunk to at most WORK_SIDE px, as pixels and as a canvas to show. */
  canvas: HTMLCanvasElement
  pixels: Rgba
  quad: Quad
  mode: ScanMode
  auto: boolean
}

const WORK_SIDE = 2400
const PREVIEW_SIDE = 900
const EXPORT_SIDE = 2000
const MODES: { value: ScanMode; label: readonly [string, string] }[] = [
  { value: 'bw', label: ['Hitam-putih', 'Black & white'] },
  { value: 'gray', label: ['Abu-abu', 'Grayscale'] },
  { value: 'color', label: ['Warna', 'Color'] },
]

let nextId = 0

async function loadPage(file: File): Promise<Page> {
  const img = await decodeImage(file)
  try {
    const k = Math.min(1, WORK_SIDE / Math.max(img.width, img.height))
    const canvas = newCanvas(img.width * k, img.height * k)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels: Rgba = { data: data.data, width: data.width, height: data.height }
    const found = detectDocument(pixels)
    return {
      id: nextId++,
      name: file.name,
      canvas,
      pixels,
      quad: found ?? defaultQuad(canvas.width, canvas.height),
      mode: 'bw',
      auto: !!found,
    }
  } finally {
    img.close()
  }
}

/** Straightens the page's quad and applies its scan look into a fresh canvas. */
function render(page: Page, maxSide: number): HTMLCanvasElement {
  const { width, height } = outputSize(page.quad, maxSide)
  const out = warpQuad(page.pixels, page.quad, width, height)
  applyScanMode(out, page.mode)
  const canvas = newCanvas(width, height)
  canvas.getContext('2d')!.putImageData(new ImageData(out.data as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0)
  return canvas
}

function rotate(page: Page): Page {
  const { width: w, height: h } = page.canvas
  const canvas = newCanvas(h, w)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.translate(h, 0)
  ctx.rotate(Math.PI / 2)
  ctx.drawImage(page.canvas, 0, 0)
  const d = ctx.getImageData(0, 0, h, w)
  const q = page.quad.map((p) => ({ x: h - p.y, y: p.x })) as Quad
  // Keep the corners in reading order after the turn (old tl is now tr, ...).
  const quad: Quad = [q[3], q[0], q[1], q[2]]
  return { ...page, canvas, pixels: { data: d.data, width: h, height: w }, quad }
}

export default function Scan() {
  const t = useT()
  const [pages, setPages] = useState<Page[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const cameraRef = useRef<HTMLInputElement>(null)

  const page = pages[Math.min(current, pages.length - 1)]

  async function add(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (!images.length) return
    setError('')
    setLoading(true)
    const added: Page[] = []
    for (const f of images) {
      try {
        added.push(await loadPage(f))
      } catch {
        setError(tr(`“${f.name}” tidak bisa dibaca sebagai gambar.`, `“${f.name}” could not be read as an image.`))
      }
    }
    setLoading(false)
    if (added.length) {
      setPages((prev) => {
        setCurrent(prev.length)
        return [...prev, ...added]
      })
    }
  }

  function update(id: number, patch: Partial<Page>) {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function remove(id: number) {
    setPages((prev) => prev.filter((p) => p.id !== id))
    setCurrent((c) => Math.max(0, c - 1))
  }

  function autoDetect() {
    if (!page) return
    const found = detectDocument(page.pixels)
    update(page.id, { quad: found ?? defaultQuad(page.canvas.width, page.canvas.height), auto: !!found })
    if (!found) setError(t('Kertas tidak terdeteksi — tarik keempat sudutnya sendiri.', 'No paper found — drag the four corners yourself.'))
    else setError('')
  }

  async function exportPdf() {
    setExporting(true)
    setError('')
    try {
      const { PDFDocument } = await import('pdf-lib')
      const pdf = await PDFDocument.create()
      for (const p of pages) {
        if (!isConvex(p.quad)) throw new Error('quad')
        const canvas = render(p, EXPORT_SIDE)
        const jpg = await canvasBlob(canvas, 'image/jpeg', p.mode === 'bw' ? 0.8 : 0.88)
        const image = await pdf.embedJpg(new Uint8Array(await jpg.arrayBuffer()))
        // Width of an A4 page (595 pt); the height follows the paper's own shape.
        const w = 595
        const h = (w * canvas.height) / canvas.width
        pdf.addPage([w, h]).drawImage(image, { x: 0, y: 0, width: w, height: h })
        await new Promise((r) => setTimeout(r)) // let the UI breathe between pages
      }
      downloadBlob(new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' }), tr('scan-dokumen.pdf', 'scanned-document.pdf'))
    } catch {
      setError(t('Gagal membuat PDF. Pastikan keempat sudut membentuk bidang yang tidak menyilang.', 'Could not build the PDF. Make sure the four corners form a shape that does not cross itself.'))
    } finally {
      setExporting(false)
    }
  }

  async function exportJpg() {
    if (!page) return
    const blob = await canvasBlob(render(page, EXPORT_SIDE), 'image/jpeg', 0.9)
    downloadBlob(blob, page.name.replace(/\.[^.]+$/, '') + '-scan.jpg')
  }

  if (!pages.length) {
    return (
      <div className="space-y-6">
        <FileDrop
          accept="image/*,.heic,.heif"
          multiple
          label={t('Tarik foto kertas ke sini', 'Drop photos of paper here')}
          busyLabel={loading ? t('Membaca foto…', 'Reading photos…') : undefined}
          onFiles={(f) => void add(f)}
        />
        {error && <ErrorNote message={error} />}
        <p className="text-center text-xs text-muted-foreground">
          {t(
            'Foto dokumen dari galeri atau kamera. Sudut kertas dicari otomatis, lalu diluruskan dan dijadikan PDF — semuanya di perangkatmu.',
            'Photos of documents from your gallery or camera. The paper corners are found automatically, straightened and turned into a PDF — all on your device.',
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && <ErrorNote message={error} />}

      <div className="flex flex-wrap items-center gap-2">
        {pages.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setCurrent(i)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm transition-colors',
              p === page ? 'border-brand-2/60 bg-card font-medium' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t('Hal.', 'Page')} {i + 1}
          </button>
        ))}
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
          <Plus className="size-4" />
          {t('Tambah', 'Add')}
          <input
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="sr-only"
            onChange={(e) => {
              void add(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </label>
        <Button variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
          <Camera />
          {t('Kamera', 'Camera')}
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            void add(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      {page && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium">{t('1. Tarik keempat sudut ke sudut kertas', '1. Drag the four corners onto the paper')}</p>
            <CornerEditor key={page.id + ':' + page.canvas.width} page={page} onChange={(quad) => update(page.id, { quad, auto: false })} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={autoDetect}>
                <Wand2 />
                {t('Deteksi otomatis', 'Auto-detect')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPages((prev) => prev.map((p) => (p.id === page.id ? rotate(p) : p)))}>
                <RotateCw />
                {t('Putar 90°', 'Rotate 90°')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove(page.id)}>
                <Trash2 />
                {t('Hapus halaman', 'Remove page')}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">{t('2. Hasil', '2. Result')}</p>
            <Segmented
              label={t('Tampilan', 'Look')}
              value={page.mode}
              options={MODES.map((m) => ({ value: m.value, label: t(m.label[0], m.label[1]) }))}
              onChange={(mode) => update(page.id, { mode })}
            />
            <Preview page={page} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <Button onClick={() => void exportPdf()} disabled={exporting}>
          {exporting ? <Loader2 className="animate-spin" /> : <FileDown />}
          {t(`Unduh PDF (${pages.length} halaman)`, `Download PDF (${pages.length} ${pages.length === 1 ? 'page' : 'pages'})`)}
        </Button>
        <Button variant="outline" onClick={() => void exportJpg()}>
          <Download />
          {t('Halaman ini sebagai JPG', 'This page as JPG')}
        </Button>
      </div>
    </div>
  )
}

/** The photo with four draggable corner handles drawn over it. */
function CornerEditor({ page, onChange }: { page: Page; onChange: (q: Quad) => void }) {
  const { width: w, height: h } = page.canvas
  const svgRef = useRef<SVGSVGElement>(null)
  const holder = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<number | null>(null)

  useEffect(() => {
    const el = holder.current
    if (!el) return
    el.replaceChildren(page.canvas)
    page.canvas.className = 'block h-auto w-full'
  }, [page.canvas])

  function toImage(e: React.PointerEvent): Pt {
    const svg = svgRef.current!
    const m = svg.getScreenCTM()!.inverse()
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m)
    return { x: Math.min(Math.max(p.x, 0), w), y: Math.min(Math.max(p.y, 0), h) }
  }

  function move(e: React.PointerEvent) {
    if (drag === null) return
    const next = [...page.quad] as Quad
    next[drag] = toImage(e)
    onChange(next)
  }

  const r = Math.max(w, h) / 40
  const points = page.quad.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="relative overflow-hidden rounded-xl border bg-muted/40 touch-none select-none">
      <div ref={holder} />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 size-full"
        onPointerMove={move}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        <polygon
          points={points}
          fill="rgb(99 102 241 / 0.15)"
          stroke={isConvex(page.quad) ? 'rgb(99 102 241)' : 'rgb(239 68 68)'}
          strokeWidth={r / 5}
        />
        {page.quad.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={r}
            fill="rgb(99 102 241 / 0.55)"
            stroke="white"
            strokeWidth={r / 6}
            className="cursor-grab"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              setDrag(i)
            }}
          />
        ))}
      </svg>
    </div>
  )
}

/** The straightened page, redrawn shortly after any change. */
function Preview({ page }: { page: Page }) {
  const t = useT()
  const ref = useRef<HTMLCanvasElement>(null)
  const ok = useMemo(() => isConvex(page.quad), [page.quad])

  useEffect(() => {
    if (!ok) return
    const timer = setTimeout(() => {
      const out = render(page, PREVIEW_SIDE)
      const el = ref.current
      if (!el) return
      el.width = out.width
      el.height = out.height
      el.getContext('2d')!.drawImage(out, 0, 0)
    }, 120) // wait for the drag to settle
    return () => clearTimeout(timer)
  }, [page, ok])

  if (!ok)
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t('Sudut menyilang — atur ulang urutannya.', 'The corners cross — move them back into a four-sided shape.')}
      </p>
    )
  return <canvas ref={ref} className="h-auto w-full rounded-xl border bg-white" />
}
