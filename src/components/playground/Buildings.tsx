import type { ReactNode } from 'react'
import { Braces, Briefcase, Clapperboard, FileInput, FileLock, FileOutput, Home, type LucideIcon } from 'lucide-react'
import type { CategoryId } from '@/tools/registry'
import { placeName, type BuildingStyle, type House } from './scenes'
import { useLang } from '@/lib/i18n'

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  'to-pdf': FileInput,
  'from-pdf': FileOutput,
  pdf: FileLock,
  media: Clapperboard,
  dev: Braces,
  productivity: Briefcase,
}

/*
 * One drawing per building style. Each is an SVG in the building's own
 * coordinates (BUILDINGS[style].w × h, door centred on the bottom edge) plus
 * where its name and category icon sit. Moving parts — smoke, flags, bulbs,
 * LEDs, the vault wheel, the dish — are `.pg-*` animations in index.css.
 */

/** Window glass: sky by day, lamp-lit at night. */
function Glass({ x, y, w, h, rx = 4 }: { x: number; y: number; w: number; h: number; rx?: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={rx} className="fill-[#bfe3f5] dark:fill-[#fcd77a]" />
      <path d={`M${x + w * 0.2} ${y + h * 0.75}l${w * 0.35} ${-h * 0.5}`} stroke="white" strokeWidth="4" opacity="0.5" />
    </>
  )
}

/** Three puffs rising from a chimney top at (x, y). */
function Smoke({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          className="pg-smoke"
          cx={x}
          cy={y}
          r={7}
          fill="#e5e7eb"
          style={{ animationDelay: `${i * -1.2}s` }}
        />
      ))}
    </g>
  )
}

function Step({ cx, y, w }: { cx: number; y: number; w: number }) {
  return <rect x={cx - w / 2} y={y} width={w} height={8} rx={3} className="fill-[#a8a29e] dark:fill-[#57534e]" />
}

type Art = { svg: ReactNode; name: number; icon: number; nameClass?: string }

function shop(w: number, h: number, accent: string): Art {
  return {
    name: 14,
    icon: 0,
    nameClass: 'bg-[#fffaf0] text-[#7c2d12] border-2 tracking-[0.2em] text-[11px]',
    svg: (
      <>
        <defs>
          <pattern id="pg-brick" width="24" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 11.5h24M12 0v6M0 6h24M24 6v6M0 6v6" stroke="black" strokeOpacity="0.15" />
          </pattern>
          <pattern id="pg-awning" width="36" height="20" patternUnits="userSpaceOnUse">
            <rect width="18" height="20" style={{ fill: accent }} />
            <rect x="18" width="18" height="20" fill="#fff7ed" />
          </pattern>
        </defs>
        <rect x="226" y="18" width="26" height="46" className="fill-[#8b4a3c] dark:fill-[#4a2a24]" />
        <Smoke x={239} y={14} />
        <rect x="6" y="42" width={w - 12} height="30" rx="4" className="fill-[#7a4a3a] dark:fill-[#3a2620]" />
        <rect x="10" y="68" width={w - 20} height={h - 68} className="fill-[#c8644e] dark:fill-[#6e3a30]" />
        <rect x="10" y="68" width={w - 20} height={h - 68} fill="url(#pg-brick)" />
        <rect x="64" y="4" width="172" height="36" rx="6" fill="#fffaf0" style={{ stroke: accent }} strokeWidth="3" />
        <rect x="4" y="104" width={w - 8} height="20" fill="url(#pg-awning)" />
        {Array.from({ length: 16 }, (_, i) => (
          <circle key={i} cx={13 + i * 18.3} cy={124} r={9.2} style={{ fill: i % 2 ? '#fff7ed' : accent }} />
        ))}
        <Glass x={24} y={144} w={88} h={62} />
        <Glass x={188} y={144} w={88} h={62} />
        {/* Stacks of paper in the window. */}
        <g fill="white" stroke="#cbd5e1">
          <rect x="40" y="186" width="24" height="16" />
          <rect x="70" y="180" width="26" height="22" />
          <rect x="204" y="178" width="56" height="24" rx="3" fill="#475569" stroke="none" />
          <rect x="214" y="170" width="36" height="10" />
        </g>
        <rect x="120" y="148" width="60" height={h - 148} rx="5" style={{ fill: accent }} />
        <Glass x={127} y={156} w={46} h={66} rx={3} />
        <circle cx="168" cy="196" r="3" fill="#fde68a" />
        <Step cx={150} y={h - 6} w={80} />
      </>
    ),
  }
}

