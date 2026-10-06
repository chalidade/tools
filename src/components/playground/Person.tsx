/*
 * A chibi cartoon person, 44×62, feet at the bottom edge. Every colour comes
 * from a `Look`, so the player, the tool keepers and the townsfolk are all
 * the same drawing dressed differently.
 *
 * Animation hooks (styled in index.css): `.pg-body` bobs, `.pg-leg-*` step and
 * `.pg-arm-*` swing while the sprite has `data-walking`; `data-dir="up"` on the
 * sprite shows the back of the head instead of the face.
 */

export type HairStyle = 'short' | 'long' | 'bun' | 'spiky' | 'curly' | 'cap'

export interface Look {
  skin: string
  hair: string
  style: HairStyle
  shirt: string
  pants: string
  glasses?: boolean
  /** Cap colour, for the `cap` style. */
  cap?: string
  backpack?: string
}

const SKINS = ['#f8d5b8', '#f1c27d', '#e0ac69', '#c68642', '#8d5524']
const HAIRS = ['#2b1d16', '#4a2f20', '#1f1f24', '#7a4a26', '#b7652d', '#d9a441']
const STYLES: HairStyle[] = ['short', 'long', 'bun', 'spiky', 'curly', 'cap']
const PANTS = ['#334155', '#1e3a5f', '#3f3f46', '#4b3a2a', '#365314']
const CAPS = ['#ef4444', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed']

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** A stable look for a seed (a tool slug, a townsperson index), wearing `shirt`. */
export function lookFor(seed: string, shirt: string): Look {
  const h = hash(seed)
  return {
    skin: SKINS[h % SKINS.length],
    hair: HAIRS[(h >>> 3) % HAIRS.length],
    style: STYLES[(h >>> 6) % STYLES.length],
    pants: PANTS[(h >>> 9) % PANTS.length],
    cap: CAPS[(h >>> 12) % CAPS.length],
    glasses: (h >>> 15) % 4 === 0,
    shirt,
  }
}

export const PLAYER_LOOK: Look = {
  skin: '#f1c27d',
  hair: '#2b1d16',
  style: 'cap',
  cap: 'var(--brand-2)',
  shirt: 'var(--brand-1)',
  pants: '#1e293b',
  backpack: '#f59e0b',
}

export function Person({ look, size = 1 }: { look: Look; size?: number }) {
  const { skin, hair, style, shirt, pants } = look
  const f = (fill: string) => ({ fill })
  return (
    <svg viewBox="0 0 44 62" width={44 * size} height={62 * size} className="pg-body overflow-visible">
      {/* Long hair falls behind the body. */}
      {style === 'long' && <path d="M9 20c0 12 1 18 3 22h20c2-4 3-10 3-22Z" style={f(hair)} />}
      {look.backpack && <rect x="8" y="31" width="28" height="15" rx="5" style={f(look.backpack)} />}

      {/* Legs and shoes. */}
      <g className="pg-leg-a">
        <rect x="14" y="45" width="6.5" height="12" rx="3" style={f(pants)} />
        <ellipse cx="17" cy="58.5" rx="4.6" ry="2.6" fill="#27272a" />
      </g>
      <g className="pg-leg-b">
        <rect x="23.5" y="45" width="6.5" height="12" rx="3" style={f(pants)} />
        <ellipse cx="27" cy="58.5" rx="4.6" ry="2.6" fill="#27272a" />
      </g>

      {/* Arms, then the torso over their tops. */}
      <g className="pg-arm-a">
        <rect x="7" y="31" width="6" height="13" rx="3" style={f(shirt)} />
        <circle cx="10" cy="45" r="2.8" style={f(skin)} />
      </g>
      <g className="pg-arm-b">
        <rect x="31" y="31" width="6" height="13" rx="3" style={f(shirt)} />
        <circle cx="34" cy="45" r="2.8" style={f(skin)} />
      </g>
      <rect x="11" y="29" width="22" height="19" rx="7" style={f(shirt)} />
      <rect x="11" y="29" width="22" height="19" rx="7" fill="white" opacity="0.12" />
      <path d="M18 29.5 22 34l4-4.5" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1.6" />

      {/* Head. */}
      <rect x="19" y="26" width="6" height="5" style={f(skin)} />
      <circle cx="22" cy="18" r="12.5" style={f(skin)} />
      <circle cx="9.6" cy="19.5" r="2.4" style={f(skin)} />
      <circle cx="34.4" cy="19.5" r="2.4" style={f(skin)} />

      <g className="pg-face">
        <g className="pg-eyes">
          <ellipse className="pg-eye" cx="17" cy="20" rx="1.7" ry="2.3" fill="#1c1917" />
          <ellipse className="pg-eye" cx="27" cy="20" rx="1.7" ry="2.3" fill="#1c1917" />
        </g>
        <circle cx="14" cy="24.5" r="2" fill="#fb7185" opacity="0.35" />
        <circle cx="30" cy="24.5" r="2" fill="#fb7185" opacity="0.35" />
        <path d="M19.5 25.5q2.5 2.2 5 0" fill="none" stroke="#7c2d12" strokeWidth="1.3" strokeLinecap="round" />
        {look.glasses && (
          <g fill="none" stroke="#18181b" strokeWidth="1.2">
            <circle cx="17" cy="20" r="3.6" />
            <circle cx="27" cy="20" r="3.6" />
            <path d="M20.6 20h2.8" />
          </g>
        )}
      </g>

      <Hair style={style} hair={hair} cap={look.cap} />
      {/* Seen from behind (walking up): hair covers the whole head. */}
      <g className="pg-back">
        <circle cx="22" cy="18" r="12.6" style={f(style === 'cap' ? (look.cap ?? hair) : hair)} />
      </g>
    </svg>
  )
}

function Hair({ style, hair, cap }: { style: HairStyle; hair: string; cap?: string }) {
  const f = { fill: hair }
  switch (style) {
    case 'long':
      return <path d="M9.4 19C9 10 15 5 22 5s13 5 12.6 14c-3-5-7-7-12.6-7S12.4 14 9.4 19Z" style={f} />
    case 'bun':
      return (
        <>
          <circle cx="22" cy="4.5" r="5" style={f} />
          <path d="M9.4 18C9.4 10 15 5.5 22 5.5S34.6 10 34.6 18c-2.5-4.5-7-6-12.6-6S12 13.5 9.4 18Z" style={f} />
        </>
      )
    case 'spiky':
      return (
        <path
          d="M9.5 18 8 9l5 2 2-7 4 5 3-6 3 6 4-5 2 7 5-2-1.5 9c-3-4-7.5-6-12.5-6S12.5 14 9.5 18Z"
          style={f}
        />
      )
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
    case 'cap':
      return (
        <>
          <path d="M9.6 19c0-4 1.4-6 3-7.5h18.8c1.6 1.5 3 3.5 3 7.5-2-3-6-4-12.4-4S11.6 16 9.6 19Z" style={f} />
          <path d="M9.5 13.5C10 7.5 15 4 22 4s12 3.5 12.5 9.5Z" style={{ fill: cap ?? '#ef4444' }} />
          <path d="M22 13.5h17a3 3 0 0 1-3 3H22Z" style={{ fill: cap ?? '#ef4444' }} />
          <circle cx="22" cy="9.5" r="2.4" fill="white" opacity="0.9" />
        </>
      )
    default:
      return (
        <path d="M9.4 18.5C9.2 10.5 15 5.5 22 5.5s12.8 5 12.6 13c-2.2-3.4-5-5.5-8.6-6l-1 3-2-3.2c-6 0-11 2.2-13.6 6.2Z" style={f} />
      )
  }
}
