import { forwardRef } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLAYER_LOOK, Person, type Look } from './Person'
import type { Keeper as KeeperSpot, Tree } from './scenes'
import { useLang, useT } from '@/lib/i18n'
import { toolText } from '@/tools/registry'

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
  { look: Look; scale?: number; bubbleRef: (el: HTMLSpanElement | null) => void }
>(function Townsperson({ look, scale = 1, bubbleRef }, ref) {
  return (
    <div ref={ref} className="pg-sprite absolute top-0 left-0 will-change-transform" style={{ width: 44, height: 62 }}>
      <span ref={bubbleRef} className={cn(BUBBLE, 'mb-1')} style={{ marginBottom: 4 - 62 * (1 - scale) }} />
      <span className="absolute -bottom-1 left-1/2 h-2.5 w-9 -translate-x-1/2 rounded-full bg-black/25 blur-[2px]" />
      <div className="pg-flip absolute inset-0">
        <div className="absolute inset-0 origin-bottom" style={{ transform: `scale(${scale})` }}>
          <Person look={look} />
        </div>
      </div>
    </div>
  )
})

/** A dog that trots after its owner. 40×30, feet at the bottom. */
export const Dog = forwardRef<HTMLDivElement, { coat: string }>(function Dog({ coat }, ref) {
  return (
    <div ref={ref} className="pg-sprite absolute top-0 left-0 will-change-transform" style={{ width: 40, height: 30 }}>
      <span className="absolute -bottom-0.5 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-black/25 blur-[2px]" />
      <div className="pg-flip absolute inset-0">
        <svg viewBox="0 0 40 30" width={40} height={30} className="pg-body overflow-visible">
          <path className="pg-tail" d="M7 14q-6-4-4-10" stroke={coat} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <g className="pg-leg-a">
            <rect x="9" y="19" width="4" height="10" rx="2" style={{ fill: coat }} />
            <rect x="24" y="19" width="4" height="10" rx="2" style={{ fill: coat }} />
          </g>
          <g className="pg-leg-b">
            <rect x="14" y="19" width="4" height="10" rx="2" style={{ fill: coat }} />
            <rect x="28" y="19" width="4" height="10" rx="2" style={{ fill: coat }} />
          </g>
          <ellipse cx="19" cy="17" rx="13" ry="7.5" style={{ fill: coat }} />
          <circle cx="31" cy="10" r="7" style={{ fill: coat }} />
          <path d="M27 5q-1 7 3 9" style={{ fill: coat }} stroke="black" strokeOpacity="0.25" strokeWidth="2" />
          <ellipse cx="37" cy="12" rx="3" ry="2.4" fill="white" opacity="0.6" />
          <circle cx="39" cy="11.5" r="1.4" fill="#1c1917" />
          <circle className="pg-eye" cx="33" cy="9" r="1.3" fill="#1c1917" />
          <path d="M14 13q5 3 10 0" stroke="#ef4444" strokeWidth="2" fill="none" />
        </svg>
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
  const t = useT()
  const lang = useLang()
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
          <span className="text-muted-foreground">· {toolText(tool, lang).title}</span>
          {visited && (
            <span title={t('Sudah dikunjungi', 'Visited')} className="grid size-3.5 place-items-center rounded-full bg-emerald-500 text-white">
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

const FLOWER_COLORS = ['#f43f5e', '#facc15', '#f8fafc', '#fb923c', '#c084fc', '#38bdf8']

/** Greenery. Trees and pines are solid (see scenes.ts); bushes and flowers are not. */
export function Plant({ tree, index }: { tree: Tree; index: number }) {
  const s = tree.size
  const delay = `${-(index % 7) * 0.6}s`
  const z = Math.round(tree.y)
  if (tree.kind === 'flower') {
    const a = FLOWER_COLORS[index % FLOWER_COLORS.length]
    const b = FLOWER_COLORS[(index * 3 + 1) % FLOWER_COLORS.length]
    return (
      <svg className="pg-sway absolute overflow-visible" width={30} height={22} viewBox="0 0 30 22" style={{ left: tree.x - 15, top: tree.y - 18, zIndex: z, animationDelay: delay }}>
        <path d="M6 22v-9M15 22V7M24 22v-8" stroke="#3f8f3a" strokeWidth="1.6" />
        {[
          [6, 12, a],
          [15, 6, b],
          [24, 13, a],
        ].map(([x, y, c]) => (
          <g key={`${x}`}>
            {[0, 72, 144, 216, 288].map((deg) => (
              <circle key={deg} cx={(x as number) + Math.cos((deg * Math.PI) / 180) * 2.6} cy={(y as number) + Math.sin((deg * Math.PI) / 180) * 2.6} r={2.2} fill={c as string} />
            ))}
            <circle cx={x as number} cy={y as number} r={1.6} fill="#fde047" />
          </g>
        ))}
      </svg>
    )
  }
  if (tree.kind === 'bush') {
    return (
      <svg className="absolute overflow-visible" width={56 * s} height={34 * s} viewBox="0 0 56 34" style={{ left: tree.x - 28 * s, top: tree.y - 30 * s, zIndex: z }}>
        <ellipse cx="28" cy="31" rx="24" ry="4" fill="black" opacity="0.18" />
        <g className="fill-[#3f9b4a] dark:fill-[#1f5130]">
          <circle cx="16" cy="20" r="12" />
          <circle cx="30" cy="15" r="14" />
          <circle cx="42" cy="21" r="11" />
        </g>
        <g className="fill-[#6cc46a] dark:fill-[#2d6b3e]" opacity="0.7">
          <circle cx="26" cy="9" r="6" />
          <circle cx="13" cy="15" r="4" />
        </g>
        {index % 3 === 0 && (
          <g fill="#ef4444">
            <circle cx="20" cy="22" r="1.8" />
            <circle cx="34" cy="18" r="1.8" />
            <circle cx="41" cy="24" r="1.8" />
          </g>
        )}
      </svg>
    )
  }
  if (tree.kind === 'pine') {
    return (
      <svg className="absolute overflow-visible" width={56 * s} height={92 * s} viewBox="0 0 56 92" style={{ left: tree.x - 28 * s, top: tree.y - 88 * s, zIndex: z }}>
        <ellipse cx="28" cy="88" rx="20" ry="5" fill="black" opacity="0.2" />
        <rect x="24" y="70" width="8" height="18" rx="2" className="fill-[#7c4a2a] dark:fill-[#3b2414]" />
        <g className="pg-sway" style={{ animationDelay: delay }}>
          <path d="M28 2 46 34H10Z" className="fill-[#2f7d4f] dark:fill-[#174a2e]" />
          <path d="M28 18 50 54H6Z" className="fill-[#2a7046] dark:fill-[#143f27]" />
          <path d="M28 36 54 76H2Z" className="fill-[#256340] dark:fill-[#113623]" />
          <path d="M28 4 34 16 28 14Z M28 20l8 14-8-3Z M28 38l9 16-9-3Z" fill="white" opacity="0.15" />
        </g>
      </svg>
    )
  }
  return (
    <svg className="absolute overflow-visible" width={70 * s} height={90 * s} viewBox="0 0 70 90" style={{ left: tree.x - 35 * s, top: tree.y - 86 * s, zIndex: z }}>
      <ellipse cx="35" cy="86" rx="24" ry="5.5" fill="black" opacity="0.2" />
      <path d="M31 86V52h8v34Z" className="fill-[#8b5a2b] dark:fill-[#3b2414]" />
      <path d="M35 60l-9-8M35 64l8-7" stroke="#8b5a2b" strokeWidth="3" strokeLinecap="round" />
      <g className="pg-sway" style={{ animationDelay: delay }}>
        <g className="fill-[#3c9a4e] dark:fill-[#1c5232]">
          <circle cx="35" cy="28" r="22" />
          <circle cx="18" cy="42" r="15" />
          <circle cx="52" cy="42" r="15" />
          <circle cx="35" cy="50" r="15" />
        </g>
        <g className="fill-[#5fbf63] dark:fill-[#2a6b42]" opacity="0.75">
          <circle cx="28" cy="20" r="10" />
          <circle cx="15" cy="37" r="6" />
          <circle cx="44" cy="30" r="6" />
        </g>
        {index % 4 === 0 && (
          <g fill="#f87171">
            <circle cx="24" cy="38" r="2.6" />
            <circle cx="46" cy="44" r="2.6" />
            <circle cx="36" cy="30" r="2.6" />
          </g>
        )}
      </g>
    </svg>
  )
}