function library(w: number, h: number, accent: string): Art {
  const cols = [56, 104, 220, 268]
  return {
    name: 116,
    icon: 52,
    nameClass: 'bg-transparent border-0 shadow-none text-[#5b4636] dark:text-[#f3eee8] tracking-[0.18em] text-[10px]',
    svg: (
      <>
        <defs>
          <pattern id="pg-shingle" width="22" height="14" patternUnits="userSpaceOnUse">
            <path d="M0 13.5h22M11 0v14" stroke="black" strokeOpacity="0.16" strokeWidth="2" />
          </pattern>
        </defs>
        <path d="M286 32V-26" stroke="#57534e" strokeWidth="3" />
        <path className="pg-flag" d="M287 -24h30l-6 9 6 9h-30Z" style={{ fill: accent }} />
        <polygon points={`-8,126 44,30 ${w - 44},30 ${w + 8},126`} style={{ fill: accent }} />
        <polygon points={`-8,126 44,30 ${w - 44},30 ${w + 8},126`} fill="url(#pg-shingle)" />
        <circle cx={w / 2} cy="74" r="26" fill="#fffaf0" />
        <rect x="14" y="120" width={w - 28} height={h - 120} className="fill-[#efe2c4] dark:fill-[#3d3546]" />
        <rect x="6" y="110" width={w - 12} height="18" rx="3" className="fill-[#fbf6ea] dark:fill-[#4a4152]" />
        {[76, 240].map((x) => (
          <g key={x}>
            <path d={`M${x} 236v-60a12 12 0 0 1 24 0v60Z`} className="fill-[#bfe3f5] dark:fill-[#fcd77a]" />
            <path d={`M${x + 12} 164v72`} stroke="white" strokeWidth="2" opacity="0.7" />
          </g>
        ))}
        {cols.map((x) => (
          <g key={x} className="fill-[#fbf6ea] dark:fill-[#5b5163]">
            <rect x={x} y="136" width="16" height="104" />
            <rect x={x - 4} y="130" width="24" height="8" rx="2" />
            <rect x={x - 4} y="238" width="24" height="8" rx="2" />
          </g>
        ))}
        <path d={`M146 ${h}v-66a24 24 0 0 1 48 0v66Z`} fill="#7c4a2a" />
        <path d={`M170 ${h - 90}v90`} stroke="black" strokeOpacity="0.25" strokeWidth="2" />
        <path d={`M146 ${h}v-66a24 24 0 0 1 48 0v66`} fill="none" style={{ stroke: accent }} strokeWidth="4" />
        <circle cx="164" cy={h - 38} r="2.5" fill="#fde68a" />
        <circle cx="176" cy={h - 38} r="2.5" fill="#fde68a" />
        <Step cx={170} y={h - 6} w={120} />
      </>
    ),
  }
}

