import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stage, useStage } from '@/components/tool/Stage'
import { useT } from '@/lib/i18n'
import { readPptx, type Deck } from '../ppt-to-pdf/convert'
import { scrollToChild, OpenFailed, Opening, PageJump, ReaderBar, useCurrentIndex, useKeepScroll, useWidth, useZoom, viewerClass, type ViewProps } from './ui'

// Slides come from the same reader as "PowerPoint ke PDF" (@jvmr/pptx-to-html,
// sanitized so nothing in the file can run or load a remote URL). Each slide is
// laid out at its real size and scaled, so text, shapes and pictures keep
// their places. "Presentasi" shows one slide at a time across the screen.

type State = { kind: 'loading' } | { kind: 'ready'; deck: Deck } | { kind: 'error' }

const MAX_FIT = 1100

export default function SlidesView({ file, onReset }: ViewProps) {
  const t = useT()
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    readPptx(file).then(
      (deck) => !cancelled && setState(deck.slides.length ? { kind: 'ready', deck } : { kind: 'error' }),
      () => !cancelled && setState({ kind: 'error' }),
    )
    return () => {
      cancelled = true
    }
  }, [file])

  if (state.kind === 'loading') return <Opening file={file} />
  if (state.kind === 'error')
    return (
      <OpenFailed
        onReset={onReset}
        message={t(
          'Presentasi tidak bisa dibaca. Pastikan file .pptx tidak rusak atau terkunci password.',
          "The presentation couldn't be read. Make sure the .pptx file isn't damaged or password-protected.",
        )}
      />
    )
  return <Slides deck={state.deck} file={file} onReset={onReset} />
}

function Slides({ deck, file, onReset }: { deck: Deck; file: File; onReset: () => void }) {
  const t = useT()
  const stage = useStage()
  const { zoom, zoomIn, zoomOut, reset } = useZoom()
  const viewer = useRef<HTMLDivElement>(null)
  const width = useWidth(viewer)
  const count = deck.slides.length
  const fit = width ? Math.min(width - 32, MAX_FIT) / deck.width : 0
  const scale = fit * zoom
  const current = useCurrentIndex(viewer, '[data-slide]', fit ? count : 0)
  const [shown, setShown] = useState(0)
  useKeepScroll(viewer, scale)

  const goTo = (i: number) => scrollToChild(viewer.current, `[data-slide="${i}"]`)

  function present() {
    setShown(current)
    void stage.enter()
  }

  return (
    <Stage stage={stage} title={file.name} className="space-y-3">
      {stage.full && <Presenter deck={deck} index={shown} onIndex={setShown} />}
      {/* Kept mounted (hidden) while presenting, so the list keeps its layout and place. */}
      <div className={stage.full ? 'hidden' : 'space-y-3'}>
          <ReaderBar
            file={file}
            info={t(`PowerPoint · ${count} slide`, `PowerPoint · ${count} ${count === 1 ? 'slide' : 'slides'}`)}
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onZoomReset={reset}
            onReset={onReset}
          >
            <PageJump current={current} total={count} onGo={goTo} label="Slide" />
            <Button size="sm" onClick={present}>
              <Play /> {t('Presentasi', 'Present')}
            </Button>
          </ReaderBar>

          <div ref={viewer} className={viewerClass(false)}>
            {fit > 0 && (
              <div className="flex w-max min-w-full flex-col items-center gap-4 p-4">
                {deck.slides.map((html, i) => (
                  <div key={i} data-slide={i} className="shrink-0">
                    <Slide html={html} deck={deck} scale={scale} />
                    <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">{i + 1}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
      {/* After presenting, the list waits at the slide the talk ended on. */}
      <ScrollBack active={!stage.full} index={shown} goTo={goTo} />
    </Stage>
  )
}

function ScrollBack({ active, index, goTo }: { active: boolean; index: number; goTo: (i: number) => void }) {
  const was = useRef(active)
  useEffect(() => {
    if (active && !was.current) requestAnimationFrame(() => goTo(index))
    was.current = active
  }, [active, index, goTo])
  return null
}

/** A slide laid out at its own size and scaled. The HTML is sanitized by readPptx. */
function Slide({ html, deck, scale }: { html: string; deck: Deck; scale: number }) {
  return (
    <div
      className="relative overflow-hidden bg-white shadow-sm ring-1 ring-black/10"
      style={{ width: deck.width * scale, height: deck.height * scale }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: deck.width, height: deck.height, transform: `scale(${scale})` }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

/** One slide filling the screen; arrow keys, space, a tap or the buttons move through the deck. */
function Presenter({ deck, index, onIndex }: { deck: Deck; index: number; onIndex: (i: number) => void }) {
  const t = useT()
  const area = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const count = deck.slides.length
  const go = (i: number) => onIndex(Math.max(0, Math.min(count - 1, i)))

  useEffect(() => {
    const el = area.current
    if (!el) return
    const observer = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) onIndex(Math.min(count - 1, index + 1))
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) onIndex(Math.max(0, index - 1))
      else if (e.key === 'Home') onIndex(0)
      else if (e.key === 'End') onIndex(count - 1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, count, onIndex])

  const scale = size.w && size.h ? Math.min(size.w / deck.width, size.h / deck.height) : 0

  return (
    <>
      <div
        ref={area}
        className="relative grid min-h-0 flex-1 place-items-center"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          go(e.clientX - r.left < r.width / 3 ? index - 1 : index + 1)
        }}
      >
        {scale > 0 && <Slide html={deck.slides[index]} deck={deck} scale={scale} />}
      </div>
      <div className="flex shrink-0 items-center justify-center gap-2">
        <Button size="sm" variant="outline" disabled={index === 0} onClick={() => go(index - 1)} aria-label={t('Slide sebelumnya', 'Previous slide')}>
          <ChevronLeft />
        </Button>
        <span className="min-w-16 text-center font-mono text-xs tabular-nums text-muted-foreground">
          {index + 1} / {count}
        </span>
        <Button size="sm" variant="outline" disabled={index === count - 1} onClick={() => go(index + 1)} aria-label={t('Slide berikutnya', 'Next slide')}>
          <ChevronRight />
        </Button>
      </div>
    </>
  )
}
