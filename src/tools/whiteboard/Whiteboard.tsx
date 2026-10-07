import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  Circle,
  Download,
  Eraser,
  FileImage,
  FileText,
  FolderOpen,
  Hand,
  Highlighter,
  Maximize,
  Minimize,
  Minus,
  MousePointer2,
  MoveUpRight,
  Pencil,
  Plus,
  Redo2,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadBlob } from '@/lib/download'
import { useT } from '@/lib/i18n'
import { ErrorNote } from '@/components/tool/ErrorNote'
import {
  COLORS,
  FONT,
  LINE_HEIGHT,
  SURFACES,
  boundsOf,
  colorOf,
  contentBounds,
  drawItem,
  drawItems,
  drawSurface,
  emptyDoc,
  hits,
  isBoardDoc,
  moved,
  newId,
  renderPage,
  type BoardDoc,
  type Item,
  type Pattern,
  type Point,
  type ShapeItem,
  type StrokeItem,
  type Surface,
} from './board'

type ToolId = 'select' | 'hand' | 'pen' | 'marker' | 'eraser' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text'
type View = { x: number; y: number; zoom: number }

// Labels are [Indonesian, English]; the component picks one with tx(...label).
type Label = readonly [string, string]

const TOOLS: { id: ToolId; label: Label; key: string; icon: typeof Pencil }[] = [
  { id: 'select', label: ['Pilih & geser', 'Select & move'], key: 'V', icon: MousePointer2 },
  { id: 'hand', label: ['Geser papan', 'Pan board'], key: 'H', icon: Hand },
  { id: 'pen', label: ['Pena', 'Pen'], key: 'P', icon: Pencil },
  { id: 'marker', label: ['Stabilo', 'Highlighter'], key: 'M', icon: Highlighter },
  { id: 'eraser', label: ['Penghapus', 'Eraser'], key: 'E', icon: Eraser },
  { id: 'line', label: ['Garis', 'Line'], key: 'L', icon: Minus },
  { id: 'arrow', label: ['Panah', 'Arrow'], key: 'A', icon: MoveUpRight },
  { id: 'rect', label: ['Kotak', 'Rectangle'], key: 'R', icon: Square },
  { id: 'ellipse', label: ['Lingkaran', 'Ellipse'], key: 'O', icon: Circle },
  { id: 'text', label: ['Teks', 'Text'], key: 'T', icon: Type },
]

const SIZES = [2, 4, 8, 16]
const TEXT_SIZES = [18, 26, 38, 56]
const PATTERNS: { value: Pattern; label: Label }[] = [
  { value: 'plain', label: ['Polos', 'Plain'] },
  { value: 'grid', label: ['Kotak', 'Grid'] },
  { value: 'lines', label: ['Garis', 'Lines'] },
  { value: 'dots', label: ['Titik', 'Dots'] },
]
const MIN_ZOOM = 0.2
const MAX_ZOOM = 5
const STORAGE_KEY = 'tools:whiteboard'
const HISTORY_LIMIT = 100

function loadDoc(): BoardDoc {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (isBoardDoc(parsed)) return parsed
    }
  } catch {
    // Private mode or a corrupt save: start fresh.
  }
  return emptyDoc()
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

