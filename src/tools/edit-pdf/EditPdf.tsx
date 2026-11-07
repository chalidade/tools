import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ImagePlus,
  Loader2,
  Minus,
  MousePointer2,
  Pencil,
  RotateCcw,
  Square,
  Trash2,
  Type,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { IconButton } from '@/components/tool/IconButton'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { isPdfFile, openErrorMessage, pageThumbs, type PageThumb } from '@/lib/pdf-doc'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  CHECK_PATH,
  FONT_CSS,
  LINE_HEIGHT,
  bounds,
  editPdf,
  hasUnsupported,
  moveItem,
  readImage,
  textBox,
  type FontKey,
  type Item,
  type PickedImage,
  type Pt,
} from './edit'

type Tool = 'select' | 'text' | 'rect' | 'line' | 'check' | 'draw'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'ready'; thumbs: PageThumb[] }
  | { kind: 'error'; message: string }

type Drag =
  | { mode: 'move'; id: string; start: Pt; from: Item }
  | { mode: 'resize'; id: string }
  | { mode: 'create'; id: string; start: Pt }

const SWATCHES = ['#111111', '#dc2626', '#2563eb', '#16a34a', '#ffffff']
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export default function EditPdf() {
  const t = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [images, setImages] = useState<PickedImage[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('text')
  const [color, setColor] = useState('#111111')
  const [stroke, setStroke] = useState(2)
  const [page, setPage] = useState(1)
  const [large, setLarge] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<Drag | null>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef(images)
  imagesRef.current = images

  const thumbs = status.kind === 'ready' ? status.thumbs : null

  useEffect(() => {
    if (!file || !thumbs || large[page]) return
    let current = true
    void pageThumbs(file, 1400, undefined, [page]).then(({ thumbs: [big] }) => {
      if (current) setLarge((l) => ({ ...l, [page]: big.src }))
    })
    return () => {
      current = false
    }
  }, [file, thumbs, page, large])

  useEffect(
    () => () => {
      imagesRef.current.forEach((i) => URL.revokeObjectURL(i.url))
    },
    [],
  )

  const current = items.find((i) => i.id === selected) ?? null
  const aspectOf = (id: string) => {
    const img = images.find((i) => i.id === id)
    return img ? img.height / img.width : 1
  }
  const imgAspect = (it: Item) => (it.kind === 'image' ? aspectOf(it.imageId) : 1)

  // Keyboard: Delete removes the selected item (not while typing in a field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        setItems((prev) => prev.filter((i) => i.id !== selected))
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  async function open(next: File) {
    if (!isPdfFile(next)) {
      setStatus({ kind: 'error', message: t('Pilih file berformat .pdf.', 'Choose a .pdf file.') })
      return
    }
    setFile(next)
    setError(null)
    setItems([])
    setSelected(null)
    setLarge({})
    setPage(1)
    setStatus({ kind: 'reading', done: 0, total: 0 })
    try {
      const { thumbs } = await pageThumbs(next, 200, (done, total) => setStatus({ kind: 'reading', done, total }))
      setStatus({ kind: 'ready', thumbs })
    } catch (e) {
      setStatus({ kind: 'error', message: openErrorMessage(e) })
    }
  }

  const add = (item: Item) => {
    setItems((prev) => [...prev, item])
    setSelected(item.id)
  }
  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? ({ ...i, ...patch } as Item) : i)))

  async function addImage(picked: File) {
    if (!thumbs) return
    setError(null)
    try {
      const img = await readImage(picked)
      setImages((prev) => [...prev, img])
      const shown = thumbs[page - 1]
      const w = Math.min(shown.width * 0.4, 200)
      add({
        id: crypto.randomUUID(),
        page,
        kind: 'image',
        color: '#000000',
        imageId: img.id,
        w,
        x: (shown.width - w) / 2,
        y: shown.height / 3,
      })
      setTool('select')
    } catch {
      setError(t('Gambar tidak bisa dibaca. Pakai PNG, JPG, atau WebP.', "Couldn't read the image. Use PNG, JPG or WebP."))
    }
  }

  function toPoint(e: PointerEvent): Pt {
    const r = svgRef.current!.getBoundingClientRect()
    const shown = thumbs![page - 1]
    return [((e.clientX - r.left) / r.width) * shown.width, ((e.clientY - r.top) / r.height) * shown.height]
  }

  function onBackgroundDown(e: PointerEvent<SVGSVGElement>) {
    if (!thumbs) return
    const [x, y] = toPoint(e)
    const id = crypto.randomUUID()
    const base = { id, page, color }
    if (tool === 'select') {
      setSelected(null)
      return
    }
    if (tool === 'text') {
      add({ ...base, kind: 'text', x, y: y + 14, text: t('Teks', 'Text'), size: 14, font: 'sans', bold: false })
      setTool('select')
      return
    }
    if (tool === 'check') {
      add({ ...base, kind: 'check', x: x - 9, y: y - 9, size: 18 })
      setTool('select')
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { mode: 'create', id, start: [x, y] }
    if (tool === 'rect') add({ ...base, kind: 'rect', x, y, w: 0, h: 0, stroke, fill: false })
    if (tool === 'line') add({ ...base, kind: 'line', x, y, x2: x, y2: y, stroke })
    if (tool === 'draw') add({ ...base, kind: 'draw', points: [[x, y]], stroke })
  }

  function startMove(e: PointerEvent, it: Item) {
    e.stopPropagation()
    e.preventDefault()
    setSelected(it.id)
    svgRef.current!.setPointerCapture(e.pointerId)
    drag.current = { mode: 'move', id: it.id, start: toPoint(e), from: it }
  }

  function startResize(e: PointerEvent, it: Item) {
    e.stopPropagation()
    e.preventDefault()
    svgRef.current!.setPointerCapture(e.pointerId)
    drag.current = { mode: 'resize', id: it.id }
  }

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current
    if (!d || !thumbs) return
    const shown = thumbs[page - 1]
    const [px, py] = toPoint(e)
    const cx = clamp(px, 0, shown.width)
    const cy = clamp(py, 0, shown.height)
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== d.id) return it
        if (d.mode === 'move') {
          return moveItem(d.from, px - d.start[0], py - d.start[1], shown.width, shown.height, imgAspect(d.from))
        }
        if (d.mode === 'resize') {
          if (it.kind === 'rect') return { ...it, w: Math.max(4, cx - it.x), h: Math.max(4, cy - it.y) }
          if (it.kind === 'check') return { ...it, size: clamp(cx - it.x, 8, 200) }
          if (it.kind === 'image') return { ...it, w: clamp(cx - it.x, 12, shown.width - it.x) }
          return it
        }
        // create
        const [sx, sy] = d.start
        if (it.kind === 'rect') return { ...it, x: Math.min(sx, cx), y: Math.min(sy, cy), w: Math.abs(cx - sx), h: Math.abs(cy - sy) }
        if (it.kind === 'line') return { ...it, x2: cx, y2: cy }
        if (it.kind === 'draw') {
          const last = it.points[it.points.length - 1]
          return Math.hypot(cx - last[0], cy - last[1]) < 1.5 ? it : { ...it, points: [...it.points, [cx, cy] as Pt] }
        }
        return it
      }),
    )
  }

  function onUp() {
    const d = drag.current
    drag.current = null
    if (d?.mode !== 'create') return
    // A click without a drag is not a shape.
    setItems((prev) =>
      prev.filter((it) => {
        if (it.id !== d.id) return true
        const b = bounds(it)
        return it.kind === 'draw' ? it.points.length > 1 : b.w > 3 || b.h > 3
      }),
    )
    setTool('select')
  }

  async function save() {
    if (!file || !items.length) return
    setSaving(true)
    setError(null)
    try {
      const blob = await editPdf(file, items, images)
      downloadBlob(blob, file.name.replace(/\.pdf$/i, '') + t('-diedit.pdf', '-edited.pdf'))
    } catch (e) {
      setError(openErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const tools: { value: Tool; label: string; icon: typeof Type }[] = useMemo(
    () => [
      { value: 'select', label: t('Pilih', 'Select'), icon: MousePointer2 },
      { value: 'text', label: t('Teks', 'Text'), icon: Type },
      { value: 'rect', label: t('Kotak', 'Box'), icon: Square },
      { value: 'line', label: t('Garis', 'Line'), icon: Minus },
      { value: 'check', label: t('Centang', 'Tick'), icon: Check },
      { value: 'draw', label: t('Coretan', 'Scribble'), icon: Pencil },
    ],
    [t],
  )

  if (thumbs && file) {
    const shown = thumbs[page - 1]
    const onPage = items.filter((i) => i.page === page)
    const handle = (it: Item, x: number, y: number) => (
      <circle
        cx={x}
        cy={y}
        r={7}
        className="cursor-nwse-resize touch-none fill-[var(--brand-2)] stroke-white"
        strokeWidth={2}
        onPointerDown={(e) => startResize(e, it)}
      />
    )

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {items.length
                ? t(`${items.length} tambahan di ${new Set(items.map((i) => i.page)).size} halaman.`, `${items.length} addition(s) on ${new Set(items.map((i) => i.page)).size} page(s).`)
                : t('Pilih alat, lalu klik atau seret di halaman.', 'Pick a tool, then click or drag on the page.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={saving || !items.length}>
              {saving ? <Loader2 className="animate-spin" /> : <Download />}
              {t('Simpan & unduh', 'Save & download')}
            </Button>
            <Button variant="ghost" disabled={saving} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <div className="space-y-4 rounded-2xl border bg-card p-5">
            <div className="grid grid-cols-3 gap-2">
              {tools.map((o) => (
                <Button
                  key={o.value}
                  variant={tool === o.value ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={tool === o.value}
                  onClick={() => setTool(o.value)}
                >
                  <o.icon />
                  {o.label}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => pickRef.current?.click()}>
                <ImagePlus />
                {t('Gambar', 'Image')}
              </Button>
            </div>
            <input
              ref={pickRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const picked = e.target.files?.[0]
                e.target.value = ''
                if (picked) void addImage(picked)
              }}
            />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('Warna', 'Color')}</p>
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => {
                      setColor(c)
                      if (current && current.kind !== 'image') update(current.id, { color: c })
                    }}
                    className={cn('size-7 rounded-full border', (current?.color ?? color) === c && 'ring-2 ring-brand-2')}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  aria-label={t('Warna lain', 'Other color')}
                  value={current?.color ?? color}
                  onChange={(e) => {
                    setColor(e.target.value)
                    if (current && current.kind !== 'image') update(current.id, { color: e.target.value })
                  }}
                  className="size-7 cursor-pointer rounded border bg-transparent p-0"
                />
              </div>
            </div>

            {(!current || current.kind === 'rect' || current.kind === 'line' || current.kind === 'draw') && (
              <label className="block space-y-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  {t('Tebal garis', 'Line thickness')}: {current && 'stroke' in current ? current.stroke : stroke} pt
                </span>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={current && 'stroke' in current ? current.stroke : stroke}
                  onChange={(e) => {
                    setStroke(+e.target.value)
                    if (current && 'stroke' in current) update(current.id, { stroke: +e.target.value })
                  }}
                  className="w-full accent-[var(--brand-2)]"
                />
              </label>
            )}

            {current?.kind === 'text' && (
              <div className="space-y-3">
                <textarea
                  value={current.text}
                  onChange={(e) => update(current.id, { text: e.target.value })}
                  rows={3}
                  aria-label={t('Isi teks', 'Text content')}
                  className="w-full rounded-lg border bg-background p-2 text-sm"
                />
                {hasUnsupported(current.text) && (
                  <p className="text-xs text-destructive">
                    {t(
                      'Huruf di luar Latin dasar tidak ada di font PDF bawaan dan akan jadi “?”.',
                      'Characters outside basic Latin are missing from the built-in PDF fonts and will become “?”.',
                    )}
                  </p>
                )}
                <Segmented<FontKey>
                  label={t('Font', 'Font')}
                  value={current.font}
                  options={[
                    { value: 'sans', label: 'Sans' },
                    { value: 'serif', label: 'Serif' },
                    { value: 'mono', label: 'Mono' },
                  ]}
                  onChange={(font) => update(current.id, { font })}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={current.bold}
                    onChange={(e) => update(current.id, { bold: e.target.checked })}
                    className="size-4 accent-[var(--brand-2)]"
                  />
                  {t('Tebal', 'Bold')}
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('Ukuran', 'Size')}: {current.size} pt
                  </span>
                  <input
                    type="range"
                    min={6}
                    max={72}
                    value={current.size}
                    onChange={(e) => update(current.id, { size: +e.target.value })}
                    className="w-full accent-[var(--brand-2)]"
                  />
                </label>
              </div>
            )}
            {current?.kind === 'rect' && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={current.fill}
                  onChange={(e) => update(current.id, { fill: e.target.checked })}
                  className="size-4 accent-[var(--brand-2)]"
                />
                {t('Isi penuh (untuk menutup tulisan)', 'Solid fill (to cover text)')}
              </label>
            )}
            {current && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setItems((prev) => prev.filter((i) => i.id !== current.id))
                  setSelected(null)
                }}
              >
                <Trash2 />
                {t('Hapus yang dipilih', 'Delete selected')}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {t(
                'Isian ini digambar di atas halaman (bukan mengubah teks asli), cocok untuk formulir yang bukan AcroForm. Kotak berisi penuh menutup tampilan teks di bawahnya tetapi tidak menghapusnya dari file — jangan dipakai untuk menyensor data rahasia.',
                'Everything is drawn on top of the page (the original text is not changed), which suits forms that are not AcroForm. A solid box hides the text below it but does not remove it from the file — do not use it to redact secrets.',
              )}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t(`Halaman ${page} dari ${thumbs.length}`, `Page ${page} of ${thumbs.length}`)}
              </p>
              <div className="flex">
                <IconButton label={t('Halaman sebelumnya', 'Previous page')} disabled={page === 1} onClick={() => { setPage(page - 1); setSelected(null) }}>
                  <ChevronLeft />
                </IconButton>
                <IconButton label={t('Halaman berikutnya', 'Next page')} disabled={page === thumbs.length} onClick={() => { setPage(page + 1); setSelected(null) }}>
                  <ChevronRight />
                </IconButton>
              </div>
            </div>
            <div className="grid place-items-center rounded-2xl border bg-muted/60 p-4">
              <div className="relative w-full max-w-xl select-none shadow-md ring-1 ring-black/5" style={{ aspectRatio: `${shown.width} / ${shown.height}` }}>
                <img src={large[page] ?? shown.src} alt={t(`Halaman ${page}`, `Page ${page}`)} draggable={false} className="absolute inset-0 size-full" />
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${shown.width} ${shown.height}`}
                  className={cn('absolute inset-0 size-full', tool === 'select' ? 'cursor-default' : 'cursor-crosshair touch-none')}
                  onPointerDown={onBackgroundDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                >
                  {onPage.map((it) => {
                    const b = bounds(it, imgAspect(it))
                    const on = it.id === selected
                    const grab = { onPointerDown: (e: PointerEvent) => startMove(e, it), className: 'cursor-move touch-none' }
                    let body
                    switch (it.kind) {
                      case 'text': {
                        const box = textBox(it)
                        body = (
                          <g {...grab}>
                            <rect x={it.x} y={it.y - it.size} width={box.w} height={box.h} fill="transparent" />
                            <text
                              x={it.x}
                              y={it.y}
                              fill={it.color}
                              fontSize={it.size}
                              fontWeight={it.bold ? 700 : 400}
                              style={{ fontFamily: FONT_CSS[it.font], whiteSpace: 'pre' }}
                            >
                              {it.text.split('\n').map((l, n) => (
                                <tspan key={n} x={it.x} dy={n ? it.size * LINE_HEIGHT : 0}>
                                  {l || ' '}
                                </tspan>
                              ))}
                            </text>
                          </g>
                        )
                        break
                      }
                      case 'rect':
                        body = (
                          <rect
                            {...grab}
                            x={it.x}
                            y={it.y}
                            width={it.w}
                            height={it.h}
                            fill={it.fill ? it.color : 'transparent'}
                            stroke={it.fill ? 'none' : it.color}
                            strokeWidth={it.stroke}
                          />
                        )
                        break
                      case 'line':
                        body = (
                          <g {...grab}>
                            <line x1={it.x} y1={it.y} x2={it.x2} y2={it.y2} stroke="transparent" strokeWidth={Math.max(12, it.stroke)} />
                            <line x1={it.x} y1={it.y} x2={it.x2} y2={it.y2} stroke={it.color} strokeWidth={it.stroke} strokeLinecap="round" />
                          </g>
                        )
                        break
                      case 'check': {
                        const pts = CHECK_PATH.map(([u, v]) => `${it.x + u * it.size},${it.y + v * it.size}`).join(' ')
                        body = (
                          <g {...grab}>
                            <rect x={it.x} y={it.y} width={it.size} height={it.size} fill="transparent" />
                            <polyline points={pts} fill="none" stroke={it.color} strokeWidth={Math.max(1, it.size * 0.12)} strokeLinecap="round" strokeLinejoin="round" />
                          </g>
                        )
                        break
                      }
                      case 'draw': {
                        const pts = it.points.map((p) => p.join(',')).join(' ')
                        body = (
                          <g {...grab}>
                            <polyline points={pts} fill="none" stroke="transparent" strokeWidth={Math.max(12, it.stroke)} strokeLinecap="round" />
                            <polyline points={pts} fill="none" stroke={it.color} strokeWidth={it.stroke} strokeLinecap="round" strokeLinejoin="round" />
                          </g>
                        )
                        break
                      }
                      case 'image': {
                        const img = images.find((i) => i.id === it.imageId)
                        body = img && <image {...grab} href={img.url} x={it.x} y={it.y} width={it.w} height={it.w * aspectOf(it.imageId)} preserveAspectRatio="none" />
                        break
                      }
                    }
                    return (
                      <g key={it.id}>
                        {body}
                        {on && (
                          <rect
                            x={b.x - 3}
                            y={b.y - 3}
                            width={b.w + 6}
                            height={b.h + 6}
                            fill="none"
                            stroke="var(--brand-2)"
                            strokeDasharray="4 3"
                            strokeWidth={1.5}
                            pointerEvents="none"
                          />
                        )}
                        {on && (it.kind === 'rect' || it.kind === 'image' || it.kind === 'check') && handle(it, b.x + b.w + 3, b.y + b.h + 3)}
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                'Seret tambahan untuk memindah; tarik titik di sudutnya untuk mengubah ukuran. Tombol Delete menghapus yang dipilih.',
                'Drag an addition to move it; drag its corner dot to resize. The Delete key removes the selected one.',
              )}
            </p>
          </div>
        </div>

        {thumbs.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {thumbs.map((thumb, i) => {
              const n = i + 1
              const count = items.filter((p) => p.page === n).length
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setPage(n)
                    setSelected(null)
                  }}
                  className={cn(
                    'relative shrink-0 rounded-xl border bg-card p-1.5 transition-all',
                    n === page ? 'border-brand-2/60 ring-2 ring-brand-2/30' : 'opacity-60 hover:opacity-100',
                  )}
                >
                  <img src={thumb.src} alt={t(`Halaman ${n}`, `Page ${n}`)} className="h-24 rounded-sm" />
                  <span className="mt-1 block text-center font-mono text-[11px] text-muted-foreground">{n}</span>
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-gradient-brand text-[10px] font-medium text-white">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept=".pdf,application/pdf"
        label={t('Tarik file .pdf yang mau diedit', 'Drop the .pdf file you want to edit')}
        busyLabel={
          status.kind === 'reading'
            ? status.total
              ? t(`Menyiapkan pratinjau ${status.done}/${status.total}…`, `Preparing previews ${status.done}/${status.total}…`)
              : t(`Membuka ${file?.name}…`, `Opening ${file?.name}…`)
            : undefined
        }
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
