import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { Download, Eye, Loader2, Redo2, RotateCcw, Sparkles, Trash2, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { ProgressCard } from '@/components/tool/SizeResult'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { canvasBlob, decodeImage, newCanvas, UnreadableImageError } from '@/lib/image'
import { cn } from '@/lib/utils'
import { CancelledError, inpaint, type Patch } from './inpaint'

/** Longest side the photo is worked on at; larger photos are scaled down to it. */
const MAX_SIDE = 4096
const HISTORY = 30
const ACCEPT = 'image/jpeg,image/png,image/webp,image/bmp,image/avif,image/heic'

type Mode = 'paint' | 'erase'
type Format = 'png' | 'jpg'
interface Point {
  x: number
  y: number
}
interface Stroke {
  points: Point[]
  /** Diameter in photo pixels. */
  size: number
  erase: boolean
}
type Step = { kind: 'stroke'; stroke: Stroke } | { kind: 'clear'; strokes: Stroke[] } | { kind: 'fill'; patches: Patch[]; strokes: Stroke[] }
type Phase = { kind: 'idle' } | { kind: 'loading' } | { kind: 'working'; done: number; total: number; startedAt: number }

export default function RemoveObject() {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [size, setSize] = useState<{ W: number; H: number; scaled: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('paint')
  const [brush, setBrush] = useState(40)
  const [format, setFormat] = useState<Format>('jpg')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [hover, setHover] = useState<Point | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const [version, setVersion] = useState(0)

  const photoRef = useRef<HTMLCanvasElement>(null)
  const maskRef = useRef<HTMLCanvasElement>(null)
  /** The photo as opened (for "hold to compare"). */
  const original = useRef<HTMLCanvasElement | null>(null)
  /** The photo being edited; drawn into the visible canvas. */
  const work = useRef<HTMLCanvasElement | null>(null)
  const strokes = useRef<Stroke[]>([])
  const drawing = useRef<Stroke | null>(null)
  const undoStack = useRef<Step[]>([])
  const redoStack = useRef<Step[]>([])
  const signal = useRef({ cancelled: false })
  const busy = phase.kind !== 'idle'

  const bump = () => setVersion((v) => v + 1)

  /** Redraws the visible photo (edited, or the original while comparing). */
  const drawPhoto = useCallback(() => {
    const c = photoRef.current
    const src = showOriginal ? original.current : work.current
    if (!c || !src) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(src, 0, 0)
  }, [showOriginal])

  /** Redraws the painted mask from the stroke list. */
  const drawMask = useCallback(() => {
    const c = maskRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    const all = drawing.current ? [...strokes.current, drawing.current] : strokes.current
    for (const s of all) drawStroke(ctx, s)
  }, [])

  // Redraw after an edit, undo/redo, or a new photo — not on every pointer move.
  useEffect(() => drawPhoto(), [drawPhoto, version, size])
  useEffect(() => drawMask(), [drawMask, version, size])

  async function open(next: File) {
    setError(null)
    try {
      const decoded = await decodeImage(next)
      const scale = Math.min(1, MAX_SIDE / Math.max(decoded.width, decoded.height))
      const W = Math.max(1, Math.round(decoded.width * scale))
      const H = Math.max(1, Math.round(decoded.height * scale))
      const o = newCanvas(W, H)
      o.getContext('2d')!.drawImage(decoded.source, 0, 0, W, H)
      decoded.close()
      const w = newCanvas(W, H)
      w.getContext('2d', { willReadFrequently: true })!.drawImage(o, 0, 0)
      original.current = o
      work.current = w
      strokes.current = []
      undoStack.current = []
      redoStack.current = []
      setFile(next)
      setSize({ W, H, scaled: scale < 1 })
      setFormat(/png|webp/i.test(next.type) ? 'png' : 'jpg')
      // A comfortable brush: about 4% of the photo's longer side.
      setBrush(Math.max(8, Math.round(Math.max(W, H) * 0.04)))
    } catch (e) {
      setError(
        e instanceof UnreadableImageError
          ? t('Gambar tidak bisa dibuka. Coba JPG, PNG, atau WebP.', "The image couldn't be opened. Try JPG, PNG or WebP.")
          : t('Gagal membuka gambar.', "Couldn't open the image."),
      )
    }
  }

  function reset() {
    for (const c of [original.current, work.current]) if (c) c.width = c.height = 0
    original.current = work.current = null
    strokes.current = []
    undoStack.current = []
    redoStack.current = []
    setFile(null)
    setSize(null)
    setError(null)
  }

  function push(step: Step) {
    undoStack.current.push(step)
    if (undoStack.current.length > HISTORY) undoStack.current.shift()
    redoStack.current = []
  }

  const undo = useCallback(() => {
    const step = undoStack.current.pop()
    if (!step) return
    if (step.kind === 'stroke') strokes.current = strokes.current.slice(0, -1)
    else if (step.kind === 'clear') strokes.current = step.strokes
    else {
      const ctx = work.current!.getContext('2d')!
      for (const p of [...step.patches].reverse()) ctx.putImageData(p.before, p.x, p.y)
      strokes.current = step.strokes
    }
    redoStack.current.push(step)
    bump()
  }, [])

  const redo = useCallback(() => {
    const step = redoStack.current.pop()
    if (!step) return
    if (step.kind === 'stroke') strokes.current = [...strokes.current, step.stroke]
    else if (step.kind === 'clear') strokes.current = []
    else {
      const ctx = work.current!.getContext('2d')!
      for (const p of step.patches) ctx.putImageData(p.after, p.x, p.y)
      strokes.current = []
    }
    undoStack.current.push(step)
    bump()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Leave Ctrl+Z to text fields, also the host page's (inside Shadow DOM, e.target is the host element).
      const el = e.composedPath()[0]
      if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  function toImage(e: PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect()
    const { W, H } = size!
    return {
      x: Math.min(W, Math.max(0, ((e.clientX - rect.left) / rect.width) * W)),
      y: Math.min(H, Math.max(0, ((e.clientY - rect.top) / rect.height) * H)),
    }
  }

  function onDown(e: PointerEvent<HTMLCanvasElement>) {
    if (!size || busy || e.button > 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = { points: [toImage(e)], size: brush, erase: mode === 'erase' }
    drawMask()
  }

  function onMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!size) return
    const p = toImage(e)
    setHover(p)
    const s = drawing.current
    if (!s) return
    const last = s.points[s.points.length - 1]
    if (Math.hypot(p.x - last.x, p.y - last.y) < Math.max(1, s.size / 8)) return
    s.points.push(p)
    const ctx = maskRef.current?.getContext('2d')
    if (ctx) drawStroke(ctx, { ...s, points: [last, p] })
  }

  function onUp() {
    const s = drawing.current
    if (!s) return
    drawing.current = null
    strokes.current = [...strokes.current, s]
    push({ kind: 'stroke', stroke: s })
    bump()
  }

  function clearMask() {
    if (!strokes.current.length) return
    push({ kind: 'clear', strokes: strokes.current })
    strokes.current = []
    bump()
  }

  /** The painted area as one byte per photo pixel (non-zero = remove). */
  function readMask(): Uint8Array | null {
    const c = maskRef.current
    if (!c) return null
    const data = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data
    const m = new Uint8Array(c.width * c.height)
    let any = false
    for (let i = 0; i < m.length; i++)
      if (data[i * 4 + 3] > 24) {
        m[i] = 1
        any = true
      }
    return any ? m : null
  }

  async function run() {
    const mask = readMask()
    if (!work.current || !mask) return
    setError(null)
    signal.current = { cancelled: false }
    setPhase({ kind: 'loading' })
    const startedAt = Date.now()
    const used = strokes.current
    const patches: Patch[] = []
    try {
      await inpaint(work.current, mask, {
        patches,
        signal: signal.current,
        onProgress: (done, total) => {
          setPhase({ kind: 'working', done, total, startedAt })
          bump()
        },
      })
      strokes.current = []
    } catch (e) {
      if (!(e instanceof CancelledError))
        setError(
          t(
            'Gagal menghapus objek. Biasanya karena memori perangkat tidak cukup: coba foto yang lebih kecil atau tutup tab lain.',
            "Couldn't remove the object, usually because the device ran out of memory: try a smaller photo or close other tabs.",
          ),
        )
    } finally {
      // A cancelled run may have filled some areas already: keep them, as one undoable step.
      if (patches.length) push({ kind: 'fill', patches, strokes: used })
      setPhase({ kind: 'idle' })
      bump()
    }
  }

  async function save() {
    if (!work.current || !file) return
    let target = work.current
    if (format === 'jpg') {
      // JPG has no transparency: put it on white.
      target = newCanvas(target.width, target.height)
      const ctx = target.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, target.width, target.height)
      ctx.drawImage(work.current, 0, 0)
    }
    const blob = await canvasBlob(target, format === 'png' ? 'image/png' : 'image/jpeg', 0.92)
    if (target !== work.current) target.width = target.height = 0
    downloadBlob(blob, `${file.name.replace(/\.[^.]+$/, '')}-bersih.${format}`)
  }

  if (!file || !size) {
    return (
      <div className="space-y-6">
        <FileDrop accept={ACCEPT} label={t('Tarik foto ke sini', 'Drag a photo here')} onFiles={([f]) => void open(f)} />
        {error && <ErrorNote message={error} />}
        <p className="text-xs text-muted-foreground">
          {t(
            'Pertama kali dipakai, model AI dan mesinnya (±35 MB) diunduh sekali dari situs ini, lalu tersimpan di browser. Fotomu tidak pernah diunggah.',
            'The first time, the AI model and its runtime (~35 MB) are downloaded once from this site and kept by the browser. Your photo is never uploaded.',
          )}
        </p>
      </div>
    )
  }

  const { W, H } = size
  const hasMask = strokes.current.length > 0 || !!drawing.current
  const edited = undoStack.current.some((s) => s.kind === 'fill')
  const sizeStyle = { width: `min(100%, calc(70vh * ${W / H}))` }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{file.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {W}×{H} px{size.scaled && ` · ${t(`diperkecil ke ${MAX_SIDE} px`, `scaled to ${MAX_SIDE} px`)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={busy || !edited}>
            <Download />
            {t(`Unduh ${format.toUpperCase()}`, `Download ${format.toUpperCase()}`)}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={reset}>
            <RotateCcw />
            {t('Foto lain', 'Another photo')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-2xl border bg-card p-4">
        <Segmented
          label={t('Kuas', 'Brush')}
          value={mode}
          options={[
            { value: 'paint', label: t('Tandai', 'Mark') },
            { value: 'erase', label: t('Hapus tanda', 'Unmark') },
          ]}
          onChange={setMode}
        />
        <label className="block min-w-40 flex-1 space-y-2">
          <span className="flex justify-between text-xs font-medium text-muted-foreground">
            {t('Ukuran kuas', 'Brush size')}
            <span className="font-mono text-foreground">{brush} px</span>
          </span>
          <input
            type="range"
            min={4}
            max={Math.max(40, Math.round(Math.max(W, H) / 6))}
            value={brush}
            onChange={(e) => setBrush(Number(e.target.value))}
            className="w-full accent-[var(--brand-2)]"
          />
        </label>
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={undo} disabled={busy || !undoStack.current.length}>
            <Undo2 />
            {t('Urungkan', 'Undo')}
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={busy || !redoStack.current.length}>
            <Redo2 />
            {t('Ulangi', 'Redo')}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearMask} disabled={busy || !strokes.current.length}>
            <Trash2 />
            {t('Bersihkan tanda', 'Clear marks')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
        <Button onClick={() => void run()} disabled={busy || !hasMask}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {phase.kind === 'loading' ? t('Memuat model AI…', 'Loading the AI model…') : t('Hapus yang ditandai', 'Remove marked area')}
        </Button>
        <Button
          variant="ghost"
          disabled={busy || !edited}
          onPointerDown={() => setShowOriginal(true)}
          onPointerUp={() => setShowOriginal(false)}
          onPointerLeave={() => setShowOriginal(false)}
          onKeyDown={(e) => e.key === ' ' && setShowOriginal(true)}
          onKeyUp={() => setShowOriginal(false)}
        >
          <Eye />
          {t('Tahan: lihat asli', 'Hold: see original')}
        </Button>
        <p className="min-w-48 flex-1 text-xs text-muted-foreground">
          {t(
            'Warnai orang, benda, tulisan, atau coretan yang ingin dihilangkan — sedikit melebar dari pinggirnya, termasuk bayangannya — lalu tekan Hapus. Ulangi untuk merapikan.',
            'Paint over the people, things, text or scribbles you want gone — a little past their edges, shadows included — then press Remove. Repeat to touch up.',
          )}
        </p>
      </div>

      {phase.kind === 'working' && phase.total > 1 && (
        <ProgressCard
          label={t(`Mengisi area ${phase.done}/${phase.total}…`, `Filling area ${phase.done}/${phase.total}…`)}
          progress={phase.done / phase.total}
          startedAt={phase.startedAt}
          action={
            <Button variant="ghost" size="sm" onClick={() => (signal.current.cancelled = true)}>
              <X />
              {t('Batal', 'Cancel')}
            </Button>
          }
        />
      )}

      <div className="overflow-hidden rounded-2xl border bg-muted/60 p-3">
        <div className="relative mx-auto" style={{ ...sizeStyle, aspectRatio: `${W} / ${H}` }}>
          <canvas ref={photoRef} width={W} height={H} className="absolute inset-0 block size-full" />
          <canvas
            ref={maskRef}
            width={W}
            height={H}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onPointerLeave={() => setHover(null)}
            className={cn('absolute inset-0 block size-full touch-none opacity-55 cursor-none', (busy || showOriginal) && 'invisible')}
            aria-label={t('Foto: warnai bagian yang ingin dihapus', 'Photo: paint the part to remove')}
          />
          {hover && !busy && (
            <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 size-full" aria-hidden>
              <circle cx={hover.x} cy={hover.y} r={brush / 2} fill="none" stroke="#000" strokeWidth={3} vectorEffect="non-scaling-stroke" opacity={0.5} />
              <circle cx={hover.x} cy={hover.y} r={brush / 2} fill="none" stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-background/40">
              <Loader2 className="size-8 animate-spin text-brand-2" />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Segmented
          label="Format"
          value={format}
          options={[
            { value: 'jpg', label: 'JPG' },
            { value: 'png', label: 'PNG' },
          ]}
          onChange={setFormat}
        />
      </div>

      {error && <ErrorNote message={error} />}

      <p className="text-xs text-muted-foreground">
        {t(
          'Pakai model MI-GAN di perangkatmu (GPU lewat WebGPU bila ada). Paling rapi untuk objek kecil sampai sedang di latar seperti langit, tembok, jalan, pasir, atau rumput. Gunakan untuk foto milikmu sendiri; jangan untuk menghapus watermark atau kredit karya orang lain.',
          'Runs the MI-GAN model on your device (GPU via WebGPU when available). Works best for small to medium objects on backgrounds like sky, walls, roads, sand or grass. Use it on your own photos, not to strip watermarks or credits from other people’s work.',
        )}
      </p>
    </div>
  )
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over'
  // The mask colour is the accent; the canvas is shown half transparent over the photo.
  ctx.strokeStyle = ctx.fillStyle = getComputedStyle(ctx.canvas).getPropertyValue('--brand-fill-1').trim() || '#c6ff3a'
  ctx.lineWidth = s.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (s.points.length === 1) {
    ctx.beginPath()
    ctx.arc(s.points[0].x, s.points[0].y, s.size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}
