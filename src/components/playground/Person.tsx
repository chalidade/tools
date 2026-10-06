/*
 * A chibi cartoon person, 44×62, feet at the bottom edge. Every colour and
 * garment comes from a `Look`, so the player, the keepers and the townsfolk
 * are all the same drawing dressed differently.
 *
 * Animation hooks (styled in index.css): `.pg-body` bobs, `.pg-leg-*` step and
 * `.pg-arm-*` swing while the sprite has `data-walking`; `data-dir="up"` on the
 * sprite shows the back of the head instead of the face.
 */

export type HairStyle =
  | 'short'
  | 'long'
  | 'bun'
  | 'spiky'
  | 'curly'
  | 'ponytail'
  | 'pigtails'
  | 'bob'
  | 'afro'
  | 'mohawk'
  | 'bald'
export type Hat = 'cap' | 'beanie' | 'straw' | 'beret' | 'guard' | 'hardhat'
export type Outfit = 'tee' | 'hoodie' | 'jacket' | 'dress' | 'overall' | 'labcoat' | 'apron' | 'vest'
export type Face = 'smile' | 'happy' | 'grin' | 'calm'

export interface Look {
  skin: string
  hair: string
  style: HairStyle
  outfit: Outfit
  shirt: string
  /** Second garment colour: jacket lining, apron, overall shirt, hoodie pocket… */
  accent: string
  pants: string
  shoes: string
  face: Face
  hat?: Hat
  hatColor?: string
  glasses?: boolean
  mustache?: boolean
  freckles?: boolean
  backpack?: string
  cane?: boolean
}

