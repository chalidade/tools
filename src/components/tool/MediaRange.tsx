import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { formatTime, parseTime } from '@/lib/media'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

interface MediaRangeProps {
  duration: number
  start: number
  end: number
  onChange: (start: number, end: number) => void
  /** Playhead position, in seconds. */
  time?: number
  /** Click on the track moves the playhead. */
  onSeek?: (time: number) => void
  /** Drawn behind the selection: thumbnails or a waveform. */
  children?: ReactNode
  /** Shortest selection allowed, in seconds. */
  minLength?: number
}

/** A timeline with two draggable handles for picking a part of a video or audio file. */
export function MediaRange({ duration, start, end, onChange, time, onSeek, children, minLength = 0.1 }: MediaRangeProps) {
  // `tx`, not `t`: in this file `t` is a time in seconds.
  const tx = useT()
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<'start' | 'end' | null>(null)

  const at = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.min(duration, Math.max(0, ((clientX - rect.left) / rect.width) * duration))
  }

  function grab(e: PointerEvent<HTMLElement>, which: 'start' | 'end') {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = which
  }

  function move(e: PointerEvent<HTMLElement>) {
    if (!drag.current) return
    const t = at(e.clientX)
    if (drag.current === 'start') onChange(Math.min(t, end - minLength), end)
    else onChange(start, Math.max(t, start + minLength))
    onSeek?.(drag.current === 'start' ? Math.min(t, end - minLength) : Math.max(t, start + minLength))
  }

  const pct = (t: number) => `${(t / duration) * 100}%`

  return (
    <div className="space-y-3">
      <div
        ref={trackRef}
        onPointerDown={(e) => onSeek?.(at(e.clientX))}
        className="relative h-16 cursor-pointer touch-none overflow-hidden rounded-xl border bg-muted/60 select-none"
      >
        <div className="absolute inset-0">{children}</div>
        {/* Dim what is cut away. */}
        <div className="absolute inset-y-0 left-0 bg-background/75" style={{ width: pct(start) }} />
        <div className="absolute inset-y-0 right-0 bg-background/75" style={{ left: pct(end) }} />
        <div
          className="pointer-events-none absolute inset-y-0 border-y-2 border-brand-2"
          style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }}
        />
        {time !== undefined && (
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-foreground" style={{ left: pct(time) }} />
        )}
        {(['start', 'end'] as const).map((which) => (
          <span
            key={which}
            role="slider"
            aria-label={which === 'start' ? tx('Awal', 'Start') : tx('Akhir', 'End')}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={which === 'start' ? start : end}
            onPointerDown={(e) => grab(e, which)}
            onPointerMove={move}
            onPointerUp={() => (drag.current = null)}
            className={cn(
              'absolute inset-y-0 z-10 flex w-4 cursor-ew-resize items-center justify-center bg-brand-2 text-white',
              which === 'start' ? 'rounded-l-lg' : '-translate-x-full rounded-r-lg',
            )}
            style={{ left: pct(which === 'start' ? start : end) }}
          >
            <span className="h-5 w-0.5 rounded bg-white/80" />
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <TimeField label={tx('Awal', 'Start')} value={start} onCommit={(t) => onChange(Math.min(t, end - minLength), end)} />
        <TimeField label={tx('Akhir', 'End')} value={end} onCommit={(t) => onChange(start, Math.min(duration, Math.max(t, start + minLength)))} />
        <p className="pb-2.5 text-sm text-muted-foreground">
          Durasi <span className="font-mono text-foreground">{formatTime(end - start)}</span>
        </p>
      </div>
    </div>
  )
}

/** A time input ("1:02.35") that accepts typing and applies on Enter or when leaving the field. */
export function TimeField({ label, value, onCommit }: { label: string; value: number; onCommit: (t: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    const t = draft === null ? null : parseTime(draft)
    if (t !== null) onCommit(t)
    setDraft(null)
  }
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={draft ?? formatTime(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        inputMode="decimal"
        spellCheck={false}
        className="h-10 w-28 rounded-xl border bg-background px-3 font-mono text-sm outline-none focus:border-brand-2/60"
      />
    </label>
  )
}

/** Evenly spaced video frames filling the timeline. */
export function Filmstrip({ frames }: { frames: string[] }) {
  return (
    <div className="flex size-full">
      {frames.map((src, i) =>
        src ? (
          <img key={i} src={src} alt="" draggable={false} className="h-full min-w-0 flex-1 object-cover" />
        ) : (
          <span key={i} className="h-full flex-1" />
        ),
      )}
    </div>
  )
}

/** Loudness bars, mirrored around the middle. */
export function Waveform({ peaks }: { peaks: number[] }) {
  return (
    <svg viewBox={`0 0 ${peaks.length} 100`} preserveAspectRatio="none" className="size-full text-brand-2/70" aria-hidden>
      {peaks.map((p, i) => {
        const h = Math.max(2, p * 92)
        return <rect key={i} x={i + 0.15} y={50 - h / 2} width={0.7} height={h} fill="currentColor" />
      })}
    </svg>
  )
}