export default function Whiteboard() {
  // Not `t`: the tool loops and handlers below already use t for a tool.
  const tx = useT()
  const [doc, setDoc] = useState<BoardDoc>(loadDoc)
  const [pageIndex, setPageIndex] = useState(0)
  const [tool, setTool] = useState<ToolId>('pen')
  const [color, setColor] = useState<string>('ink')
  const [sizeIndex, setSizeIndex] = useState(1)
  const [eraseWhole, setEraseWhole] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; at: Point; text: string; color: string; size: number } | null>(
    null,
  )
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 })
  const [history, setHistory] = useState({ past: 0, future: 0 })
  const [fullscreen, setFullscreen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [error, setError] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const inkRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Everything the pointer handlers and the renderer read lives in refs as well,
  // so a pointermove never waits for a React render.
  const docRef = useRef(doc)
  const viewRef = useRef(view)
  const past = useRef<BoardDoc[]>([])
  const future = useRef<BoardDoc[]>([])
  const views = useRef(new Map<string, View>())
  const live = useRef<Item | null>(null)
  const drag = useRef<{ start: Point; snapshot: BoardDoc; moved: boolean } | null>(null)
  const panning = useRef<{ x: number; y: number } | null>(null)
  const pointers = useRef(new Map<number, Point>())
  const pinch = useRef<{ dist: number; mid: Point; view: View } | null>(null)
  const hover = useRef<Point | null>(null)
  const spaceHeld = useRef(false)
  const overBoard = useRef(false)
  const frame = useRef(0)

  docRef.current = doc
  viewRef.current = view
  const page = doc.pages[Math.min(pageIndex, doc.pages.length - 1)]

  const size = (t: ToolId = tool) =>
    t === 'marker' ? SIZES[sizeIndex] * 3 + 8 : t === 'eraser' ? SIZES[sizeIndex] * 4 + 10 : SIZES[sizeIndex]

  const pageIndexRef = useRef(pageIndex)
  const editingRef = useRef(editing)
  const selectedRef = useRef(selected)
  const toolRef = useRef(tool)
  const eraserReach = useRef(size('eraser'))
  pageIndexRef.current = pageIndex
  editingRef.current = editing
  selectedRef.current = selected
  toolRef.current = tool
  eraserReach.current = size('eraser')

  // ------------------------------------------------------------- rendering

  const render = useCallback(() => {
    frame.current = 0
    const box = boxRef.current
    const bg = bgRef.current
    const ink = inkRef.current
    const overlay = overlayRef.current
    if (!box || !bg || !ink || !overlay) return
    const dpr = window.devicePixelRatio || 1
    const w = box.clientWidth
    const h = box.clientHeight
    for (const c of [bg, ink, overlay])
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr)
        c.height = Math.round(h * dpr)
      }
    const d = docRef.current
    const v = viewRef.current
    const items = d.pages[Math.min(pageIndexRef.current, d.pages.length - 1)].items
    const toWorld = (ctx: CanvasRenderingContext2D) =>
      ctx.setTransform(dpr * v.zoom, 0, 0, dpr * v.zoom, -v.x * dpr * v.zoom, -v.y * dpr * v.zoom)

    const bctx = bg.getContext('2d')!
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawSurface(bctx, d.surface, d.pattern, v, w, h)

    const ictx = ink.getContext('2d')!
    ictx.setTransform(1, 0, 0, 1, 0, 0)
    ictx.clearRect(0, 0, ink.width, ink.height)
    toWorld(ictx)
    const hidden = editingRef.current?.id
    drawItems(
      ictx,
      items.filter((i) => i.id !== hidden),
      d.surface,
    )
    // A paint-style eraser has to cut the ink while it moves.
    const l = live.current
    if (l && l.kind === 'stroke' && l.erase) drawItem(ictx, l, d.surface)

    const octx = overlay.getContext('2d')!
    octx.setTransform(1, 0, 0, 1, 0, 0)
    octx.clearRect(0, 0, overlay.width, overlay.height)
    toWorld(octx)
    if (l && !(l.kind === 'stroke' && l.erase)) drawItem(octx, l, d.surface)
    const sel = selectedRef.current ? items.find((i) => i.id === selectedRef.current) : undefined
    if (sel) {
      const b = boundsOf(sel)
      octx.strokeStyle = '#8b5cf6'
      octx.lineWidth = 1.5 / v.zoom
      octx.setLineDash([6 / v.zoom, 4 / v.zoom])
      octx.strokeRect(b.x - 6 / v.zoom, b.y - 6 / v.zoom, b.w + 12 / v.zoom, b.h + 12 / v.zoom)
      octx.setLineDash([])
    }
    // The eraser's reach, under the cursor.
    if (toolRef.current === 'eraser' && hover.current) {
      octx.strokeStyle = d.surface === 'black' ? 'rgba(255,255,255,.6)' : 'rgba(15,23,42,.5)'
      octx.lineWidth = 1 / v.zoom
      octx.beginPath()
      octx.arc(hover.current.x, hover.current.y, eraserReach.current / 2, 0, Math.PI * 2)
      octx.stroke()
    }
  }, [])

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(render)
  }, [render])

  useEffect(schedule, [doc, view, pageIndex, editing, selected, tool, sizeIndex, schedule])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const ro = new ResizeObserver(schedule)
    ro.observe(box)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(frame.current)
      // Forget the cancelled frame, or schedule() would think one is still pending.
      frame.current = 0
    }
  }, [schedule])

  // Autosave on this device only.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
        setSaveFailed(false)
      } catch {
        setSaveFailed(true)
      }
    }, 400)
    return () => clearTimeout(id)
  }, [doc])

  // ------------------------------------------------------------- history

  const commit = useCallback((next: BoardDoc, from: BoardDoc = docRef.current) => {
    past.current.push(from)
    if (past.current.length > HISTORY_LIMIT) past.current.shift()
    future.current = []
    docRef.current = next
    setDoc(next)
    setHistory({ past: past.current.length, future: 0 })
  }, [])

  const withItems = (d: BoardDoc, items: Item[]): BoardDoc => ({
    ...d,
    pages: d.pages.map((p, i) => (i === Math.min(pageIndexRef.current, d.pages.length - 1) ? { ...p, items } : p)),
  })
  const itemsNow = () => {
    const d = docRef.current
    return d.pages[Math.min(pageIndexRef.current, d.pages.length - 1)].items
  }

  const undo = useCallback(() => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(docRef.current)
    docRef.current = prev
    setDoc(prev)
    setSelected(null)
    setPageIndex((i) => Math.min(i, prev.pages.length - 1))
    setHistory({ past: past.current.length, future: future.current.length })
  }, [])
  const redo = useCallback(() => {
    const next = future.current.pop()
    if (!next) return
    past.current.push(docRef.current)
    docRef.current = next
    setDoc(next)
    setSelected(null)
    setPageIndex((i) => Math.min(i, next.pages.length - 1))
    setHistory({ past: past.current.length, future: future.current.length })
  }, [])

  // ------------------------------------------------------------- text

  const finishText = useCallback(() => {
    const e = editingRef.current
    if (!e) return
    editingRef.current = null
    setEditing(null)
    const items = itemsNow()
    const existing = items.find((i) => i.id === e.id)
    const text = e.text.replace(/\s+$/, '')
    if (!text) {
      if (existing) commit(withItems(docRef.current, items.filter((i) => i.id !== e.id)))
      return
    }
    const item: Item = { kind: 'text', id: e.id, at: e.at, text, color: e.color, size: e.size }
    if (existing) {
      if (existing.kind === 'text' && existing.text === text) return schedule()
      commit(withItems(docRef.current, items.map((i) => (i.id === e.id ? item : i))))
    } else commit(withItems(docRef.current, [...items, item]))
  }, [commit, schedule])

  // ------------------------------------------------------------- pointer input

  const toWorld = (e: { clientX: number; clientY: number }): Point => {
    const r = overlayRef.current!.getBoundingClientRect()
    const v = viewRef.current
    return { x: (e.clientX - r.left) / v.zoom + v.x, y: (e.clientY - r.top) / v.zoom + v.y }
  }
  const setViewNow = (v: View) => {
    viewRef.current = v
    views.current.set(page.id, v)
    setView(v)
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    setMenuOpen(false)

    // Two fingers: pinch to zoom and pan; drop whatever the first finger started.
    if (pointers.current.size === 2) {
      live.current = null
      drag.current = null
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        view: viewRef.current,
      }
      schedule()
      return
    }
    if (pointers.current.size > 2) return

    if (editingRef.current) finishText()

    if (tool === 'hand' || spaceHeld.current || e.button === 1) {
      panning.current = { x: e.clientX, y: e.clientY }
      return
    }
    if (e.button !== 0) return

    const p = toWorld(e)
    const items = itemsNow()
    const tolerance = 6 / viewRef.current.zoom

    if (tool === 'select') {
      const hit = [...items].reverse().find((i) => hits(i, p, tolerance, true))
      setSelected(hit?.id ?? null)
      if (hit) drag.current = { start: p, snapshot: docRef.current, moved: false }
      return
    }
    if (tool === 'text') {
      const hit = [...items].reverse().find((i) => i.kind === 'text' && hits(i, p, tolerance, true))
      if (hit && hit.kind === 'text') setEditing({ id: hit.id, at: hit.at, text: hit.text, color: hit.color, size: hit.size })
      else setEditing({ id: newId(), at: p, text: '', color, size: TEXT_SIZES[sizeIndex] })
      e.preventDefault()
      return
    }
    if (tool === 'eraser' && eraseWhole) {
      drag.current = { start: p, snapshot: docRef.current, moved: false }
      eraseAt(p)
      return
    }
    if (tool === 'pen' || tool === 'marker' || tool === 'eraser') {
      live.current = {
        kind: 'stroke',
        id: newId(),
        color,
        size: size(),
        points: [[p.x, p.y, e.pointerType === 'pen' ? e.pressure : 0.5]],
        simulate: e.pointerType !== 'pen',
        marker: tool === 'marker' || undefined,
        erase: tool === 'eraser' || undefined,
      }
    } else {
      live.current = { kind: tool, id: newId(), color, size: size(), a: p, b: p }
    }
    schedule()
  }

  function eraseAt(p: Point) {
    const items = itemsNow()
    const reach = size('eraser') / 2
    const kept = items.filter((i) => !hits(i, p, reach, false))
    if (kept.length === items.length) return
    if (drag.current) drag.current.moved = true
    const next = withItems(docRef.current, kept)
    docRef.current = next
    setDoc(next)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const p = toWorld(e)
    hover.current = p

    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const r = overlayRef.current!.getBoundingClientRect()
      const start = pinch.current
      const zoom = clampZoom(start.view.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / (start.dist || 1)))
      // Keep the board point that was under the fingers' midpoint under it.
      const anchor = {
        x: (start.mid.x - r.left) / start.view.zoom + start.view.x,
        y: (start.mid.y - r.top) / start.view.zoom + start.view.y,
      }
      const mid = { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top }
      setViewNow({ zoom, x: anchor.x - mid.x / zoom, y: anchor.y - mid.y / zoom })
      return
    }
    if (panning.current) {
      const v = viewRef.current
      setViewNow({
        ...v,
        x: v.x - (e.clientX - panning.current.x) / v.zoom,
        y: v.y - (e.clientY - panning.current.y) / v.zoom,
      })
      panning.current = { x: e.clientX, y: e.clientY }
      return
    }

    const d = drag.current
    if (d && tool === 'select' && selectedRef.current) {
      const dx = p.x - d.start.x
      const dy = p.y - d.start.y
      if (!dx && !dy) return
      d.start = p
      d.moved = true
      const items = itemsNow().map((i) => (i.id === selectedRef.current ? moved(i, dx, dy) : i))
      const next = withItems(docRef.current, items)
      docRef.current = next
      setDoc(next)
      return
    }
    if (d && tool === 'eraser' && eraseWhole) {
      eraseAt(p)
      return
    }

    const l = live.current
    if (l?.kind === 'stroke') {
      // Coalesced events keep fast pen strokes smooth.
      const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
      const added = (events.length ? events : [e.nativeEvent]).map((ev) => {
        const q = toWorld(ev)
        return [q.x, q.y, e.pointerType === 'pen' ? ev.pressure : 0.5] as [number, number, number]
      })
      live.current = { ...l, points: [...l.points, ...added] }
    } else if (l && l.kind !== 'text') {
      live.current = { ...l, b: e.shiftKey ? constrain(l, p) : p }
    }
    schedule()
  }

  function constrain(l: ShapeItem, p: Point): Point {
    const dx = p.x - l.a.x
    const dy = p.y - l.a.y
    if (l.kind === 'rect' || l.kind === 'ellipse') {
      const s = Math.max(Math.abs(dx), Math.abs(dy))
      return { x: l.a.x + Math.sign(dx || 1) * s, y: l.a.y + Math.sign(dy || 1) * s }
    }
    const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
    const len = Math.hypot(dx, dy)
    return { x: l.a.x + Math.cos(angle) * len, y: l.a.y + Math.sin(angle) * len }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId)
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null
      return
    }
    if (panning.current) {
      panning.current = null
      return
    }
    const d = drag.current
    if (d) {
      drag.current = null
      if (d.moved) commit(docRef.current, d.snapshot)
      return
    }
    const l = live.current
    live.current = null
    if (!l) return
    if (l.kind !== 'stroke' && l.kind !== 'text') {
      const tiny = Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y) < 3
      if (tiny) return schedule()
    }
    commit(withItems(docRef.current, [...itemsNow(), l as StrokeItem | ShapeItem]))
  }

  function onPointerLeave() {
    hover.current = null
    schedule()
  }

  // Wheel pans; Ctrl/⌘ + wheel (and trackpad pinch) zooms at the cursor.
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const v = viewRef.current
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect()
        const zoom = clampZoom(v.zoom * Math.exp(-e.deltaY * 0.0015))
        const at = { x: (e.clientX - r.left) / v.zoom + v.x, y: (e.clientY - r.top) / v.zoom + v.y }
        const next = { zoom, x: at.x - (e.clientX - r.left) / zoom, y: at.y - (e.clientY - r.top) / zoom }
        viewRef.current = next
        setView(next)
      } else {
        const next = { ...v, x: v.x + e.deltaX / v.zoom, y: v.y + e.deltaY / v.zoom }
        viewRef.current = next
        setView(next)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const zoomBy = (factor: number) => {
    const box = boxRef.current
    const v = viewRef.current
    if (!box) return
    const zoom = clampZoom(v.zoom * factor)
    const cx = v.x + box.clientWidth / 2 / v.zoom
    const cy = v.y + box.clientHeight / 2 / v.zoom
    setViewNow({ zoom, x: cx - box.clientWidth / 2 / zoom, y: cy - box.clientHeight / 2 / zoom })
  }

  /** Frame everything on the page, or go back to the start when it's empty. */
  const fit = () => {
    const box = boxRef.current
    if (!box) return
    const b = contentBounds(page.items)
    if (!b) return setViewNow({ x: 0, y: 0, zoom: 1 })
    const pad = 48
    const zoom = clampZoom(Math.min((box.clientWidth - pad * 2) / b.w, (box.clientHeight - pad * 2) / b.h, 1.5))
    setViewNow({
      zoom,
      x: b.x + b.w / 2 - box.clientWidth / 2 / zoom,
      y: b.y + b.h / 2 - box.clientHeight / 2 / zoom,
    })
  }

  // ------------------------------------------------------------- keyboard

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (mod || e.altKey) return
      if (e.code === 'Space' && (overBoard.current || document.fullscreenElement)) {
        e.preventDefault()
        spaceHeld.current = true
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRef.current) {
        e.preventDefault()
        const id = selectedRef.current
        setSelected(null)
        commit(withItems(docRef.current, itemsNow().filter((i) => i.id !== id)))
        return
      }
      if (e.key === 'Escape') {
        setSelected(null)
        setMenuOpen(false)
        return
      }
      const t = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase())
      if (t) {
        setTool(t.id)
        if (t.id !== 'select') setSelected(null)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [undo, redo, commit])

  // ------------------------------------------------------------- fullscreen, pages, files

  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === wrapRef.current)
    document.addEventListener('fullscreenchange', change)
    return () => document.removeEventListener('fullscreenchange', change)
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void wrapRef.current?.requestFullscreen?.()
  }

  const goToPage = (i: number) => {
    finishText()
    setSelected(null)
    views.current.set(page.id, viewRef.current)
    const target = docRef.current.pages[i]
    setPageIndex(i)
    setViewNow(views.current.get(target.id) ?? { x: 0, y: 0, zoom: 1 })
  }
  const addPage = () => {
    finishText()
    const next = { ...docRef.current, pages: [...docRef.current.pages, { id: newId(), items: [] }] }
    commit(next)
    views.current.set(page.id, viewRef.current)
    setPageIndex(next.pages.length - 1)
    setViewNow({ x: 0, y: 0, zoom: 1 })
  }
  const deletePage = () => {
    const d = docRef.current
    if (d.pages.length < 2) return
    const i = Math.min(pageIndex, d.pages.length - 1)
    commit({ ...d, pages: d.pages.filter((_, j) => j !== i) })
    setSelected(null)
    setPageIndex(Math.max(0, i - 1))
  }
  const clearPage = () => {
    if (!page.items.length) return
    setSelected(null)
    commit(withItems(docRef.current, []))
  }

  const exportPng = () => {
    setMenuOpen(false)
    const canvas = renderPage(page, doc)
    if (!canvas) return setError(tx('Halaman ini masih kosong — belum ada yang bisa disimpan.', 'This page is still empty — nothing to save yet.'))
    setError('')
    canvas.toBlob((blob) => blob && downloadBlob(blob, tx(`papan-tulis-halaman-${pageIndex + 1}.png`, `whiteboard-page-${pageIndex + 1}.png`)), 'image/png')
  }
  const exportPdf = async () => {
    setMenuOpen(false)
    const pages = doc.pages.map((p) => renderPage(p, doc)).filter((c): c is HTMLCanvasElement => !!c)
    if (!pages.length) return setError(tx('Papan masih kosong — belum ada yang bisa disimpan.', 'The board is still empty — nothing to save yet.'))
    setError('')
    const { jsPDF } = await import('jspdf')
    let pdf: InstanceType<typeof jsPDF> | null = null
    for (const canvas of pages) {
      // Rendered at 2×: half the pixels is the page size in CSS px; ×0.75 to points.
      const w = (canvas.width / 2) * 0.75
      const h = (canvas.height / 2) * 0.75
      const orientation = w > h ? 'landscape' : 'portrait'
      if (!pdf) pdf = new jsPDF({ unit: 'pt', format: [w, h], orientation })
      else pdf.addPage([w, h], orientation)
      pdf.addImage(canvas, 'PNG', 0, 0, w, h)
    }
    pdf!.save(tx('papan-tulis.pdf', 'whiteboard.pdf'))
  }
  const saveFile = () => {
    setMenuOpen(false)
    downloadBlob(new Blob([JSON.stringify(doc)], { type: 'application/json' }), tx('papan-tulis.board.json', 'whiteboard.board.json'))
  }
  const openFile = async (file: File | undefined) => {
    setMenuOpen(false)
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      if (!isBoardDoc(parsed)) throw new Error('bukan file papan')
      commit(parsed)
      setPageIndex(0)
      setSelected(null)
      setViewNow({ x: 0, y: 0, zoom: 1 })
      setError('')
    } catch {
      setError(tx('File itu bukan file papan tulis (.board.json) dari tool ini.', 'That file isn’t a whiteboard file (.board.json) from this tool.'))
    }
  }

  const setSurface = (surface: Surface) => commit({ ...docRef.current, surface })
  const setPattern = (pattern: Pattern) => commit({ ...docRef.current, pattern })

  // ------------------------------------------------------------- UI

  const cursor =
    tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : tool === 'select' ? 'cursor-default' : tool === 'text' ? 'cursor-text' : tool === 'eraser' ? 'cursor-none' : 'cursor-crosshair'
  const showColors = tool !== 'hand' && tool !== 'select' && tool !== 'eraser'
  const editingColor = editing ? colorOf(editing.color, doc.surface) : ''

  return (
    <div className="space-y-4">
      <div
        ref={wrapRef}
        className={cn('flex flex-col gap-3', fullscreen && 'h-full bg-background p-3')}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border bg-card p-2 shadow-xs">
          <Group>
            {TOOLS.map((t) => (
              <ToolButton
                key={t.id}
                label={`${tx(...t.label)} (${t.key})`}
                active={tool === t.id}
                onClick={() => {
                  if (editing) finishText()
                  setTool(t.id)
                  if (t.id !== 'select') setSelected(null)
                }}
              >
                <t.icon />
              </ToolButton>
            ))}
          </Group>

          {showColors && (
            <Group>
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={tx(c.label[0], c.label[1])}
                  title={tx(c.label[0], c.label[1])}
                  onClick={() => {
                    setColor(c.id)
                    if (editing) setEditing({ ...editing, color: c.id })
                  }}
                  className={cn(
                    'grid size-8 place-items-center rounded-lg transition-colors hover:bg-accent',
                    color === c.id && 'bg-accent',
                  )}
                >
                  <span
                    className={cn('size-5 rounded-full border border-black/10', color === c.id && 'ring-2 ring-brand-2 ring-offset-1 ring-offset-card')}
                    style={{ background: c[doc.surface] , boxShadow: doc.surface === 'black' ? 'inset 0 0 0 9px #1d2b24' : undefined }}
                  />
                </button>
              ))}
            </Group>
          )}

          {tool !== 'hand' && tool !== 'select' && (
            <Group>
              {SIZES.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  aria-label={tx(`Ukuran ${i + 1}`, `Size ${i + 1}`)}
                  title={tx(`Ukuran ${i + 1}`, `Size ${i + 1}`)}
                  onClick={() => {
                    setSizeIndex(i)
                    if (editing) setEditing({ ...editing, size: TEXT_SIZES[i] })
                  }}
                  className={cn(
                    'grid size-8 place-items-center rounded-lg transition-colors hover:bg-accent',
                    sizeIndex === i && 'bg-accent',
                  )}
                >
                  {tool === 'text' ? (
                    <span className="font-semibold" style={{ fontSize: 9 + i * 3 }}>
                      A
                    </span>
                  ) : (
                    <span className="rounded-full bg-foreground" style={{ width: 3 + i * 4, height: 3 + i * 4 }} />
                  )}
                </button>
              ))}
            </Group>
          )}

          {tool === 'eraser' && (
            <Group>
              {[
                { whole: false, label: tx('Sebagian', 'Partial') },
                { whole: true, label: tx('Per objek', 'Whole object') },
              ].map((o) => (
                <button
                  key={String(o.whole)}
                  type="button"
                  onClick={() => setEraseWhole(o.whole)}
                  className={cn(
                    'h-8 rounded-lg px-2.5 text-xs transition-colors hover:bg-accent',
                    eraseWhole === o.whole ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </Group>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-1">
            <ToolButton label={tx('Urungkan (Ctrl+Z)', 'Undo (Ctrl+Z)')} disabled={!history.past} onClick={undo}>
              <Undo2 />
            </ToolButton>
            <ToolButton label={tx('Ulangi (Ctrl+Shift+Z)', 'Redo (Ctrl+Shift+Z)')} disabled={!history.future} onClick={redo}>
              <Redo2 />
            </ToolButton>
            <ToolButton label={tx('Bersihkan halaman', 'Clear page')} disabled={!page.items.length} onClick={clearPage}>
              <Trash2 />
            </ToolButton>
            <div className="relative">
              <ToolButton label={tx('Simpan / buka', 'Save / open')} active={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
                <Download />
              </ToolButton>
              {menuOpen && (
                <div className="absolute top-full right-0 z-20 mt-2 w-60 rounded-xl border bg-popover p-1.5 text-sm shadow-xl">
                  <MenuItem icon={<FileImage />} onClick={exportPng}>
                    {tx('Unduh halaman ini (PNG)', 'Download this page (PNG)')}
                  </MenuItem>
                  <MenuItem icon={<FileText />} onClick={() => void exportPdf()}>
                    {tx('Unduh semua halaman (PDF)', 'Download all pages (PDF)')}
                  </MenuItem>
                  <div className="my-1 h-px bg-border" />
                  <MenuItem icon={<Save />} onClick={saveFile}>
                    {tx('Simpan file papan (.json)', 'Save board file (.json)')}
                  </MenuItem>
                  <MenuItem icon={<FolderOpen />} onClick={() => fileRef.current?.click()}>
                    {tx('Buka file papan…', 'Open board file…')}
                  </MenuItem>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  void openFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
            <ToolButton label={fullscreen ? tx('Keluar layar penuh', 'Exit full screen') : tx('Layar penuh', 'Full screen')} onClick={toggleFullscreen}>
              {fullscreen ? <Minimize /> : <Maximize />}
            </ToolButton>
          </div>
        </div>

        {/* Board */}
        <div
          ref={boxRef}
          onPointerEnter={() => (overBoard.current = true)}
          onPointerLeave={() => (overBoard.current = false)}
          className={cn(
            'relative overflow-hidden rounded-2xl border shadow-sm',
            fullscreen ? 'min-h-0 flex-1' : 'h-[70vh] min-h-[420px]',
          )}
          style={{ background: SURFACES[doc.surface].bg }}
        >
          <canvas ref={bgRef} className="absolute inset-0 size-full" />
          <canvas ref={inkRef} className="absolute inset-0 size-full" />
          <canvas
            ref={overlayRef}
            className={cn('absolute inset-0 size-full touch-none select-none', cursor)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerLeave}
            onDoubleClick={(e) => {
              if (tool !== 'select') return
              const p = toWorld(e)
              const hit = [...page.items].reverse().find((i) => i.kind === 'text' && hits(i, p, 6 / view.zoom, true))
              if (hit && hit.kind === 'text') {
                setSelected(null)
                setEditing({ id: hit.id, at: hit.at, text: hit.text, color: hit.color, size: hit.size })
              }
            }}
          />

          {editing && (
            <textarea
              autoFocus
              value={editing.text}
              placeholder={tx('Ketik di sini…', 'Type here…')}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              onBlur={finishText}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                  e.preventDefault()
                  finishText()
                }
              }}
              rows={Math.max(1, editing.text.split('\n').length)}
              spellCheck={false}
              className="absolute resize-none overflow-hidden border-0 bg-transparent p-0 font-medium outline-1 outline-offset-4 outline-brand-2/60 outline-dashed placeholder:opacity-40"
              style={{
                left: (editing.at.x - view.x) * view.zoom,
                top: (editing.at.y - view.y) * view.zoom,
                fontSize: editing.size * view.zoom,
                lineHeight: LINE_HEIGHT,
                fontFamily: FONT,
                color: editingColor,
                width: Math.max(
                  4 * editing.size * view.zoom,
                  ...editing.text.split('\n').map((l) => (l.length + 2) * editing.size * view.zoom * 0.6),
                ),
              }}
            />
          )}

          {/* Board settings and zoom, floating over the bottom edge. */}
          <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-wrap items-end justify-between gap-2">
            <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border bg-card/90 p-1 whitespace-nowrap shadow-sm backdrop-blur [scrollbar-width:none]">
              {(['white', 'black'] as Surface[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => doc.surface !== s && setSurface(s)}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs transition-colors',
                    doc.surface === s ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="size-3 rounded-sm border" style={{ background: SURFACES[s].bg }} />
                  {SURFACES[s].label}
                </button>
              ))}
              <span className="mx-0.5 h-4 w-px bg-border" />
              {PATTERNS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => doc.pattern !== p.value && setPattern(p.value)}
                  className={cn(
                    'h-7 rounded-lg px-2 text-xs transition-colors',
                    doc.pattern === p.value ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tx(...p.label)}
                </button>
              ))}
            </div>
            <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border bg-card/90 p-1 shadow-sm backdrop-blur">
              <ToolButton label={tx('Perkecil', 'Zoom out')} onClick={() => zoomBy(1 / 1.25)}>
                <ZoomOut />
              </ToolButton>
              <button
                type="button"
                title={tx('Pas ke isi halaman', 'Fit to page content')}
                onClick={fit}
                className="h-8 min-w-14 rounded-lg px-1.5 font-mono text-xs tabular-nums hover:bg-accent"
              >
                {Math.round(view.zoom * 100)}%
              </button>
              <ToolButton label={tx('Perbesar', 'Zoom in')} onClick={() => zoomBy(1.25)}>
                <ZoomIn />
              </ToolButton>
            </div>
          </div>
        </div>

        {/* Pages */}
        <div className="flex flex-wrap items-center gap-1.5">
          {doc.pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => i !== pageIndex && goToPage(i)}
              className={cn(
                'h-8 rounded-lg border px-3 text-sm transition-colors',
                i === pageIndex ? 'border-transparent bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {tx('Halaman', 'Page')} {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={addPage}
            className="flex h-8 items-center gap-1 rounded-lg border border-dashed px-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4" /> {tx('Halaman', 'Page')}
          </button>
          {doc.pages.length > 1 && (
            <button
              type="button"
              onClick={deletePage}
              className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm text-muted-foreground hover:text-destructive"
            >
              <X className="size-4" /> {tx('Hapus halaman ini', 'Delete this page')}
            </button>
          )}
        </div>
      </div>

      {error && <ErrorNote message={error} />}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {tx('Papan tersimpan otomatis di browser ini saja', 'The board is saved automatically in this browser only')}
        {saveFailed &&
          tx(
            ' — tapi papan ini sudah terlalu besar untuk disimpan otomatis, simpan sebagai file lewat tombol unduh',
            ' — but this board has grown too large to save automatically, so save it as a file with the download button',
          )}
        {tx(
          '. Geser papan: tool tangan, tahan Spasi, atau scroll; perbesar: Ctrl + scroll atau cubit dengan dua jari. Tahan Shift saat menggambar garis atau bentuk agar lurus / bujur sangkar. Pena dengan stylus mengikuti tekanan.',
          '. Pan the board: hand tool, hold Space, or scroll; zoom: Ctrl + scroll or pinch with two fingers. Hold Shift while drawing a line or shape to keep it straight / square. A stylus follows pen pressure.',
        )}
      </p>
    </div>
  )
}

function Group({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-0.5 rounded-xl bg-muted/60 p-0.5">{children}</div>
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid size-8 place-items-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-4',
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function MenuItem({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground"
    >
      {icon}
      {children}
    </button>
  )
}
