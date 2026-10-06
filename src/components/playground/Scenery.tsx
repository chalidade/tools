import { useMemo, type CSSProperties } from 'react'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Building, CATEGORY_ICONS } from './Buildings'
import { GRASS_TILE, PATH_WIDTH, type BuildingStyle, type Room, type Town } from './scenes'
import { Plant } from './Sprites'

/*
 * Everything in a scene that the game loop does not move. Ambient motion —
 * swaying, ripples, drifting clouds, butterflies — is CSS (`.pg-*`).
 */

export function TownScenery({
  town,
  visited,
  nearHouse,
  onHouse,
  grassRef,
}: {
  town: Town
  visited: Set<string>
  nearHouse: string | null
  onHouse: (id: string) => void
  /** Each tall-grass patch's container; its children are the tiles, row by row. */
  grassRef: (index: number, el: HTMLDivElement | null) => void
}) {
  const { plaza, pond } = town
  const flyers = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: ((i * 7919) % 1000) / 1000,
        y: ((i * 104729) % 1000) / 1000,
        delay: -((i * 37) % 90) / 10,
        duration: 7 + ((i * 13) % 6),
        color: ['#fde047', '#f9a8d4', '#ffffff', '#93c5fd'][i % 4],
      })),
    [],
  )

  return (
    <>
      {/* Ground: grass with darker meadow patches, then the paths. */}
      <div className="pg-grass absolute inset-0" />
      <svg className="absolute inset-0 overflow-visible" width={town.width} height={town.height}>
        <g className="fill-[#86c36a] dark:fill-[#18301f]" opacity="0.7">
          {flyers.slice(0, 10).map((f, i) => (
            <ellipse key={i} cx={f.y * town.width} cy={f.x * town.height} rx={90 + (i % 3) * 40} ry={50 + (i % 2) * 30} />
          ))}
        </g>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {town.paths.map((d, i) => (
            <path key={`e${i}`} d={d} strokeWidth={PATH_WIDTH + 10} className="stroke-[#c9a96b] dark:stroke-[#3a3226]" />
          ))}
          {town.paths.map((d, i) => (
            <path key={`f${i}`} d={d} strokeWidth={PATH_WIDTH} className="stroke-[#e8d29c] dark:stroke-[#4d4434]" />
          ))}
          {town.paths.map((d, i) => (
            <path
              key={`w${i}`}
              d={d}
              strokeWidth={PATH_WIDTH - 30}
              className="stroke-[#f2e2b6] dark:stroke-[#574d3b]"
              opacity="0.6"
            />
          ))}
        </g>

        {/* Plaza: cobblestones inside a stone ring. */}
        <defs>
          <pattern id="pg-cobble" width="28" height="20" patternUnits="userSpaceOnUse">
            <rect x="1" y="1" width="12" height="8" rx="3" className="fill-[#d9cdb4] dark:fill-[#4f4a40]" />
            <rect x="15" y="1" width="12" height="8" rx="3" className="fill-[#d2c4a8] dark:fill-[#48433a]" />
            <rect x="8" y="11" width="12" height="8" rx="3" className="fill-[#d6c9ae] dark:fill-[#4b463c]" />
          </pattern>
        </defs>
        <ellipse cx={plaza.x} cy={plaza.y} rx={plaza.rx + 8} ry={plaza.ry + 8} className="fill-[#b9ab90] dark:fill-[#3a352e]" />
        <ellipse cx={plaza.x} cy={plaza.y} rx={plaza.rx} ry={plaza.ry} className="fill-[#e3d8c0] dark:fill-[#433e35]" />
        <ellipse cx={plaza.x} cy={plaza.y} rx={plaza.rx} ry={plaza.ry} fill="url(#pg-cobble)" />

        {/* Pond with lily pads; ripples spread across it. */}
        <ellipse cx={pond.x} cy={pond.y + 4} rx={pond.rx + 10} ry={pond.ry + 9} className="fill-[#a3a08f] dark:fill-[#3b3a33]" />
        <ellipse cx={pond.x} cy={pond.y} rx={pond.rx} ry={pond.ry} className="fill-[#5fb3e0] dark:fill-[#183f5c]" />
        <ellipse cx={pond.x - 20} cy={pond.y - 18} rx={pond.rx * 0.55} ry={pond.ry * 0.3} fill="white" opacity="0.18" />
        {[0, 1, 2].map((i) => (
          <ellipse
            key={i}
            className="pg-ripple"
            cx={pond.x + [-40, 30, 60][i]}
            cy={pond.y + [10, -12, 22][i]}
            rx={18}
            ry={7}
            fill="none"
            stroke="white"
            strokeWidth="2"
            style={{ animationDelay: `${-i * 1.3}s` }}
          />
        ))}
        {[
          [-70, -20],
          [52, 26],
          [-10, 34],
        ].map(([dx, dy]) => (
          <g key={dx}>
            <path
              d={`M${pond.x + dx} ${pond.y + dy}m-11 0a11 7 0 1 0 22 0l-11 0Z`}
              className="fill-[#4caf50] dark:fill-[#1f6b3a]"
            />
            {dx < 0 && <circle cx={pond.x + dx + 3} cy={pond.y + dy - 2} r="3" fill="#f9a8d4" />}
          </g>
        ))}
      </svg>

      {/* Reeds at the water's edge. */}
      {[
        [-pond.rx + 6, 10],
        [-pond.rx + 22, 34],
        [pond.rx - 14, 26],
      ].map(([dx, dy], i) => (
        <svg
          key={i}
          className="pg-sway absolute overflow-visible"
          width={24}
          height={40}
          style={{ left: pond.x + dx - 12, top: pond.y + dy - 38, zIndex: Math.round(pond.y + dy), animationDelay: `${-i}s` }}
        >
          <path d="M6 40V8M12 40V2M18 40V12" stroke="#3f7d3a" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="10.5" y="4" width="3.5" height="10" rx="1.7" fill="#7c4a2a" />
        </svg>
      ))}

      {/* Fountain with the privacy shield floating over it. */}
      <div
        className="absolute"
        style={{ left: plaza.x - 66, top: plaza.y - 112, width: 132, height: 132, zIndex: Math.round(plaza.y + 40) }}
      >
        <span className="absolute inset-x-0 bottom-0 h-[60px] rounded-[50%] border-[7px] border-[#b9b2a8] bg-[#7cc4e8] dark:border-[#57534e] dark:bg-[#1e4f6e]" />
        <span className="pg-ripple-css absolute inset-x-7 bottom-3 h-7 rounded-[50%] border-2 border-white/60" />
        <div className="pg-float absolute top-0 left-1/2 size-16 -translate-x-1/2">
          <span className="absolute -inset-3 rounded-full bg-gradient-brand opacity-30 blur-xl" />
          <span className="relative grid size-full place-items-center rounded-full bg-gradient-brand text-white shadow-xl shadow-brand-2/30">
            <ShieldCheck className="size-8" />
          </span>
        </div>
      </div>

      {/* Tall grass. Each tile sits in front of whoever stands in it, hiding their feet. */}
      {town.grass.map((g, gi) => (
        <div key={gi} ref={(el) => grassRef(gi, el)}>
          {Array.from({ length: (g.w / GRASS_TILE) * (g.h / GRASS_TILE) }, (_, i) => {
            const cols = g.w / GRASS_TILE
            const x = g.x + (i % cols) * GRASS_TILE
            const y = g.y + Math.floor(i / cols) * GRASS_TILE
            return (
              <svg
                key={i}
                className="absolute overflow-visible"
                width={GRASS_TILE}
                height={GRASS_TILE}
                viewBox="0 0 26 26"
                style={{ left: x, top: y + 4, zIndex: y + GRASS_TILE }}
              >
                <g className="pg-blades" style={{ animationDelay: `${-((i * 7) % 10) / 4}s` }}>
                  <path
                    d="M2 26 5 6l4 20M9 26l5-24 4 24M17 26l5-18 3 18"
                    className="fill-[#2f8f46] dark:fill-[#195a2c]"
                  />
                  <path d="M5 8v8M14 5v9M22 10v7" stroke="#7fd37a" strokeWidth="1.2" className="opacity-70 dark:opacity-30" />
                </g>
              </svg>
            )
          })}
        </div>
      ))}

      {/* Flower beds under the windows. */}
      {town.beds.map((b, i) => (
        <svg
          key={i}
          className="absolute overflow-visible"
          width={b.w}
          height={b.h + 10}
          style={{ left: b.x, top: b.y - 10, zIndex: Math.round(b.y + b.h) }}
        >
          <rect x="0" y="10" width={b.w} height={b.h} rx="5" className="fill-[#7a5136] dark:fill-[#3b2718]" />
          {Array.from({ length: 6 }, (_, j) => (
            <g key={j} className="pg-sway" style={{ animationDelay: `${-j * 0.4}s` }}>
              <path d={`M${7 + j * 10} 18v-8`} stroke="#3f8f3a" strokeWidth="1.6" />
              <circle cx={7 + j * 10} cy={9} r={3.4} fill={['#f43f5e', '#facc15', '#f8fafc', '#c084fc'][(i + j) % 4]} />
            </g>
          ))}
        </svg>
      ))}

      {/* Benches and lamp posts around the plaza. */}
      {town.benches.map((b, i) => (
        <svg
          key={i}
          className="absolute overflow-visible"
          width={b.w}
          height={34}
          style={{ left: b.x, top: b.y - 16, zIndex: Math.round(b.y + b.h) }}
        >
          <ellipse cx={b.w / 2} cy="33" rx={b.w / 2} ry="3" fill="black" opacity="0.18" />
          <rect x="4" y="2" width={b.w - 8} height="8" rx="2" className="fill-[#a0623a] dark:fill-[#5b3a22]" />
          <rect x="0" y="14" width={b.w} height="9" rx="2" className="fill-[#b8733f] dark:fill-[#6b4428]" />
          <path d={`M8 23v9M${b.w - 8} 23v9M10 10v4M${b.w - 10} 10v4`} stroke="#52525b" strokeWidth="3" />
        </svg>
      ))}
      {town.lamps.map((l, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: l.x - 10, top: l.y - 70, width: 20, height: 72, zIndex: Math.round(l.y) }}
        >
          <span className="absolute -inset-x-6 -top-5 hidden h-16 rounded-full bg-amber-200/40 blur-xl dark:block" />
          <span className="absolute bottom-0 left-1/2 h-14 w-1.5 -translate-x-1/2 bg-[#3f3f46]" />
          <span className="absolute top-0 left-1/2 h-4 w-5 -translate-x-1/2 rounded-t-md bg-[#3f3f46]" />
          <span className="absolute top-3.5 left-1/2 h-3 w-3.5 -translate-x-1/2 rounded-sm bg-[#fef3c7] dark:bg-[#fde68a] dark:shadow-[0_0_14px_4px] dark:shadow-amber-300/70" />
          <span className="absolute bottom-0 left-1/2 h-1.5 w-4 -translate-x-1/2 rounded-full bg-[#3f3f46]" />
        </div>
      ))}

      {/* Wooden signposts: what's inside, and how much of it you've visited. */}
      {town.signs.map(({ at, house }) => {
        const Icon = CATEGORY_ICONS[house.id]
        const seen = house.tools.filter((t) => visited.has(t.slug)).length
        return (
          <div
            key={house.id}
            className="absolute"
            style={{ left: at.x - 58, top: at.y - 58, width: 116, height: 60, zIndex: Math.round(at.y) }}
          >
            <span className="absolute bottom-0 left-1/2 h-6 w-2 -translate-x-1/2 bg-[#7c4a2a]" />
            <div className="absolute inset-x-0 top-0 flex h-9 flex-col items-center justify-center rounded-md border-2 border-[#6b3f22] bg-[#c48a55] px-1 text-[#3b2414] shadow-md dark:bg-[#8a5a33] dark:text-[#fdf2e3]">
              <span className="flex items-center gap-1 text-[10px] leading-none font-bold">
                {Icon && <Icon className="size-3" />}
                <span className="max-w-[92px] truncate">{house.title}</span>
              </span>
              <span className="mt-0.5 font-mono text-[9px] leading-none opacity-75">
                {seen}/{house.tools.length} dikunjungi
              </span>
            </div>
          </div>
        )
      })}

      {town.trees.map((tree, i) => (
        <Plant key={i} tree={tree} index={i} />
      ))}

      {town.houses.map((house) => (
        <Building key={house.id} house={house} near={nearHouse === house.id} onClick={() => onHouse(house.id)} />
      ))}

      {/* Cloud shadows and butterflies by day, fireflies by night. */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="pg-cloud pointer-events-none absolute rounded-[50%] bg-black/10 blur-2xl dark:hidden"
          style={
            {
              top: town.height * (0.15 + i * 0.3),
              left: -500,
              width: 420 + i * 80,
              height: 160 + i * 30,
              zIndex: 9500,
              '--travel': `${town.width + 1000}px`,
              animationDuration: `${70 + i * 25}s`,
              animationDelay: `${-i * 30}s`,
            } as CSSProperties
          }
        />
      ))}
      {flyers.map((f, i) =>
        i % 2 ? (
          <span
            key={i}
            className="pg-flutter pointer-events-none absolute dark:hidden"
            style={{
              left: f.x * town.width,
              top: f.y * town.height,
              zIndex: 9000,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration * 1.6}s`,
            }}
          >
            <span className="pg-wing absolute -left-[6px] h-2 w-[6px] rounded-full" style={{ background: f.color }} />
            <span
              className="pg-wing absolute left-0 h-2 w-[6px] rounded-full"
              style={{ background: f.color, animationDelay: '-0.12s' }}
            />
          </span>
        ) : (
          <span
            key={i}
            className="pg-firefly pointer-events-none absolute hidden size-1.5 rounded-full bg-amber-200 shadow-[0_0_10px_3px] shadow-amber-200/60 dark:block"
            style={{
              left: f.x * town.width,
              top: f.y * town.height,
              zIndex: 9000,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`,
            }}
          />
        ),
      )}
    </>
  )
}