function vault(w: number, h: number, accent: string): Art {
  return {
    name: 96,
    icon: 0,
    nameClass: 'bg-[#1e293b] text-[#facc15] border-[#facc15]/40 tracking-[0.25em] text-[10px]',
    svg: (
      <>
        <defs>
          <pattern id="pg-stone" width="40" height="22" patternUnits="userSpaceOnUse">
            <path d="M0 21.5h40M20 0v11M0 11h40M40 11v11M0 11v11" stroke="black" strokeOpacity="0.18" />
          </pattern>
        </defs>
        <polygon points={`-6,110 32,40 ${w - 32},40 ${w + 6},110`} className="fill-[#4b5563] dark:fill-[#334155]" />
        <path d={`M32 40H${w - 32}`} stroke="white" strokeOpacity="0.2" strokeWidth="3" />
        <rect x="-8" y="102" width={w + 16} height="9" rx="3" style={{ fill: accent }} />
        <rect x="10" y="110" width={w - 20} height={h - 110} className="fill-[#b5aea6] dark:fill-[#57534e]" />
        <rect x="10" y="110" width={w - 20} height={h - 110} fill="url(#pg-stone)" />
        {[30, w - 84].map((x) => (
          <g key={x}>
            <rect x={x} y="146" width="54" height="42" rx="3" className="fill-[#334155] dark:fill-[#fcd77a]" />
            {[1, 2, 3, 4].map((b) => (
              <path key={b} d={`M${x + b * 10.8} 146v42`} stroke="#1f2937" strokeWidth="3" />
            ))}
          </g>
        ))}
        {/* The vault wheel over the door. */}
        <circle cx={w / 2} cy="142" r="24" fill="#a16207" />
        <g className="pg-wheel" style={{ transformOrigin: `${w / 2}px 142px` }}>
          <circle cx={w / 2} cy="142" r="18" fill="none" stroke="#facc15" strokeWidth="4" />
          {[0, 60, 120].map((a) => (
            <path
              key={a}
              d={`M${w / 2 - 18} 142h36`}
              stroke="#facc15"
              strokeWidth="3"
              transform={`rotate(${a} ${w / 2} 142)`}
            />
          ))}
          <circle cx={w / 2} cy="142" r="5" fill="#facc15" />
        </g>
        {[w / 2 - 44, w / 2 + 34].map((x) => (
          <g key={x}>
            <rect x={x} y="176" width="10" height="16" rx="2" fill="#1f2937" />
            <rect className="pg-flicker" x={x + 2} y="179" width="6" height="10" rx="1" fill="#fbbf24" />
          </g>
        ))}
        <rect x={w / 2 - 28} y="172" width="56" height={h - 172} rx="4" fill="#52525b" />
        <rect x={w / 2 - 28} y="172" width="56" height={h - 172} rx="4" fill="none" style={{ stroke: accent }} strokeWidth="3" />
        {[180, 200, 220].flatMap((y) =>
          [w / 2 - 20, w / 2 + 20].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#a1a1aa" />),
        )}
        <Step cx={w / 2} y={h - 6} w={80} />
      </>
    ),
  }
}

function studio(w: number, h: number, accent: string): Art {
  return {
    name: 136,
    icon: 40,
    nameClass: 'bg-[#18181b] text-white border-0 tracking-[0.3em] text-[10px]',
    svg: (
      <>
        <path d={`M14 120A${w / 2 - 14} 104 0 0 1 ${w - 14} 120Z`} style={{ fill: accent }} />
        <path d={`M40 120A${w / 2 - 40} 80 0 0 1 ${w - 40} 120`} fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="8" />
        <circle cx={w / 2} cy="62" r="28" fill="white" />
        <rect x="14" y="116" width={w - 28} height={h - 116} className="fill-[#fdf2f8] dark:fill-[#3b2f3f]" />
        <rect x="14" y="116" width={w - 28} height="14" fill="#27272a" />
        {Array.from({ length: 14 }, (_, i) => (
          <circle
            key={i}
            className="pg-bulb"
            cx={26 + i * ((w - 52) / 13)}
            cy={123}
            r={3.6}
            fill="#fde047"
            style={{ animationDelay: `${(i % 2) * -0.6}s` }}
          />
        ))}
        <Glass x={30} y={150} w={92} h={68} />
        <Glass x={w - 122} y={150} w={92} h={68} />
        {/* Film strip across the right window. */}
        <rect x={w - 122} y="196" width="92" height="12" fill="#18181b" opacity="0.85" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={w - 118 + i * 11.5} y="199" width="6" height="6" fill="white" opacity="0.8" />
        ))}
        <rect x={w / 2 - 34} y="156" width="68" height={h - 156} rx="4" style={{ fill: accent }} />
        <Glass x={w / 2 - 28} y={162} w={26} h={h - 168} rx={2} />
        <Glass x={w / 2 + 2} y={162} w={26} h={h - 168} rx={2} />
        <Step cx={w / 2} y={h - 6} w={90} />
      </>
    ),
  }
}

