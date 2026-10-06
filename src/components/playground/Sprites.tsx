import { forwardRef } from 'react'
import { Braces, Check, Clapperboard, FileInput, FileLock, FileOutput, Home, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CategoryId } from '@/tools/registry'
import { PLAYER_LOOK, Person, type Look } from './Person'
import type { House as HouseSpot, Keeper as KeeperSpot, Tree } from './scenes'

/*
 * Everything here is drawn at a fixed world size and positioned by the game
 * loop through `style.transform` — the loop never re-renders React. Walking,
 * blinking and swaying are plain CSS (`.pg-*` in index.css).
 */

const BUBBLE =
  'pg-bubble pointer-events-none absolute bottom-full left-1/2 w-max max-w-44 -translate-x-1/2 rounded-xl border bg-popover px-2.5 py-1.5 text-center text-[11px] leading-snug font-medium text-popover-foreground shadow-lg'

/** The player: a young trainer in the brand colours. Anchored at its feet. */
export const Player = forwardRef<HTMLDivElement>(function Player(_, ref) {
  return (
    <div ref={ref} className="pg-sprite absolute top-0 left-0 will-change-transform" style={{ width: 44, height: 62 }}>
      <span className="absolute -bottom-1 left-1/2 h-2.5 w-9 -translate-x-1/2 rounded-full bg-black/25 blur-[2px]" />
      <div className="pg-flip absolute inset-0">
        <Person look={PLAYER_LOOK} />
      </div>
    </div>
  )
})

/** Someone strolling around town. The loop fills in its speech bubble. */
export const Townsperson = forwardRef<
  HTMLDivElement,
  { look: Look; bubbleRef: (el: HTMLSpanElement | null) => void }
>(function Townsperson({ look, bubbleRef }, ref) {
  return (
    <div ref={ref} className="pg-sprite absolute top-0 left-0 will-change-transform" style={{ width: 44, height: 62 }}>
      <span ref={bubbleRef} className={cn(BUBBLE, 'mb-1')} />
      <span className="absolute -bottom-1 left-1/2 h-2.5 w-9 -translate-x-1/2 rounded-full bg-black/25 blur-[2px]" />
      <div className="pg-flip absolute inset-0">
        <Person look={look} />
      </div>
    </div>
  )
})

/** A tool's keeper, standing on its own rug with its name and tool above it. */
export const Keeper = forwardRef<
  HTMLDivElement,
  {
    keeper: KeeperSpot
    name: string
    look: Look
    near: boolean
    talking: boolean
    visited: boolean
    onClick: () => void
    bubbleRef: (el: HTMLSpanElement | null) => void
  }
>(function Keeper({ keeper, name, look, near, talking, visited, onClick, bubbleRef }, ref) {
  const { tool, home } = keeper
  return (
    <>
      {/* Rug, drawn on the floor under everything. */}
      <span
        className="absolute rounded-[50%] border-2 border-dashed border-white/30 opacity-80"
        style={{ left: home.x - 46, top: home.y - 16, width: 92, height: 34, background: `${look.shirt}40`, zIndex: 1 }}
      />
      <div
        ref={ref}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className="pg-idle pg-sprite absolute cursor-pointer"
        style={{ left: home.x - 22, top: home.y - 62, width: 44, height: 62, zIndex: Math.round(home.y) }}
      >
        <span ref={bubbleRef} className={cn(BUBBLE, 'mb-14')} />
        <span
          className={cn(
            'absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-card/95 py-0.5 pr-2.5 pl-1 text-[11px] whitespace-nowrap shadow-sm transition-all',
            (near || talking) && 'ring-2 ring-brand-2',
          )}
        >
          <span className="grid size-5 place-items-center rounded-full text-white" style={{ background: look.shirt }}>
            <tool.icon className="size-3" />
          </span>
          <span className="font-semibold">{name}</span>
          <span className="text-muted-foreground">· {tool.title}</span>
          {visited && (
            <span title="Sudah dikunjungi" className="grid size-3.5 place-items-center rounded-full bg-emerald-500 text-white">
              <Check className="size-2.5" strokeWidth={3.5} />
            </span>
          )}
          {near && !talking && (
            <kbd className="rounded border border-b-2 bg-muted px-1 font-mono text-[10px] leading-4">E</kbd>
          )}
        </span>
        {(near || talking) && (
          <span className="absolute -bottom-2 left-1/2 h-4 w-14 -translate-x-1/2 animate-pulse rounded-[50%] border-2 border-brand-2" />
        )}
        <span className="absolute -bottom-1 left-1/2 h-2.5 w-9 -translate-x-1/2 rounded-full bg-black/25 blur-[2px]" />
        <div className={cn('absolute inset-0', near && !talking && 'pg-hop')}>
          <div className="pg-flip absolute inset-0">
            <Person look={look} />
          </div>
        </div>
      </div>
    </>
  )
})

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  'to-pdf': FileInput,
  'from-pdf': FileOutput,
  pdf: FileLock,
  media: Clapperboard,
  dev: Braces,
}

