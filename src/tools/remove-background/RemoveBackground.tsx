import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Brush, Contrast, Download, Lasso, Loader2, Pipette, RotateCcw, SquareDashed, Undo2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { canvasBlob, decodeImage, newCanvas } from '@/lib/image'
import { cn } from '@/lib/utils'
import {
  applyCoverage,
  applyRegion,
  colorRegion,
  compose,
  floodRegion,
  invert,
  refine,
  strokeBrush,
  type Action,
} from './mask'

/** Longest side the image is worked on at; keeps every step well under a second. */
const MAX_SIDE = 3000
const HISTORY = 10

type Tool = 'wand' | 'color' | 'lasso' | 'rect' | 'brush'
type Text = readonly [string, string]
const TOOLS: { value: Tool; label: Text; icon: ReactNode; hint: Text }[] = [
  {
    value: 'wand',
    label: ['Tongkat', 'Wand'],
    icon: <Wand2 />,
    hint: [
      'Klik latar: area bersambung yang warnanya mirip ikut terpilih. Klik beberapa kali untuk bagian latar lain.',
      'Click the background: the connected area with a similar color gets selected. Click again for other parts of the background.',
    ],
  },
  {
    value: 'color',
    label: ['Warna', 'Color'],
    icon: <Pipette />,
    hint: [
      'Klik satu warna: semua piksel serupa di seluruh gambar ikut terpilih, walau tidak bersambung (mis. latar putih di sela huruf).',
      'Click a color: every similar pixel across the whole image gets selected, even if not connected (e.g. white background between letters).',
    ],
  },
  {
    value: 'lasso',
    label: ['Lasso', 'Lasso'],
    icon: <Lasso />,
    hint: [
      'Gambar garis mengelilingi objek sambil menahan klik. Pilih apakah yang terkena bagian dalam atau luar garis.',
      'Hold the click and draw a line around the object. Choose whether it applies inside or outside the line.',
    ],
  },
  {
    value: 'rect',
    label: ['Kotak', 'Box'],
    icon: <SquareDashed />,
    hint: [
      'Tarik kotak di sekitar objek. Pilih apakah yang terkena bagian dalam atau luar kotak.',
      'Drag a box around the object. Choose whether it applies inside or outside the box.',
    ],
  },
  {
    value: 'brush',
    label: ['Kuas', 'Brush'],
    icon: <Brush />,
    hint: [
      'Sapukan untuk merapikan. Pakai “Pulihkan” untuk mengembalikan bagian yang terhapus — mode Tinjau membantu melihatnya.',
      'Brush to tidy up. Use “Restore” to bring back erased parts — Review mode helps you see them.',
    ],
  },
]

const ACTION_OPTIONS: { value: Action; label: Text }[] = [
  { value: 'erase', label: ['Hapus', 'Erase'] },
  { value: 'restore', label: ['Pulihkan', 'Restore'] },
]
const SIDE_OPTIONS: { value: 'outside' | 'inside'; label: Text }[] = [
  { value: 'outside', label: ['Luar seleksi', 'Outside selection'] },
  { value: 'inside', label: ['Dalam seleksi', 'Inside selection'] },
]
const SHRINK_OPTIONS: { value: number; label: Text }[] = [
  { value: 0, label: ['Tidak', 'None'] },
  { value: 1, label: ['1 px', '1 px'] },
  { value: 2, label: ['2 px', '2 px'] },
  { value: 3, label: ['3 px', '3 px'] },
]
const FEATHER_OPTIONS: { value: number; label: Text }[] = [
  { value: 0, label: ['Tajam', 'Sharp'] },
  { value: 1, label: ['Halus', 'Smooth'] },
  { value: 2, label: ['Lembut', 'Soft'] },
  { value: 4, label: ['Sangat lembut', 'Very soft'] },
]
const VIEW_OPTIONS: { value: 'result' | 'overlay'; label: Text }[] = [
  { value: 'result', label: ['Hasil', 'Result'] },
  { value: 'overlay', label: ['Tinjau', 'Review'] },
]
const ZOOM_OPTIONS: { value: number; label: Text }[] = [
  { value: 0, label: ['Pas', 'Fit'] },
  { value: 1, label: ['100%', '100%'] },
  { value: 2, label: ['200%', '200%'] },
  { value: 4, label: ['400%', '400%'] },
]