function lab(w: number, h: number, accent: string): Art {
  return {
    name: 160,
    icon: 106,
    nameClass: 'bg-[#0f172a] text-[#67e8f9] border-[#67e8f9]/30 font-mono tracking-[0.3em] text-[10px]',
    svg: (
      <>
        {/* Rooftop: solar panels, a dish that sweeps the sky, an antenna with a beacon. */}
        {[24, 84].map((x) => (
          <g key={x}>
            <path d={`M${x} 66l10-30h48l-10 30Z`} fill="#1e3a8a" />
            <path d={`M${x + 5} 51h53M${x + 26} 36l-10 30M${x + 42} 36l-10 30`} stroke="#93c5fd" strokeOpacity="0.6" />
          </g>
        ))}
        <path d={`M${w - 96} 66v-16`} stroke="#64748b" strokeWidth="4" />
        <g className="pg-dish" style={{ transformOrigin: `${w - 96}px 50px` }}>
          <path d={`M${w - 122} 40a26 14 0 0 0 52 0Z`} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
          <path d={`M${w - 96} 46v-22`} stroke="#94a3b8" strokeWidth="2" />
          <circle cx={w - 96} cy="22" r="3" fill="#94a3b8" />
        </g>
        <path d={`M${w - 40} 66V8`} stroke="#64748b" strokeWidth="3" />
        <circle className="pg-led" cx={w - 40} cy="8" r="5" fill="#ef4444" />
        <rect x="4" y="62" width={w - 8} height="20" rx="3" className="fill-[#94a3b8] dark:fill-[#475569]" />
        <rect x="12" y="80" width={w - 24} height={h - 80} className="fill-[#eef2f6] dark:fill-[#334155]" />
        <rect x="26" y="96" width={w - 52} height="50" rx="5" className="fill-[#a5f3fc] dark:fill-[#22d3ee]" opacity="0.9" />
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={`M${26 + (i + 1) * ((w - 52) / 6)} 96v50`} stroke="#64748b" strokeWidth="3" />
        ))}
        <rect x="12" y="154" width={w - 24} height="8" style={{ fill: accent }} />
        <rect x={w / 2 - 32} y="176" width="64" height={h - 176} rx="3" style={{ fill: accent }} />
        <Glass x={w / 2 - 27} y={181} w={26} h={h - 187} rx={2} />
        <Glass x={w / 2 + 1} y={181} w={26} h={h - 187} rx={2} />
        <rect x={w - 104} y="178" width="44" height="46" rx="4" fill="#0f172a" />
        {Array.from({ length: 9 }, (_, i) => (
          <circle
            key={i}
            className="pg-led"
            cx={w - 96 + (i % 3) * 14}
            cy={188 + Math.floor(i / 3) * 13}
            r={2.6}
            fill={i % 4 === 1 ? '#f59e0b' : '#22c55e'}
            style={{ animationDelay: `${-i * 0.37}s` }}
          />
        ))}
        <Step cx={w / 2} y={h - 6} w={90} />
      </>
    ),
  }
}

