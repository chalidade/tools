import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Maximize, Minimize, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

/*
 * Full-screen stage for the instruments. Uses the Fullscreen API (and, on
 * phones that allow it, locks the screen to landscape); where that does not
 * exist — iPhone Safari only lets videos go full screen — it falls back to a
 * fixed overlay covering the viewport, which looks the same once the browser
 * bars scroll away.
 */

type ScreenOrientationLock = ScreenOrientation & { lock?: (o: 'landscape') => Promise<void>; unlock?: () => void }

export function useStage() {
  const ref = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)
  const native = useRef(false)

  const enter = useCallback(async () => {
    setFull(true)
    const el = ref.current
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen({ navigationUI: 'hide' })
        native.current = true
        await (screen.orientation as ScreenOrientationLock)?.lock?.('landscape').catch(() => {})
      } catch {
        native.current = false
      }
    }
  }, [])

  const exit = useCallback(() => {
    setFull(false)
    ;(screen.orientation as ScreenOrientationLock)?.unlock?.()
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    native.current = false
  }, [])

  useEffect(() => {
    if (!full) return
    // Leaving native full screen (Esc, back gesture) leaves the stage too.
    const onChange = () => {
      if (native.current && !document.fullscreenElement) exit()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !native.current) exit()
    }
    document.addEventListener('fullscreenchange', onChange)
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [full, exit])

  return { ref, full, enter, exit }
}

export function StageButton({ onClick }: { onClick: () => void }) {
  const t = useT()
  return (
    <Button variant="outline" onClick={onClick}>
      <Maximize /> {t('Layar penuh', 'Full screen')}
    </Button>
  )
}

/** Wraps an instrument; when `full`, it covers the screen with a slim top bar. */
export function Stage({
  stage,
  title,
  children,
  className,
}: {
  stage: ReturnType<typeof useStage>
  title: string
  children: ReactNode
  className?: string
}) {
  const t = useT()
  const [portrait, setPortrait] = useState(false)
  const [hintClosed, setHintClosed] = useState(false)

  useEffect(() => {
    if (!stage.full) return
    const mq = window.matchMedia('(orientation: portrait) and (pointer: coarse)')
    const update = () => setPortrait(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [stage.full])

  return (
    <div
      ref={stage.ref}
      className={cn(
        stage.full
          ? 'fixed inset-0 z-[100] flex flex-col gap-2 overflow-hidden bg-background px-[max(0.5rem,env(safe-area-inset-left))] pt-[max(0.25rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]'
          : className,
      )}
    >
      {stage.full && (
        <div className="flex shrink-0 items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
          <Button size="sm" variant="outline" onClick={stage.exit}>
            <Minimize /> {t('Keluar', 'Exit')}
          </Button>
        </div>
      )}
      {stage.full && portrait && !hintClosed && (
        <button
          type="button"
          onClick={() => setHintClosed(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-brand-2/40 bg-brand-2/10 px-3 py-2 text-left text-sm"
        >
          <RotateCcw className="size-4 shrink-0" />
          {t('Putar HP ke posisi mendatar untuk tampilan terbaik.', 'Turn your phone sideways for the best view.')}
        </button>
      )}
      {children}
    </div>
  )
}
