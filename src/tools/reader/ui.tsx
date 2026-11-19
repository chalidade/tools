import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { FileText, Loader2, Maximize, Minus, Plus, RotateCcw } from 'lucide-react'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/tool/IconButton'
import type { useStage } from '@/components/tool/Stage'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Zoom steps, relative to "fit the width of the viewer". */
const ZOOMS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3]

export function useZoom() {
  const [zoom, setZoom] = useState(1)
  const zoomIn = useCallback(() => setZoom((z) => ZOOMS.find((s) => s > z + 0.001) ?? z), [])
  const zoomOut = useCallback(() => setZoom((z) => [...ZOOMS].reverse().find((s) => s < z - 0.001) ?? z), [])
  return { zoom, zoomIn, zoomOut, reset: () => setZoom(1) }
}

/** Width of an element's content box, kept up to date. */
export function useWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // A hidden viewer (display: none) reports 0; keep the last real width so its layout survives.
    const observer = new ResizeObserver(([entry]) => entry.contentRect.width > 0 && setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/**
 * Keeps the reader at the same place in the document when its size changes
 * (zoom, full screen): the scroll position is remembered as a fraction of the
 * whole height and restored after the new layout.
 */
export function useKeepScroll(ref: RefObject<HTMLElement | null>, key: unknown) {
  const fraction = useRef(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      fraction.current = el.scrollHeight > el.clientHeight ? el.scrollTop / el.scrollHeight : 0
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [ref])
  useLayoutEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = fraction.current * el.scrollHeight
  }, [ref, key])
}

/**
 * Which child (matching `selector`) of the viewer is most in view — the page
 * or slide counter. Re-observes when `count` changes.
 */
export function useCurrentIndex(ref: RefObject<HTMLElement | null>, selector: string, count: number) {
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    const root = ref.current
    if (!root || !count) return
    const items = Array.from(root.querySelectorAll<HTMLElement>(selector))
    const ratios = new Map<Element, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.isIntersecting ? e.intersectionRect.height : 0)
        let best = -1
        let bestHeight = 0
        items.forEach((item, i) => {
          const h = ratios.get(item) ?? 0
          if (h > bestHeight) {
            bestHeight = h
            best = i
          }
        })
        if (best >= 0) setCurrent(best)
      },
      { root, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    )
    for (const item of items) observer.observe(item)
    return () => observer.disconnect()
  }, [ref, selector, count])
  return current
}

/** The bar above every reader: file name, a short summary, zoom, full screen and "another file". */
export function ReaderBar({
  file,
  info,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  stage,
  onReset,
  children,
}: {
  file: File
  info: ReactNode
  zoom?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomReset?: () => void
  stage?: ReturnType<typeof useStage>
  onReset: () => void
  /** Extra controls (page jump, sheet options), placed before zoom. */
  children?: ReactNode
}) {
  const t = useT()
  const full = stage?.full
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border bg-card p-2.5 pl-3', full && 'shrink-0')}>
      <div className="flex min-w-[11rem] flex-1 items-center gap-3">
        <span className="hidden size-9 shrink-0 place-items-center rounded-[0.625rem] border bg-background text-brand-2 sm:grid">
          <FileText className="size-4" />
        </span>
        <div className="min-w-0">
          {!full && <p className="truncate text-sm font-medium">{file.name}</p>}
          <p className="truncate font-mono text-[11px] text-muted-foreground">{info}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {children}
        {zoom !== undefined && (
          <div className="flex items-center rounded-xl border bg-background">
            <IconButton label={t('Perkecil', 'Zoom out')} onClick={() => onZoomOut?.()}>
              <Minus />
            </IconButton>
            <button
              type="button"
              onClick={onZoomReset}
              title={t('Pas lebar layar', 'Fit to width')}
              className="h-8 min-w-12 rounded-lg px-1 font-mono text-xs tabular-nums text-muted-foreground hover:text-foreground"
            >
              {Math.round(zoom * 100)}%
            </button>
            <IconButton label={t('Perbesar', 'Zoom in')} onClick={() => onZoomIn?.()}>
              <Plus />
            </IconButton>
          </div>
        )}
        {stage && !full && (
          <Button variant="outline" size="sm" onClick={() => void stage.enter()}>
            <Maximize /> <span className="hidden sm:inline">{t('Layar penuh', 'Full screen')}</span>
          </Button>
        )}
        {!full && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw /> {t('File lain', 'Another file')}
          </Button>
        )}
      </div>
    </div>
  )
}

/** "Halaman [3] / 12": shows the current page and jumps to a typed one. */
export function PageJump({ current, total, onGo, label }: { current: number; total: number; onGo: (index: number) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  if (total < 2) return null
  const go = () => {
    const n = Number(draft)
    if (Number.isFinite(n) && n >= 1) onGo(Math.min(total, Math.round(n)) - 1)
    setDraft(null)
  }
  return (
    <label className="flex h-[34px] items-center gap-1.5 rounded-xl border bg-background px-2 font-mono text-xs text-muted-foreground">
      <span className="sr-only">{label}</span>
      <input
        inputMode="numeric"
        value={draft ?? String(current + 1)}
        onFocus={(e) => {
          setDraft(String(current + 1))
          e.target.select()
        }}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
        onBlur={go}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className="w-8 bg-transparent text-right text-foreground tabular-nums outline-none"
      />
      <span className="tabular-nums">/ {total}</span>
    </label>
  )
}

/** The scrolling surface the document sits on. Fills the screen in full-screen mode. */
export const viewerClass = (full: boolean) =>
  cn('relative overflow-auto rounded-2xl border bg-muted/50 overscroll-contain', full ? 'min-h-0 flex-1' : 'h-[78vh] min-h-[26rem]')

export interface ViewProps {
  file: File
  onReset: () => void
}

/** Shown in a view while its file is being read. */
export function Opening({ file }: { file: File }) {
  const t = useT()
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {t(`Membuka ${file.name}…`, `Opening ${file.name}…`)}
    </div>
  )
}

/** The file could not be read: the reason, and a way back to pick another. */
export function OpenFailed({ message, onReset }: { message: string; onReset: () => void }) {
  const t = useT()
  return (
    <div className="space-y-3">
      <ErrorNote message={message} />
      <Button variant="outline" onClick={onReset}>
        <RotateCcw /> {t('Pilih file lain', 'Choose another file')}
      </Button>
    </div>
  )
}

/** Scrolls the viewer (and only the viewer, not the page around it) so `selector`'s element sits at the top. */
export function scrollToChild(viewer: HTMLElement | null, selector: string) {
  const el = viewer?.querySelector(selector)
  if (!viewer || !el) return
  const top = el.getBoundingClientRect().top - viewer.getBoundingClientRect().top + viewer.scrollTop - 16
  viewer.scrollTo({ top: Math.max(0, top) })
}
