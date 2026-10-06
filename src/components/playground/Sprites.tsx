import { forwardRef, useId } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Kiosk, Tree } from './layout'

/*
 * Everything here is drawn at a fixed world size and positioned by the game
 * loop through `style.transform` — the loop never re-renders React. The
 * walking/blinking motion is plain CSS (`.pg-*` in index.css), switched on by
 * `data-walking` on the sprite.
 */

/** The player: a small robot in the brand gradient. Anchored at its feet. */
export const Player = forwardRef<HTMLDivElement>(function Player(_, ref) {
  const id = useId()
  return (
    <div ref={ref} className="pg-sprite absolute top-0 left-0 will-change-transform" style={{ width: 44, height: 54 }}>
      <span className="absolute -bottom-1 left-1/2 h-2.5 w-9 -translate-x-1/2 rounded-full bg-black/25 blur-[2px]" />
      <div className="pg-flip absolute inset-0">
        <svg viewBox="0 0 44 54" width={44} height={54} className="pg-body overflow-visible">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--brand-1)' }} />
              <stop offset="1" style={{ stopColor: 'var(--brand-2)' }} />
            </linearGradient>
          </defs>
          <rect className="pg-leg-a" x="12" y="40" width="8" height="12" rx="4" fill="#3f3f46" />
          <rect className="pg-leg-b" x="24" y="40" width="8" height="12" rx="4" fill="#3f3f46" />
          <line x1="22" y1="9" x2="22" y2="2" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
          <circle className="pg-antenna" cx="22" cy="2" r="3" style={{ fill: 'var(--brand-2)' }} />
          <rect x="4" y="8" width="36" height="36" rx="13" fill={`url(#${id})`} />
          <rect x="4" y="8" width="36" height="36" rx="13" fill="white" opacity="0.12" />
          <rect x="9" y="16" width="26" height="16" rx="8" fill="#18181b" />
          <g className="pg-eyes">
            <rect className="pg-eye" x="15" y="20" width="4" height="8" rx="2" fill="#a5f3fc" />
            <rect className="pg-eye" x="25" y="20" width="4" height="8" rx="2" fill="#a5f3fc" />
          </g>
          <circle cx="11" cy="36" r="2.4" fill="white" opacity="0.35" />
        </svg>
      </div>
    </div>
  )
})

export const NPC_TYPES = [
  { label: 'PDF', fill: '#ef4444' },
  { label: 'DOCX', fill: '#3b82f6' },
  { label: 'XLSX', fill: '#22c55e' },
  { label: 'PPTX', fill: '#f97316' },
  { label: 'MP3', fill: '#a855f7' },
  { label: 'PNG', fill: '#14b8a6' },
  { label: 'MP4', fill: '#ec4899' },
  { label: 'JSON', fill: '#eab308' },
] as const

/** A wandering file with legs. Its speech bubble is filled in by the loop. */
export const Npc = forwardRef<
  HTMLDivElement,
  { label: string; fill: string; bubbleRef: (el: HTMLSpanElement | null) => void }
>(function Npc({ label, fill, bubbleRef }, ref) {
  return (
    <div ref={ref} className="pg-sprite absolute top-0 left-0 will-change-transform" style={{ width: 34, height: 46 }}>
      <span
        ref={bubbleRef}
        className="pg-bubble pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-44 -translate-x-1/2 rounded-xl border bg-popover px-2.5 py-1.5 text-center text-[11px] leading-snug font-medium text-popover-foreground shadow-lg"
      />
      <span className="absolute -bottom-0.5 left-1/2 h-2 w-7 -translate-x-1/2 rounded-full bg-black/25 blur-[2px]" />
      <div className="pg-flip absolute inset-0">
        <svg viewBox="0 0 34 46" width={34} height={46} className="pg-body overflow-visible">
          <rect className="pg-leg-a" x="9" y="34" width="5" height="10" rx="2.5" fill="#3f3f46" />
          <rect className="pg-leg-b" x="20" y="34" width="5" height="10" rx="2.5" fill="#3f3f46" />
          <path d="M5 4a3 3 0 0 1 3-3h13l9 9v24a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z" fill={fill} />
          <path d="M21 1v6a3 3 0 0 0 3 3h6Z" fill="white" opacity="0.45" />
          <g className="pg-eyes">
            <circle className="pg-eye" cx="13" cy="15" r="2" fill="white" />
            <circle className="pg-eye" cx="21" cy="15" r="2" fill="white" />
          </g>
          <text
            x="17.5"
            y="30"
            textAnchor="middle"
            fontSize={label.length > 3 ? 6.5 : 8}
            fontWeight="700"
            fill="white"
            fontFamily="Geist Mono, monospace"
          >
            {label}
          </text>
        </svg>
      </div>
    </div>
  )
})