const FLOORS: Record<BuildingStyle, string> = {
  shop: 'pg-floor-wood',
  library: 'pg-floor-carpet',
  vault: 'pg-floor-stone',
  studio: 'pg-floor-check',
  lab: 'pg-floor-tile',
}

/** Inside a building: back wall, floor, carpet, plants and the door mat — styled to match the building. */
export function RoomScenery({ room }: { room: Room }) {
  const { width, height, wall, mat, house } = room
  const Icon = CATEGORY_ICONS[house.id]
  return (
    <>
      <div className="absolute inset-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/40">
        <div className="pg-wallpaper absolute inset-x-0 top-0" style={{ height: wall }}>
          <WallDecor style={house.style} accent={house.accent} side="left" />
          <WallDecor style={house.style} accent={house.accent} side="right" />
          <div
            className="absolute top-5 left-1/2 flex w-max max-w-[44%] -translate-x-1/2 flex-col items-center rounded-xl px-5 py-2.5 text-center text-white shadow-lg"
            style={{ background: house.accent }}
          >
            <span className="flex items-center gap-2 text-base font-semibold tracking-tight">
              {Icon && <Icon className="size-4" />}
              {house.place} {house.title}
            </span>
            <span className="mt-0.5 text-[11px] leading-snug opacity-85">{house.description}</span>
          </div>
          <span className="absolute inset-x-0 bottom-0 h-3" style={{ background: house.accent }} />
          <span className="absolute inset-x-0 bottom-0 h-3 bg-black/30" />
        </div>

        <div className={cn('absolute inset-x-0', FLOORS[house.style])} style={{ top: wall, bottom: 0 }} />
        {/* Carpet from the door to the back wall. */}
        <span
          className="absolute -translate-x-1/2 border-x-4 border-white/20"
          style={{ left: width / 2, top: wall, width: 120, height: height - wall, background: `${house.accent}40` }}
        />
        <span className="pg-wall-edge absolute inset-y-0 left-0 w-6" />
        <span className="pg-wall-edge absolute inset-y-0 right-0 w-6" />
        <span className="pg-wall-edge absolute bottom-0 left-0 h-6" style={{ width: width / 2 - 60 }} />
        <span className="pg-wall-edge absolute right-0 bottom-0 h-6" style={{ width: width / 2 - 60 }} />
      </div>

      <span
        className="absolute flex items-center justify-center rounded-lg border-2 border-black/15 font-mono text-[10px] font-semibold tracking-widest text-white/90"
        style={{ left: mat.x - 50, top: mat.y - 16, width: 100, height: 34, background: house.accent, zIndex: 2 }}
      >
        KELUAR ↓
      </span>

      {room.plants.map((p, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: p.x - 24, top: p.y - 52, width: 48, height: 60, zIndex: Math.round(p.y) }}
        >
          <div className="pg-sway absolute inset-x-0 top-0 h-10 origin-bottom" style={{ animationDelay: `${-i * 0.7}s` }}>
            <span className="absolute inset-x-1 top-0 h-9 rounded-full bg-emerald-600 dark:bg-emerald-800" />
            <span className="absolute top-1 left-2 h-5 w-5 rounded-full bg-emerald-400/60 dark:bg-emerald-600/60" />
          </div>
          <span className="absolute bottom-0 left-1/2 h-6 w-9 -translate-x-1/2 rounded-t-sm rounded-b-lg bg-[#c0703f] dark:bg-[#7a4527]" />
        </div>
      ))}
    </>
  )
}