const SKINS = ['#fde0c8', '#f8d5b8', '#f1c27d', '#e0ac69', '#c68642', '#a0663a', '#8d5524']
const HAIRS = ['#2b1d16', '#4a2f20', '#1f1f24', '#7a4a26', '#b7652d', '#d9a441', '#9a3b2e', '#3b2f5c']
const STYLES: HairStyle[] = [
  'short',
  'long',
  'bun',
  'spiky',
  'curly',
  'ponytail',
  'pigtails',
  'bob',
  'afro',
  'mohawk',
]
const OUTFITS: Outfit[] = ['tee', 'hoodie', 'jacket', 'dress', 'overall', 'vest', 'tee', 'jacket']
const HATS: (Hat | undefined)[] = [undefined, undefined, undefined, 'cap', 'beanie', 'straw', 'beret']
const FACES: Face[] = ['smile', 'happy', 'grin', 'calm']
const PANTS = ['#334155', '#1e3a5f', '#3f3f46', '#4b3a2a', '#365314', '#7c2d12', '#1f2937']
const ACCENTS = ['#fef3c7', '#e0f2fe', '#fce7f3', '#dcfce7', '#f1f5f9', '#ede9fe', '#ffedd5']
const SHOES = ['#27272a', '#7c2d12', '#1e3a8a', '#f8fafc', '#b91c1c']
const HAT_COLORS = ['#ef4444', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0f766e', '#db2777']

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** A stable look for a seed (a tool slug, a resident's name), with anything in `over` forced. */
export function lookFor(seed: string, over: Partial<Look> = {}): Look {
  const h = hash(seed)
  const g = hash(`${seed}#`)
  const at = <T,>(list: readonly T[], shift: number, src = h) => list[(src >>> shift) % list.length]
  return {
    skin: at(SKINS, 0),
    hair: at(HAIRS, 3),
    style: at(STYLES, 6),
    outfit: at(OUTFITS, 10),
    shirt: at(HAT_COLORS, 0, g),
    accent: at(ACCENTS, 4, g),
    pants: at(PANTS, 13),
    shoes: at(SHOES, 8, g),
    face: at(FACES, 16),
    hat: at(HATS, 18),
    hatColor: at(HAT_COLORS, 12, g),
    glasses: (h >>> 21) % 5 === 0,
    freckles: (h >>> 24) % 4 === 0,
    mustache: (g >>> 20) % 9 === 0,
    ...over,
  }
}

export const PLAYER_LOOK: Look = {
  skin: '#f1c27d',
  hair: '#2b1d16',
  style: 'short',
  outfit: 'jacket',
  shirt: 'var(--brand-1)',
  accent: '#f8fafc',
  pants: '#1e293b',
  shoes: '#dc2626',
  face: 'smile',
  hat: 'cap',
  hatColor: 'var(--brand-2)',
  backpack: '#f59e0b',
}

const fill = (color: string) => ({ fill: color })

export function Person({ look, size = 1 }: { look: Look; size?: number }) {
  const { skin, hair, style, shirt, pants, outfit, accent } = look
  const coat = outfit === 'labcoat'
  const sleeve = coat ? '#f8fafc' : outfit === 'vest' ? accent : shirt
  const legs = outfit === 'dress' ? skin : pants
  return (
    <svg viewBox="0 0 44 62" width={44 * size} height={62 * size} className="pg-body overflow-visible">
      {/* Behind the body: long hair, ponytail, afro, backpack. */}
      {style === 'long' && <path d="M9 20c0 12 1 18 3 22h20c2-4 3-10 3-22Z" style={fill(hair)} />}
      {style === 'ponytail' && <path d="M31 11c9 3 8 15 4 22-1-6-3-10-6-13Z" style={fill(hair)} />}
      {style === 'pigtails' && (
        <g style={fill(hair)}>
          <ellipse cx="7" cy="24" rx="4" ry="6" />
          <ellipse cx="37" cy="24" rx="4" ry="6" />
        </g>
      )}
      {style === 'afro' && <circle cx="22" cy="15" r="15.5" style={fill(hair)} />}
      {look.backpack && <rect x="8" y="31" width="28" height="15" rx="5" style={fill(look.backpack)} />}
      {outfit === 'hoodie' && <path d="M13 31c0-5 4-7 9-7s9 2 9 7Z" style={fill(shirt)} opacity="0.85" />}

      {/* Legs and shoes. */}
      <g className="pg-leg-a">
        <rect x="14" y="45" width="6.5" height="12" rx="3" style={fill(legs)} />
        <ellipse cx="17" cy="58.5" rx="4.6" ry="2.6" style={fill(look.shoes)} />
      </g>
      <g className="pg-leg-b">
        <rect x="23.5" y="45" width="6.5" height="12" rx="3" style={fill(legs)} />
        <ellipse cx="27" cy="58.5" rx="4.6" ry="2.6" style={fill(look.shoes)} />
      </g>

      {/* Arms, then the torso over their tops. */}
      <g className="pg-arm-a">
        <rect x="7" y="31" width="6" height="13" rx="3" style={fill(sleeve)} />
        <circle cx="10" cy="45" r="2.8" style={fill(skin)} />
      </g>
      <g className="pg-arm-b">
        <rect x="31" y="31" width="6" height="13" rx="3" style={fill(sleeve)} />
        <circle cx="34" cy="45" r="2.8" style={fill(skin)} />
        {look.cane && <path d="M34 44v15" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />}
      </g>
      <Torso look={look} />

      {/* Head. */}
      <rect x="19" y="26" width="6" height="5" style={fill(skin)} />
      <circle cx="22" cy="18" r="12.5" style={fill(skin)} />
      <circle cx="9.6" cy="19.5" r="2.4" style={fill(skin)} />
      <circle cx="34.4" cy="19.5" r="2.4" style={fill(skin)} />

      <g className="pg-face">
        <Eyes face={look.face} />
        {look.freckles && (
          <g fill="#b45309" opacity="0.5">
            <circle cx="14.5" cy="23.5" r="0.7" />
            <circle cx="16.5" cy="24.5" r="0.7" />
            <circle cx="29.5" cy="23.5" r="0.7" />
            <circle cx="27.5" cy="24.5" r="0.7" />
          </g>
        )}
        <circle cx="13.5" cy="24.5" r="2" fill="#fb7185" opacity="0.35" />
        <circle cx="30.5" cy="24.5" r="2" fill="#fb7185" opacity="0.35" />
        {look.mustache ? (
          <path d="M17.5 25.5q4.5-3 9 0q-4.5 1.5-9 0Z" style={fill(hair)} />
        ) : look.face === 'grin' ? (
          <path d="M18.5 24.5h7q-.5 4-3.5 4t-3.5-4Z" fill="#7c2d12" />
        ) : look.face === 'calm' ? (
          <path d="M20 26h4" stroke="#7c2d12" strokeWidth="1.3" strokeLinecap="round" />
        ) : (
          <path d="M19.5 25.5q2.5 2.2 5 0" fill="none" stroke="#7c2d12" strokeWidth="1.3" strokeLinecap="round" />
        )}
        {look.glasses && (
          <g fill="none" stroke="#18181b" strokeWidth="1.2">
            <circle cx="17" cy="20" r="3.6" />
            <circle cx="27" cy="20" r="3.6" />
            <path d="M20.6 20h2.8" />
          </g>
        )}
      </g>

      <Hair style={style} hair={hair} covered={!!look.hat} />
      {look.hat && <HatShape hat={look.hat} color={look.hatColor ?? '#ef4444'} />}
      {/* Seen from behind (walking up): hair or hat covers the whole head. */}
      <g className="pg-back">
        <circle cx="22" cy="18" r="12.6" style={fill(style === 'bald' ? skin : hair)} />
        {look.hat && <HatShape hat={look.hat} color={look.hatColor ?? '#ef4444'} />}
      </g>
    </svg>
  )
}

function Eyes({ face }: { face: Face }) {
  if (face === 'happy')
    return (
      <g className="pg-eyes" fill="none" stroke="#1c1917" strokeWidth="1.6" strokeLinecap="round">
        <path d="M15 21q2-2.6 4 0" />
        <path d="M25 21q2-2.6 4 0" />
      </g>
    )
  return (
    <g className="pg-eyes">
      <ellipse className="pg-eye" cx="17" cy="20" rx="1.7" ry={face === 'calm' ? 1.5 : 2.3} fill="#1c1917" />
      <ellipse className="pg-eye" cx="27" cy="20" rx="1.7" ry={face === 'calm' ? 1.5 : 2.3} fill="#1c1917" />
      <circle cx="17.6" cy="19.2" r="0.6" fill="white" />
      <circle cx="27.6" cy="19.2" r="0.6" fill="white" />
    </g>
  )
}

function Torso({ look }: { look: Look }) {
  const { shirt, accent, pants, outfit } = look
  const shine = <rect x="11" y="29" width="22" height="19" rx="7" fill="white" opacity="0.12" />
  switch (outfit) {
    case 'dress':
      return (
        <>
          <path d="M12 35q0-6 6-6h8q6 0 6 6l4 15H8Z" style={fill(shirt)} />
          <path d="M11 41h22" stroke={accent} strokeWidth="2.5" />
          <circle cx="22" cy="33" r="1.4" style={fill(accent)} />
        </>
      )
    case 'overall':
      return (
        <>
          <rect x="11" y="29" width="22" height="19" rx="7" style={fill(accent)} />
          <rect x="14.5" y="35" width="15" height="13" rx="3" style={fill(pants)} />
          <path d="M15 36l-1.5-6M29 36l1.5-6" stroke={pants} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="16.5" cy="37.5" r="1" fill="#fde68a" />
          <circle cx="27.5" cy="37.5" r="1" fill="#fde68a" />
        </>
      )
    case 'labcoat':
      return (
        <>
          <path d="M10 33q0-4 5-4h14q5 0 5 4v19H10Z" fill="#f8fafc" />
          <path d="M19 29h6l-1 10h-4Z" style={fill(shirt)} />
          <path d="M22 39v13" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="25" y="41" width="5" height="4" rx="1" fill="none" stroke="#cbd5e1" />
          <path d="M26.5 40.5v-2" stroke={shirt} strokeWidth="1.4" />
        </>
      )
    case 'apron':
      return (
        <>
          <rect x="11" y="29" width="22" height="19" rx="7" style={fill(shirt)} />
          <path d="M15 34h14v15q0 2-2 2H17q-2 0-2-2Z" style={fill(accent)} />
          <path d="M15 34q7-6 14 0" fill="none" stroke={accent} strokeWidth="1.6" />
          <rect x="18.5" y="40" width="7" height="4" rx="1" fill="black" opacity="0.08" />
        </>
      )
    case 'jacket':
      return (
        <>
          <rect x="11" y="29" width="22" height="19" rx="7" style={fill(shirt)} />
          <rect x="19.5" y="29.5" width="5" height="18" style={fill(accent)} />
          <path d="M19.5 29.5 17 34l2.5 1.5M24.5 29.5 27 34l-2.5 1.5" style={fill(shirt)} stroke="black" strokeOpacity="0.15" />
          {shine}
        </>
      )
    case 'vest':
      return (
        <>
          <rect x="11" y="29" width="22" height="19" rx="7" style={fill(accent)} />
          <path d="M11 36q0-7 7-7l3 9-2 10h-8ZM33 36q0-7-7-7l-3 9 2 10h8Z" style={fill(shirt)} />
        </>
      )
    case 'hoodie':
      return (
        <>
          <rect x="11" y="29" width="22" height="19" rx="7" style={fill(shirt)} />
          <rect x="15" y="40" width="14" height="5.5" rx="2.5" fill="black" opacity="0.12" />
          <path d="M19.5 30v5M24.5 30v5" stroke={accent} strokeWidth="1.2" strokeLinecap="round" />
          {shine}
        </>
      )
    default:
      return (
        <>
          <rect x="11" y="29" width="22" height="19" rx="7" style={fill(shirt)} />
          <path d="M18 29.5 22 34l4-4.5" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1.6" />
          {shine}
        </>
      )
  }
}

function Hair({ style, hair, covered }: { style: HairStyle; hair: string; covered: boolean }) {
  const f = fill(hair)
  switch (style) {
    case 'bald':
      return <path d="M9.6 21q0-4 2-6M34.4 21q0-4-2-6" stroke={hair} strokeWidth="3" strokeLinecap="round" fill="none" />
    case 'long':
    case 'ponytail':
    case 'pigtails':
      return <path d="M9.4 19C9 10 15 5 22 5s13 5 12.6 14c-3-5-7-7-12.6-7S12.4 14 9.4 19Z" style={f} />
    case 'bob':
      return <path d="M8.6 26C7 12 14 5 22 5s15 7 13.4 21h-3c0-6-1-10-3-12-4 1-10 1-14 0-2 2-3 6-3 12Z" style={f} />
    case 'bun':
      return (
        <>
          {!covered && <circle cx="22" cy="4.5" r="5" style={f} />}
          <path d="M9.4 18C9.4 10 15 5.5 22 5.5S34.6 10 34.6 18c-2.5-4.5-7-6-12.6-6S12 13.5 9.4 18Z" style={f} />
        </>
      )
    case 'spiky':
      return (
        <path d="M9.5 18 8 9l5 2 2-7 4 5 3-6 3 6 4-5 2 7 5-2-1.5 9c-3-4-7.5-6-12.5-6S12.5 14 9.5 18Z" style={f} />
      )
    case 'mohawk':
      return (
        <>
          <path d="M18.5 1.5h7l-.5 13h-6Z" style={f} />
          <path d="M10 19q0-4 2-6M34 19q0-4-2-6" stroke={hair} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      )
    case 'afro':
      return <path d="M8 19c-1-9 5-15 14-15s15 6 14 15c-3-4-8-6-14-6S11 15 8 19Z" style={f} />
    case 'curly':
      return (
        <g style={f}>
          {[
            [12, 12, 4.5],
            [17, 7.5, 5],
            [23, 6, 5.2],
            [29, 8, 5],
            [33, 13, 4.4],
            [10, 17, 3.4],
            [34, 17.5, 3.2],
          ].map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      )
    default:
      return (
        <path
          d="M9.4 18.5C9.2 10.5 15 5.5 22 5.5s12.8 5 12.6 13c-2.2-3.4-5-5.5-8.6-6l-1 3-2-3.2c-6 0-11 2.2-13.6 6.2Z"
          style={f}
        />
      )
  }
}

function HatShape({ hat, color }: { hat: Hat; color: string }) {
  const f = fill(color)
  switch (hat) {
    case 'beanie':
      return (
        <>
          <path d="M9.5 14C10 7 15 3.5 22 3.5S34 7 34.5 14Z" style={f} />
          <rect x="9" y="12" width="26" height="4.5" rx="2.2" style={f} />
          <rect x="9" y="12" width="26" height="4.5" rx="2.2" fill="black" opacity="0.15" />
          <circle cx="22" cy="2.5" r="2.8" fill="#f8fafc" />
        </>
      )
    case 'straw':
      return (
        <>
          <ellipse cx="22" cy="11.5" rx="18.5" ry="4.5" fill="#e9c46a" />
          <path d="M13 11.5c0-6 4-8.5 9-8.5s9 2.5 9 8.5Z" fill="#e9c46a" />
          <path d="M13.2 9.8h17.6" style={{ stroke: color }} strokeWidth="2.4" />
        </>
      )
    case 'beret':
      return (
        <>
          <ellipse cx="20" cy="8.5" rx="13" ry="5.5" style={f} transform="rotate(-10 20 8.5)" />
          <circle cx="21" cy="3" r="1.4" style={f} />
        </>
      )
    case 'guard':
      return (
        <>
          <path d="M9 12.5C9.5 6 15 3 22 3s12.5 3 13 9.5Z" fill="#1e3a5f" />
          <rect x="8.5" y="11" width="27" height="3.5" rx="1.5" style={f} />
          <path d="M11 14.5h22q-1 3.5-11 3.5t-11-3.5Z" fill="#0f172a" />
          <path d="M22 5.5l2.4 1.4v2.8L22 11l-2.4-1.3V6.9Z" fill="#facc15" />
        </>
      )
    case 'hardhat':
      return (
        <>
          <path d="M10 13c0-6 5-10 12-10s12 4 12 10Z" fill="#facc15" />
          <rect x="7.5" y="12" width="29" height="3.5" rx="1.7" fill="#eab308" />
          <path d="M22 3.5v9" stroke="#ca8a04" strokeWidth="2" />
        </>
      )
    default:
      return (
        <>
          <path d="M9.5 13.5C10 7.5 15 4 22 4s12 3.5 12.5 9.5Z" style={f} />
          <path d="M22 13.5h17a3 3 0 0 1-3 3H22Z" style={f} />
          <circle cx="22" cy="9.5" r="2.4" fill="white" opacity="0.9" />
        </>
      )
  }
}