function office(w: number, h: number, accent: string): Art {
  const cols = 5
  const colW = (w - 60) / cols
  return {
    name: 150,
    icon: 0,
    nameClass: 'bg-white text-[#1f2937] border-0 tracking-[0.3em] text-[10px] shadow-md',
    svg: (
      <>
        {/* Clock on the roof; the minute hand turns. */}
        <rect x={w / 2 - 30} y="2" width="60" height="44" rx="6" className="fill-[#8a7f72] dark:fill-[#4b443d]" />
        <circle cx={w / 2} cy="24" r="17" fill="#fffaf0" stroke="#3f3a36" strokeWidth="3" />
        <path d={`M${w / 2} 24v-9`} stroke="#3f3a36" strokeWidth="2.5" strokeLinecap="round" />
        <g className="pg-wheel" style={{ transformOrigin: `${w / 2}px 24px`, animationDuration: '20s' }}>
          <path d={`M${w / 2} 24h11`} stroke={accent} strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx={w / 2} cy="24" r="2" fill="#3f3a36" />
        <rect x="0" y="40" width={w} height="14" rx="3" style={{ fill: accent }} />
        <rect x="8" y="52" width={w - 16} height={h - 52} className="fill-[#e9dfcf] dark:fill-[#3a3545]" />
        <path d={`M8 102H${w - 8}`} stroke="black" strokeOpacity="0.12" strokeWidth="3" />
        {/* Two floors of windows. */}
        {[62, 110].flatMap((y) =>
          Array.from({ length: cols }, (_, i) => (
            <g key={`${y}-${i}`}>
              <rect x={30 + i * colW + 4} y={y} width={colW - 8} height="32" rx="3" className="fill-[#bfe3f5] dark:fill-[#fcd77a]" />
              <path d={`M${30 + i * colW + colW / 2} ${y}v32`} stroke="white" strokeWidth="2" opacity="0.7" />
              <rect x={30 + i * colW + 2} y={y + 32} width={colW - 4} height="4" rx="1" className="fill-[#c8b8a6] dark:fill-[#4b433d]" />
            </g>
          )),
        )}
        {/* Entrance canopy, glass doors and two potted shrubs. */}
        <rect x={w / 2 - 62} y="168" width="124" height="12" rx="3" style={{ fill: accent }} />
        <rect x={w / 2 - 62} y="168" width="124" height="12" rx="3" fill="black" opacity="0.15" />
        <rect x={w / 2 - 40} y="180" width="80" height={h - 180} rx="3" fill="#475569" />
        <rect x={w / 2 - 36} y="184" width="34" height={h - 188} rx="2" className="fill-[#bfe3f5] dark:fill-[#fcd77a]" />
        <rect x={w / 2 + 2} y="184" width="34" height={h - 188} rx="2" className="fill-[#bfe3f5] dark:fill-[#fcd77a]" />
        {[w / 2 - 82, w / 2 + 62].map((x) => (
          <g key={x}>
            <rect x={x} y={h - 22} width="20" height="22" rx="3" fill="#78716c" />
            <circle cx={x + 10} cy={h - 30} r="14" className="fill-[#3c9a4e] dark:fill-[#1c5232]" />
          </g>
        ))}
        <Step cx={w / 2} y={h - 6} w={100} />
      </>
    ),
  }
}

const ART: Record<BuildingStyle, (w: number, h: number, accent: string) => Art> = { shop, library, vault, studio, lab, office }

/** A category's building in town. Its door is where the player walks in. */
export function Building({ house, near, onClick }: { house: House; near: boolean; onClick: () => void }) {
  const lang = useLang()
  const { rect, accent } = house
  const art = ART[house.style](rect.w, rect.h, accent)
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
      <svg viewBox={`0 0 ${rect.w} ${rect.h}`} width={rect.w} height={rect.h} className="relative overflow-visible">
        {art.svg}
      </svg>
      {art.icon > 0 && (
        <span
          className="absolute left-1/2 grid size-10 -translate-x-1/2 place-items-center"
          style={{ top: art.icon, color: accent }}
        >
          <Icon className="size-6" />
        </span>
      )}
      <span
        className={`absolute left-1/2 -translate-x-1/2 rounded-md border px-2 py-0.5 font-bold whitespace-nowrap uppercase shadow-sm ${art.nameClass ?? ''}`}
        style={{ top: art.name, borderColor: art.nameClass?.includes('border-2') ? accent : undefined }}
      >
        {placeName(house.style, lang)}
      </span>
      {near && (
        <span className="pg-hop absolute left-1/2 grid h-7 min-w-7 -translate-x-1/2 place-items-center rounded-md border border-b-[3px] bg-card px-1.5 font-mono text-xs font-semibold shadow-md" style={{ bottom: 96 }}>
          E
        </span>
      )}
    </div>
  )
}