const BOOKS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#14b8a6', '#64748b']

/** What hangs or stands against a room's back wall, by building style. */
function WallDecor({ style, accent, side }: { style: BuildingStyle; accent: string; side: 'left' | 'right' }) {
  const pos = side === 'left' ? { left: 40 } : { right: 40 }
  if (style === 'library')
    return (
      <div className="absolute top-6 h-[118px] w-36 rounded-sm border-4 border-[#6b3f22] bg-[#8b5a33] p-1" style={pos}>
        {[0, 1, 2].map((r) => (
          <div key={r} className="mb-1 flex h-8 items-end gap-[2px] border-b-4 border-[#6b3f22]">
            {Array.from({ length: 11 }, (_, i) => (
              <span
                key={i}
                className="w-2.5 rounded-t-[1px]"
                style={{ height: 18 + ((i * 7 + r * 3) % 12), background: BOOKS[(i + r * 3) % BOOKS.length] }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  if (style === 'vault')
    return (
      <div className="absolute top-8 grid h-[100px] w-36 grid-cols-4 gap-1 rounded-md bg-[#57534e] p-1.5" style={pos}>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="grid place-items-center rounded-sm bg-[#a8a29e]">
            <span className="size-1.5 rounded-full bg-[#facc15]" />
          </span>
        ))}
      </div>
    )
  if (style === 'studio')
    return (
      <div className="absolute top-8 flex gap-3" style={pos}>
        {[0, 1].map((i) => (
          <span key={i} className="grid h-20 w-14 place-items-center rounded-sm border-4 border-[#18181b] bg-white">
            <span className="size-8 rounded-full" style={{ background: i ? accent : '#facc15' }} />
          </span>
        ))}
        <span className="pg-bulb mt-1 size-5 rounded-full bg-[#fde047] shadow-[0_0_16px_6px] shadow-amber-200/70" />
      </div>
    )
  if (style === 'lab')
    return (
      <div className="absolute top-6 flex gap-2" style={pos}>
        <div className="grid h-[112px] w-14 content-start gap-1.5 rounded-md bg-[#0f172a] p-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="flex h-3 items-center gap-1 rounded-sm bg-[#1e293b] px-1">
              <span className="pg-led size-1.5 rounded-full bg-[#22c55e]" style={{ animationDelay: `${-i * 0.4}s` }} />
              <span className="pg-led size-1.5 rounded-full bg-[#38bdf8]" style={{ animationDelay: `${-i * 0.7}s` }} />
            </span>
          ))}
        </div>
        <div className="mt-4 h-16 w-24 rounded-md border-4 border-[#334155] bg-[#0f172a] p-1.5">
          {[70, 45, 85, 30].map((w, i) => (
            <span
              key={i}
              className="mb-1 block h-1 rounded-full"
              style={{ width: `${w}%`, background: i % 2 ? '#a78bfa' : '#67e8f9' }}
            />
          ))}
        </div>
      </div>
    )
  // Print shop: shelves of paper reams beside a big printer.
  return (
    <div className="absolute top-8 flex items-end gap-2" style={pos}>
      <div className="w-20 rounded-sm border-4 border-[#6b3f22] bg-[#8b5a33] p-1">
        {[0, 1].map((r) => (
          <div key={r} className="mb-1 flex gap-1 border-b-4 border-[#6b3f22] pb-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-7 flex-1 rounded-[2px] bg-white shadow-sm"
                style={{ borderTop: `4px solid ${BOOKS[(i + r) % 4]}` }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="relative h-16 w-20 rounded-md bg-[#475569]">
        <span className="absolute -top-2 left-3 h-3 w-14 rounded-sm bg-white" />
        <span className="absolute top-4 left-2 h-1.5 w-16 rounded-full bg-[#1e293b]" />
        <span className="pg-led absolute right-2 bottom-2 size-2 rounded-full bg-[#22c55e]" />
      </div>
    </div>
  )
}