/** A category's house in town. Its door is where the player walks in. */
export function House({
  house,
  visited,
  near,
  onClick,
}: {
  house: HouseSpot
  visited: number
  near: boolean
  onClick: () => void
}) {
  const { rect, roof } = house
  const Icon = CATEGORY_ICONS[house.id] ?? Home
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="absolute cursor-pointer"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: Math.round(rect.y + rect.h) }}
    >
      <span className="absolute -bottom-3 left-3 h-6 w-[calc(100%-1.5rem)] rounded-[50%] bg-black/25 blur-sm" />
      <svg viewBox="0 0 300 240" width={rect.w} height={rect.h} className="relative overflow-visible">
        <rect x="214" y="18" width="28" height="56" rx="3" className="fill-[#8b7d72] dark:fill-[#4b433d]" />
        <rect x="16" y="104" width="268" height="136" className="fill-[#f6eee2] dark:fill-[#3a3442]" />
        <rect x="16" y="104" width="268" height="136" fill="url(#pg-bricks)" opacity="0.5" />
        {/* Windows: daylight blue, lamp-lit at night. */}
        {[40, 210].map((x) => (
          <g key={x}>
            <rect x={x} y="134" width="50" height="44" rx="5" className="fill-[#bfe3f5] dark:fill-[#fcd77a]" />
            <path d={`M${x + 25} 134v44M${x} 156h50`} stroke="white" strokeWidth="3" opacity="0.8" />
            <rect x={x - 4} y="176" width="58" height="7" rx="2" className="fill-[#c8b8a6] dark:fill-[#4b433d]" />
          </g>
        ))}
        <rect x="122" y="156" width="56" height="84" rx="8" style={{ fill: roof }} />
        <rect x="122" y="156" width="56" height="84" rx="8" fill="black" opacity="0.28" />
        <circle cx="168" cy="200" r="3.5" fill="#fde68a" />
        <rect x="112" y="234" width="76" height="8" rx="3" className="fill-[#a8a29e] dark:fill-[#57534e]" />
        <polygon points="-6,112 42,14 258,14 306,112" style={{ fill: roof }} />
        <polygon points="-6,112 42,14 258,14 306,112" fill="url(#pg-shingles)" />
        <rect x="-8" y="106" width="316" height="10" rx="3" style={{ fill: roof }} />
        <rect x="-8" y="106" width="316" height="10" rx="3" fill="black" opacity="0.25" />
        <circle cx="150" cy="62" r="27" fill="white" opacity="0.92" />
        <defs>
          <pattern id="pg-shingles" width="24" height="14" patternUnits="userSpaceOnUse">
            <path d="M0 13.5h24M12 0v14" stroke="black" strokeOpacity="0.14" strokeWidth="2" />
          </pattern>
          <pattern id="pg-bricks" width="30" height="16" patternUnits="userSpaceOnUse">
            <path d="M0 15.5h30M15 0v8M0 8h30M30 8v8" stroke="#a8927e" strokeOpacity="0.35" strokeWidth="1" />
          </pattern>
        </defs>
      </svg>
      <span className="absolute top-[35px] left-1/2 grid size-11 -translate-x-1/2 place-items-center" style={{ color: roof }}>
        <Icon className="size-6" />
      </span>
      {/* Name board over the door. */}
      <span className="absolute top-[118px] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-black/10 bg-[#fffaf0] px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-[#3f3a36] shadow-sm dark:bg-[#2a2530] dark:text-[#f3eee8]">
        {house.title}
        <span className="font-mono text-[10px] font-normal opacity-60">
          {visited}/{house.tools.length}
        </span>
      </span>
      {near && (
        <span className="pg-hop absolute top-[124px] left-1/2 mt-6 grid h-7 min-w-7 -translate-x-1/2 place-items-center rounded-md border border-b-[3px] bg-card px-1.5 font-mono text-xs font-semibold shadow-md">
          E
        </span>
      )}
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
