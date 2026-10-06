import { forwardRef, useId } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Keeper as KeeperSpot, Tree } from './layout'

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

/**
 * A tool as a character standing in its district: file-shaped, coloured by the
 * file type it handles, with its icon on its belly and its name above. The
 * loop turns it toward the player and fills its speech bubble.
 */
export const Keeper = forwardRef<
  HTMLDivElement,
  {
    keeper: KeeperSpot
    color: string
    near: boolean
    talking: boolean
    visited: boolean
    onClick: () => void
    bubbleRef: (el: HTMLSpanElement | null) => void
  }
>(function Keeper({ keeper, color, near, talking, visited, onClick, bubbleRef }, ref) {
  const { tool, home } = keeper
  return (
    <div
      ref={ref}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="pg-idle absolute cursor-pointer"
      style={{ left: home.x - 30, top: home.y - 70, width: 60, height: 74, zIndex: Math.round(home.y) }}
    >
      <span
        ref={bubbleRef}
        className="pg-bubble pointer-events-none absolute bottom-full left-1/2 mb-9 w-max max-w-44 -translate-x-1/2 rounded-xl border bg-popover px-2.5 py-1.5 text-center text-[11px] leading-snug font-medium text-popover-foreground shadow-lg"
      />
      <span
        className={cn(
          'absolute bottom-full left-1/2 mb-1.5 flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-card/95 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-sm transition-all',
          near || talking ? 'pr-1 pl-2.5 ring-2 ring-brand-2' : 'px-2.5',
        )}
      >
        {visited && (
          <span title="Sudah dikunjungi" className="grid size-3.5 place-items-center rounded-full bg-emerald-500 text-white">
            <Check className="size-2.5" strokeWidth={3.5} />
          </span>
        )}
        {tool.title}
        {near && !talking && (
          <kbd className="rounded border border-b-2 bg-muted px-1 font-mono text-[10px] leading-4">E</kbd>
        )}
      </span>

      {(near || talking) && (
        <span className="absolute -bottom-2 left-1/2 h-4 w-16 -translate-x-1/2 animate-pulse rounded-[50%] border-2 border-brand-2" />
      )}
      <span className="absolute -bottom-1 left-1/2 h-3 w-11 -translate-x-1/2 rounded-full bg-black/25 blur-[2px]" />
      <div className={cn('absolute inset-0', near && !talking && 'pg-hop')}>
        <div className="pg-flip absolute inset-0">
          <svg viewBox="0 0 60 74" width={60} height={74} className="pg-body overflow-visible">
            <rect x="19" y="60" width="8" height="13" rx="4" fill="#3f3f46" />
            <rect x="33" y="60" width="8" height="13" rx="4" fill="#3f3f46" />
            <path d="M8 9a5 5 0 0 1 5-5h22l15 15v38a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5Z" fill={color} />
            <path d="M8 9a5 5 0 0 1 5-5h22l15 15v38a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5Z" fill="white" opacity="0.1" />
            <path d="M35 4v10a5 5 0 0 0 5 5h10Z" fill="white" opacity="0.45" />
            <g className="pg-eyes">
              <circle className="pg-eye" cx="22" cy="24" r="2.8" fill="white" />
              <circle className="pg-eye" cx="35" cy="24" r="2.8" fill="white" />
            </g>
            <path d="M25 30q3.5 3 7 0" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        {/* Outside the flip, so the icon never shows mirrored. */}
        <span className="absolute top-[37px] left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-lg bg-black/20 text-white">
          <tool.icon className="size-4" />
        </span>
      </div>
    </div>
  )
})

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