type Background = 'transparent' | 'white' | 'red' | 'blue' | 'custom'
const BACKGROUNDS: { value: Background; label: Text; color?: string }[] = [
  { value: 'transparent', label: ['Transparan', 'Transparent'] },
  { value: 'white', label: ['Putih', 'White'], color: '#ffffff' },
  { value: 'red', label: ['Merah', 'Red'], color: '#db1514' },
  { value: 'blue', label: ['Biru', 'Blue'], color: '#0f58c9' },
  { value: 'custom', label: ['Lainnya', 'Other'] },
]

interface Picture {
  W: number
  H: number
  rgba: Uint8ClampedArray
  /** True when it was scaled down to MAX_SIDE. */
  scaled: boolean
  name: string
}

type Point = { x: number; y: number }
type Selection = { kind: 'lasso'; points: Point[] } | { kind: 'rect'; from: Point; to: Point }

const CHECKER = '[background:repeating-conic-gradient(#d4d4d8_0_25%,#fff_0_50%)_0_0/16px_16px]'

export default function RemoveBackground() {
  const t = useT()
  const options = <V,>(list: { value: V; label: Text }[]) => list.map((o) => ({ value: o.value, label: t(...o.label) }))
  const [picture, setPicture] = useState<Picture | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tool, setTool] = useState<Tool>('wand')
  const [action, setAction] = useState<Action>('erase')
  const [side, setSide] = useState<'outside' | 'inside'>('outside')
  const [tolerance, setTolerance] = useState(25)
  const [brushSize, setBrushSize] = useState(30)
  const [shrink, setShrink] = useState(1)
  const [feather, setFeather] = useState(1)
  const [view, setView] = useState<'result' | 'overlay'>('result')
  const [zoom, setZoom] = useState(0)
  const [background, setBackground] = useState<Background>('transparent')
  const [customColor, setCustomColor] = useState('#16a34a')
  const [jpg, setJpg] = useState(false)

  /** Edited in place; `version` tells React it changed. */
  const mask = useRef<Uint8Array>(new Uint8Array(0))
  const history = useRef<Uint8Array[]>([])
  const [version, setVersion] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [hover, setHover] = useState<Point | null>(null)
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stroke = useRef<Point | null>(null)
  const frame = useRef(0)

  async function open(file: File) {
    setError(null)
    setLoading(true)
    try {
      const image = await decodeImage(file)
      const s = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))
      const c = newCanvas(image.width * s, image.height * s)
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(image.source, 0, 0, c.width, c.height)
      image.close()
      const rgba = ctx.getImageData(0, 0, c.width, c.height).data
      mask.current = new Uint8Array(c.width * c.height).fill(255)
      history.current = []
      setCanUndo(false)
      setBrushSize(Math.max(4, Math.round(Math.max(c.width, c.height) / 40)))
      setPicture({ W: c.width, H: c.height, rgba, scaled: s < 1, name: file.name })
      setVersion((v) => v + 1)
    } catch {
      setError(t('Gambar tidak bisa dibaca. Coba JPG, PNG, atau WebP.', "Couldn't read the image. Try JPG, PNG, or WebP."))
    } finally {
      setLoading(false)
    }
  }

  /** Draws the current mask; `raw` skips edge refinement (used while a brush stroke is in progress). */
  const paint = useCallback(
    (raw: boolean) => {
      const canvas = canvasRef.current
      if (!canvas || !picture) return
      const { W, H, rgba } = picture
      const alpha = raw ? mask.current : refine(mask.current, W, H, shrink, feather)
      canvas.getContext('2d')!.putImageData(new ImageData(compose(rgba, alpha, view), W, H), 0, 0)
    },
    [picture, shrink, feather, view],
  )

  useEffect(() => paint(false), [paint, version])

  function snapshot() {
    history.current.push(mask.current.slice())
    if (history.current.length > HISTORY) history.current.shift()
    setCanUndo(true)
  }

  const undo = useCallback(() => {
    const prev = history.current.pop()
    if (!prev) return
    mask.current = prev
    setCanUndo(history.current.length > 0)
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  function toImage(e: PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect()
    const { W, H } = picture!
    return {
      x: Math.min(W - 0.01, Math.max(0, ((e.clientX - rect.left) / rect.width) * W)),
      y: Math.min(H - 0.01, Math.max(0, ((e.clientY - rect.top) / rect.height) * H)),
    }
  }

  /** Rasterises a lasso/box with a canvas (anti-aliased edge) and applies it. */
  function applySelection(sel: Selection) {
    if (!picture) return
    const { W, H } = picture
    const c = newCanvas(W, H)
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.beginPath()
    if (sel.kind === 'lasso') {
      sel.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.closePath()
    } else {
      ctx.rect(Math.min(sel.from.x, sel.to.x), Math.min(sel.from.y, sel.to.y), Math.abs(sel.to.x - sel.from.x), Math.abs(sel.to.y - sel.from.y))
    }
    ctx.fill()
    const data = ctx.getImageData(0, 0, W, H).data
    const coverage = new Uint8Array(W * H)
    for (let i = 0; i < coverage.length; i++) coverage[i] = data[i * 4 + 3]
    snapshot()
    applyCoverage(mask.current, coverage, action, side === 'inside')
    setVersion((v) => v + 1)
  }

  function onDown(e: PointerEvent<HTMLCanvasElement>) {
    if (!picture || e.button > 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = toImage(e)
    const { W, H, rgba } = picture
    const x = Math.floor(p.x)
    const y = Math.floor(p.y)
    if (tool === 'wand' || tool === 'color') {
      snapshot()
      const i = (y * W + x) * 4
      const region =
        tool === 'wand'
          ? floodRegion(rgba, W, H, x, y, tolerance)
          : colorRegion(rgba, [rgba[i], rgba[i + 1], rgba[i + 2]], tolerance)
      applyRegion(mask.current, region, action)
      setVersion((v) => v + 1)
    } else if (tool === 'brush') {
      snapshot()
      stroke.current = p
      strokeBrush(mask.current, W, H, p, p, brushSize / 2, 0.6, action)
      paint(true)
    } else if (tool === 'lasso') {
      setSelection({ kind: 'lasso', points: [p] })
    } else {
      setSelection({ kind: 'rect', from: p, to: p })
    }
  }

  function onMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!picture) return
    const p = toImage(e)
    setHover(p)
    if (tool === 'brush' && stroke.current) {
      strokeBrush(mask.current, picture.W, picture.H, stroke.current, p, brushSize / 2, 0.6, action)
      stroke.current = p
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => paint(true))
    } else if (selection?.kind === 'lasso') {
      const last = selection.points[selection.points.length - 1]
      if (Math.hypot(p.x - last.x, p.y - last.y) > 2) setSelection({ kind: 'lasso', points: [...selection.points, p] })
    } else if (selection?.kind === 'rect') {
      setSelection({ ...selection, to: p })
    }
  }

  function onUp() {
    if (stroke.current) {
      stroke.current = null
      cancelAnimationFrame(frame.current)
      setVersion((v) => v + 1)
    }
    if (selection) {
      const big =
        selection.kind === 'lasso'
          ? selection.points.length >= 3
          : Math.abs(selection.to.x - selection.from.x) > 2 && Math.abs(selection.to.y - selection.from.y) > 2
      if (big) applySelection(selection)
      setSelection(null)
    }
  }

  function edit(fn: (m: Uint8Array) => void) {
    snapshot()
    fn(mask.current)
    setVersion((v) => v + 1)
  }

  const fill = background === 'custom' ? customColor : BACKGROUNDS.find((b) => b.value === background)?.color

  async function save() {
    if (!picture) return
    setSaving(true)
    try {
      const { W, H, rgba, name } = picture
      const cut = newCanvas(W, H)
      cut.getContext('2d')!.putImageData(new ImageData(compose(rgba, refine(mask.current, W, H, shrink, feather), 'result'), W, H), 0, 0)
      let out = cut
      if (fill) {
        out = newCanvas(W, H)
        const ctx = out.getContext('2d')!
        ctx.fillStyle = fill
        ctx.fillRect(0, 0, W, H)
        ctx.drawImage(cut, 0, 0)
      }
      const asJpg = !!fill && jpg
      const blob = await canvasBlob(out, asJpg ? 'image/jpeg' : 'image/png', 0.92)
      downloadBlob(blob, `${name.replace(/\.[^.]+$/, '')}${tr('-tanpa-latar', '-no-background')}.${asJpg ? 'jpg' : 'png'}`)
    } catch {
      setError(t('Gagal menyimpan gambar.', "Couldn't save the image."))
    } finally {
      setSaving(false)
    }
  }

  if (!picture) {
    return (
      <div className="space-y-6">
        <FileDrop
          accept="image/*"
          label={t('Tarik foto ke sini', 'Drop a photo here')}
          busyLabel={loading ? t('Membuka gambar…', 'Opening image…') : undefined}
          onFiles={([f]) => void open(f)}
        />
        <p className="text-center text-xs text-muted-foreground">
          {t(
            'Tanpa AI: kamu yang memilih latarnya — paling cocok untuk latar polos (foto produk, pas foto, logo, scan).',
            'No AI: you pick the background — works best on plain backgrounds (product photos, ID photos, logos, scans).',
          )}
        </p>
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  const { W, H } = picture
  const current = TOOLS.find((item) => item.value === tool)!
  const checker = view === 'overlay' || !fill
  const sizeStyle = zoom ? { width: W * zoom } : { width: `min(100%, calc(70vh * ${W / H}))` }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{picture.name}</p>
          <p className="text-sm text-muted-foreground">
            {W} × {H} px{picture.scaled &&
              t(
                ` (diperkecil ke ${MAX_SIDE} px agar cepat diproses)`,
                ` (scaled down to ${MAX_SIDE} px for faster processing)`,
              )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Download />}
            {t('Unduh', 'Download')} {fill && jpg ? 'JPG' : 'PNG'}
          </Button>
          <Button variant="ghost" disabled={saving} onClick={() => setPicture(null)}>
            <RotateCcw />
            {t('Gambar lain', 'Another image')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="radiogroup" aria-label={t('Alat', 'Tools')} className="inline-flex flex-wrap gap-1 rounded-xl border bg-muted/60 p-1">
              {TOOLS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={tool === item.value}
                  onClick={() => setTool(item.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors [&_svg]:size-4',
                    tool === item.value ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.icon}
                  {t(...item.label)}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={!canUndo} onClick={undo} title="Ctrl/⌘ + Z">
                <Undo2 />
                {t('Urungkan', 'Undo')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => edit(invert)} title={t('Yang terhapus jadi tersimpan, dan sebaliknya', 'Erased becomes kept, and vice versa')}>
                <Contrast />
                {t('Balik', 'Invert')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => edit((m) => m.fill(255))}>
                <RotateCcw />
                Reset
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t(...current.hint)}</p>

          {/* Canvas */}
          <div className="max-h-[75vh] overflow-auto rounded-2xl border bg-muted/60 p-4">
            <div
              className={cn('relative mx-auto', checker && CHECKER)}
              style={{ ...sizeStyle, aspectRatio: `${W} / ${H}`, background: checker ? undefined : fill }}
            >
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onPointerLeave={() => setHover(null)}
                className={cn('block size-full touch-none', tool === 'brush' ? 'cursor-none' : 'cursor-crosshair')}
                style={{ imageRendering: zoom >= 2 ? 'pixelated' : undefined }}
              />
              <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 size-full" aria-hidden>
                {selection?.kind === 'lasso' && (
                  <polygon
                    points={selection.points.map((p) => `${p.x},${p.y}`).join(' ')}
                    className="fill-brand-2/15 stroke-brand-2"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {selection?.kind === 'rect' && (
                  <rect
                    x={Math.min(selection.from.x, selection.to.x)}
                    y={Math.min(selection.from.y, selection.to.y)}
                    width={Math.abs(selection.to.x - selection.from.x)}
                    height={Math.abs(selection.to.y - selection.from.y)}
                    className="fill-brand-2/15 stroke-brand-2"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {tool === 'brush' && hover && (
                  <>
                    <circle cx={hover.x} cy={hover.y} r={brushSize / 2} fill="none" stroke="#000" strokeWidth={3} vectorEffect="non-scaling-stroke" opacity={0.5} />
                    <circle cx={hover.x} cy={hover.y} r={brushSize / 2} fill="none" stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                  </>
                )}
              </svg>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Segmented label={t('Tampilan', 'View')} value={view} options={options(VIEW_OPTIONS)} onChange={setView} />
            <Segmented label="Zoom" value={zoom} options={options(ZOOM_OPTIONS)} onChange={setZoom} />
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-5 rounded-2xl border bg-card p-5">
          <Segmented label={t('Aksi', 'Action')} value={action} options={options(ACTION_OPTIONS)} onChange={setAction} />

          {(tool === 'lasso' || tool === 'rect') && (
            <Segmented label={t('Kenakan ke', 'Apply to')} value={side} options={options(SIDE_OPTIONS)} onChange={setSide} />
          )}
          {(tool === 'wand' || tool === 'color') && (
            <Slider
              label={t('Toleransi warna', 'Color tolerance')}
              value={tolerance}
              min={0}
              max={100}
              step={1}
              onChange={setTolerance}
            />
          )}
          {tool === 'brush' && (
            <Slider
              label={t('Ukuran kuas', 'Brush size')}
              suffix=" px"
              value={brushSize}
              min={2}
              max={Math.max(50, Math.round(Math.max(W, H) / 6))}
              step={1}
              onChange={setBrushSize}
            />
          )}

          <div className="space-y-4 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">{t('Tepi', 'Edges')}</p>
            <Segmented
              label={t('Kikis tepi (hilangkan sisa warna latar)', 'Shrink edges (remove leftover background color)')}
              value={shrink}
              options={options(SHRINK_OPTIONS)}
              onChange={setShrink}
            />
            <Segmented
              label={t('Haluskan tepi', 'Smooth edges')}
              value={feather}
              options={options(FEATHER_OPTIONS)}
              onChange={setFeather}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">{t('Latar baru', 'New background')}</p>
            <div className="flex flex-wrap gap-2">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  aria-pressed={background === b.value}
                  onClick={() => setBackground(b.value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs',
                    background === b.value ? 'border-brand-2/60 ring-2 ring-brand-2/30' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span
                    className={cn('size-4 rounded border', b.value === 'transparent' && CHECKER)}
                    style={{ background: b.value === 'custom' ? customColor : b.color }}
                  />
                  {t(...b.label)}
                </button>
              ))}
            </div>
            {background === 'custom' && (
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                aria-label={t('Warna latar', 'Background color')}
                className="h-9 w-14 cursor-pointer rounded-lg border bg-background p-1"
              />
            )}
            {fill && (
              <Segmented
                label="Format"
                value={jpg ? 'jpg' : 'png'}
                options={[
                  { value: 'png', label: 'PNG' },
                  { value: 'jpg', label: 'JPG' },
                ]}
                onChange={(v) => setJpg(v === 'jpg')}
              />
            )}
          </div>
        </div>
      </div>

      {error && <ErrorNote message={error} />}
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <label className="block space-y-2">
      <span className="flex justify-between text-xs font-medium text-muted-foreground">
        {label}
        <span className="font-mono text-foreground">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--brand-2)]"
      />
    </label>
  )
}
