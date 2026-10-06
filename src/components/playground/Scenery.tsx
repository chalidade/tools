import { ShieldCheck } from 'lucide-react'
import { House, Plant, CATEGORY_ICONS } from './Sprites'
import type { Room, Town } from './scenes'

/** The town's ground, paths, fountain, trees and houses. Nothing here moves on its own. */
export function TownScenery({
  town,
  visited,
  nearHouse,
  onHouse,
}: {
  town: Town
  visited: Set<string>
  nearHouse: string | null
  onHouse: (id: string) => void
}) {
  const { plaza } = town
  return (
    <>
      <div className="pg-grass absolute inset-0" />
      {town.paths.map((p, i) => (
        <span key={i} className="pg-path absolute rounded-3xl" style={{ left: p.x, top: p.y, width: p.w, height: p.h }} />
      ))}
      <span
        className="pg-path absolute rounded-full"
        style={{ left: plaza.x - plaza.r, top: plaza.y - plaza.r * 0.8, width: plaza.r * 2, height: plaza.r * 1.6 }}
      />
      <span
        className="absolute rounded-full border-4 border-dashed border-black/10"
        style={{ left: plaza.x - plaza.r + 18, top: plaza.y - plaza.r * 0.8 + 14, width: plaza.r * 2 - 36, height: plaza.r * 1.6 - 28 }}
      />

      {/* Fountain with the privacy shield floating over it. */}
      <div
        className="absolute"
        style={{ left: plaza.x - 64, top: plaza.y - 110, width: 128, height: 130, zIndex: Math.round(plaza.y + 40) }}
      >
        <span className="absolute inset-x-0 bottom-0 h-[58px] rounded-[50%] border-[6px] border-[#b9b2a8] bg-[#7cc4e8] dark:border-[#57534e] dark:bg-[#1e4f6e]" />
        <span className="absolute inset-x-6 bottom-3 h-7 animate-pulse rounded-[50%] bg-white/40" />
        <div className="pg-float absolute top-0 left-1/2 size-16 -translate-x-1/2">
          <span className="absolute -inset-3 rounded-full bg-gradient-brand opacity-30 blur-xl" />
          <span className="relative grid size-full place-items-center rounded-full bg-gradient-brand text-white shadow-xl shadow-brand-2/30">
            <ShieldCheck className="size-8" />
          </span>
        </div>
      </div>
      <span
        className="absolute rounded-md border border-black/10 bg-[#fffaf0] px-2.5 py-1 text-center font-mono text-[11px] whitespace-nowrap text-[#3f3a36] shadow-sm dark:bg-[#2a2530] dark:text-[#f3eee8]"
        style={{ left: plaza.x - 120, top: plaza.y + plaza.r * 0.8 + 14, width: 240, zIndex: Math.round(plaza.y + plaza.r) }}
      >
        Kota Tools · semua diproses di browser
      </span>

      {town.trees.map((tree, i) => (
        <Plant key={i} tree={tree} index={i} />
      ))}

      {town.houses.map((house) => (
        <House
          key={house.id}
          house={house}
          visited={house.tools.filter((t) => visited.has(t.slug)).length}
          near={nearHouse === house.id}
          onClick={() => onHouse(house.id)}
        />
      ))}
    </>
  )
}

/** Inside a house: back wall with the house's name, wooden floor, carpet, plants and the door mat. */
export function RoomScenery({ room }: { room: Room }) {
  const { width, height, wall, mat, house } = room
  const Icon = CATEGORY_ICONS[house.id]
  return (
    <>
      <div className="absolute inset-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/40">
        <div className="pg-wallpaper absolute inset-x-0 top-0" style={{ height: wall }}>
          {/* Windows */}
          {[0.16, 0.84].map((at) => (
            <span
              key={at}
              className="absolute top-8 h-16 w-20 -translate-x-1/2 rounded-md border-4 border-[#8b6b4f] bg-[#bfe3f5] dark:border-[#3b2f27] dark:bg-[#1c2c4a]"
              style={{ left: `${at * 100}%` }}
            >
              <span className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-[#8b6b4f] dark:bg-[#3b2f27]" />
              <span className="absolute top-1/2 h-1 w-full -translate-y-1/2 bg-[#8b6b4f] dark:bg-[#3b2f27]" />
            </span>
          ))}
          {/* Banner */}
          <div
            className="absolute top-5 left-1/2 flex w-max max-w-[60%] -translate-x-1/2 flex-col items-center rounded-xl px-5 py-2.5 text-center text-white shadow-lg"
            style={{ background: house.roof }}
          >
            <span className="flex items-center gap-2 text-base font-semibold tracking-tight">
              {Icon && <Icon className="size-4" />}
              Rumah {house.title}
            </span>
            <span className="mt-0.5 text-[11px] leading-snug opacity-85">{house.description}</span>
          </div>
          <span className="absolute inset-x-0 bottom-0 h-3" style={{ background: house.roof }} />
          <span className="absolute inset-x-0 bottom-0 h-3 bg-black/30" />
        </div>

        <div className="pg-floor absolute inset-x-0" style={{ top: wall, bottom: 0 }} />
        {/* Carpet from the door to the back wall. */}
        <span
          className="absolute -translate-x-1/2 border-x-4 border-white/20"
          style={{ left: width / 2, top: wall, width: 120, height: height - wall, background: `${house.roof}38` }}
        />
        {/* Walls: sides and front, with the doorway gap behind the mat. */}
        <span className="pg-wall-edge absolute inset-y-0 left-0 w-6" />
        <span className="pg-wall-edge absolute inset-y-0 right-0 w-6" />
        <span className="pg-wall-edge absolute bottom-0 left-0 h-6" style={{ width: width / 2 - 60 }} />
        <span className="pg-wall-edge absolute right-0 bottom-0 h-6" style={{ width: width / 2 - 60 }} />
      </div>

      {/* Door mat: step on it walking down to go back outside. */}
      <span
        className="absolute flex items-center justify-center rounded-lg border-2 border-black/15 font-mono text-[10px] font-semibold tracking-widest text-white/90"
        style={{ left: mat.x - 50, top: mat.y - 16, width: 100, height: 34, background: house.roof, zIndex: 2 }}
      >
        KELUAR ↓
      </span>

      {room.plants.map((p, i) => (
        <div key={i} className="absolute" style={{ left: p.x - 24, top: p.y - 52, width: 48, height: 60, zIndex: Math.round(p.y) }}>
          <div className="pg-sway absolute inset-x-0 top-0 h-10 origin-bottom" style={{ animationDelay: `${-i * 0.7}s` }}>
            <span className="absolute inset-x-1 top-0 h-9 rounded-full bg-emerald-600 dark:bg-emerald-800" />
            <span className="absolute top-1 left-2 h-5 w-5 rounded-full bg-emerald-400/60 dark:bg-emerald-600/60" />
          </div>
          <span className="absolute bottom-0 left-1/2 h-6 w-9 -translate-x-1/2 rounded-b-lg rounded-t-sm bg-[#c0703f] dark:bg-[#7a4527]" />
        </div>
      ))}
    </>
  )
}