/** A tool's stall. Lights up when the player stands in front of it. */
export function Stall({
  kiosk,
  near,
  visited,
  onClick,
}: {
  kiosk: Kiosk
  near: boolean
  visited: boolean
  onClick: () => void
}) {
  const { tool, rect } = kiosk
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="absolute cursor-pointer"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: Math.round(rect.y + rect.h) }}
    >
      {near && (
        <span className="pg-hop absolute -top-9 left-1/2 grid h-7 min-w-7 -translate-x-1/2 place-items-center rounded-md border border-b-[3px] bg-card px-1.5 font-mono text-xs font-semibold shadow-md">
          E
        </span>
      )}
      <div
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-md transition-all duration-200',
          near ? '-translate-y-1.5 shadow-xl shadow-brand-2/25 ring-2 ring-brand-2' : 'hover:-translate-y-0.5',
        )}
      >
        {/* Awning */}
        <div className="flex h-3.5 shrink-0">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={cn('flex-1', i % 2 ? 'bg-card' : 'bg-gradient-brand')} />
          ))}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2.5 pb-2 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-brand text-white shadow-md shadow-brand-2/25">
            <tool.icon className="size-5" />
          </span>
          <span className="text-[13px] leading-tight font-semibold tracking-tight">{tool.title}</span>
          <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {tool.formats}
          </span>
        </div>
        {visited && (
          <span
            title="Sudah dikunjungi"
            className="absolute top-5 right-2 grid size-5 place-items-center rounded-full bg-emerald-500 text-white"
          >
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
      </div>
    </div>
  )
}

/** Greenery. Trees are solid (see layout.ts), bushes and flowers are not. */
export function Plant({ tree, index }: { tree: Tree; index: number }) {
  const s = tree.size
  const delay = `${-(index % 7) * 0.6}s`
  if (tree.kind === 'flower') {
    return (
      <div className="absolute" style={{ left: tree.x - 10, top: tree.y - 12, zIndex: Math.round(tree.y) }}>
        <div className="pg-sway flex gap-1" style={{ animationDelay: delay }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn('size-2 rounded-full', i === 1 ? 'mt-0 bg-brand-2/80' : 'mt-1.5 bg-brand-1/70')}
            />
          ))}
        </div>
      </div>
    )
  }
  if (tree.kind === 'bush') {
    return (
      <div
        className="absolute"
        style={{ left: tree.x - 22 * s, top: tree.y - 22 * s, width: 44 * s, height: 24 * s, zIndex: Math.round(tree.y) }}
      >
        <span className="absolute inset-0 rounded-[50%] bg-emerald-600/70 dark:bg-emerald-800/80" />
        <span className="absolute top-0.5 left-1.5 h-1/2 w-1/2 rounded-full bg-emerald-400/50 dark:bg-emerald-600/50" />
      </div>
    )
  }
  return (
    <div
      className="absolute"
      style={{ left: tree.x - 30 * s, top: tree.y - 78 * s, width: 60 * s, height: 84 * s, zIndex: Math.round(tree.y) }}
    >
      <span className="absolute bottom-0 left-1/2 h-3 w-12 -translate-x-1/2 rounded-full bg-black/20 blur-[2px]" />
      <span
        className="absolute bottom-1 left-1/2 w-2.5 -translate-x-1/2 rounded-sm bg-amber-800 dark:bg-amber-950"
        style={{ height: 26 * s }}
      />
      <div className="pg-sway absolute inset-x-0 top-0 origin-bottom" style={{ height: 62 * s, animationDelay: delay }}>
        <span className="absolute inset-0 rounded-full bg-emerald-600 dark:bg-emerald-800" />
        <span className="absolute top-1.5 left-2 h-1/2 w-1/2 rounded-full bg-emerald-400/60 dark:bg-emerald-600/60" />
      </div>
    </div>
  )
}
