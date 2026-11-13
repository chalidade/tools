import { canvasBlob, newCanvas } from '@/lib/image'

export interface MedicalCard {
  name: string
  blood: string
  allergies: string
  medications: string
  conditions: string
  contactName: string
  contactPhone: string
  note: string
}

export const EMPTY_CARD: MedicalCard = { name: '', blood: '', allergies: '', medications: '', conditions: '', contactName: '', contactPhone: '', note: '' }

export const BLOOD_TYPES = ['A', 'B', 'AB', 'O']

export interface ScreenSize {
  id: string
  label: [string, string]
  w: number
  h: number
}

export const SIZES: ScreenSize[] = [
  { id: 'std', label: ['HP umum (1080×2340)', 'Typical phone (1080×2340)'], w: 1080, h: 2340 },
  { id: 'tall', label: ['HP tinggi (1080×2400)', 'Tall phone (1080×2400)'], w: 1080, h: 2400 },
  { id: 'iphone', label: ['iPhone (1170×2532)', 'iPhone (1170×2532)'], w: 1170, h: 2532 },
  { id: 'max', label: ['iPhone Pro Max (1290×2796)', 'iPhone Pro Max (1290×2796)'], w: 1290, h: 2796 },
]

/** Breaks `text` into lines no wider than `maxWidth` using the context's current font. */
export function wrapLines(measure: (s: string) => number, text: string, maxWidth: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (line && measure(next) > maxWidth) {
        out.push(line)
        line = word
      } else line = next
    }
    out.push(line)
  }
  return out.filter((l, i, a) => l || (i > 0 && i < a.length - 1))
}

export interface Labels {
  title: string
  blood: string
  allergies: string
  medications: string
  conditions: string
  contact: string
  note: string
}

/**
 * Draws the card as a lock-screen wallpaper. The clock and notifications cover
 * roughly the top 38% and the bottom 10%, so the card sits in the band between.
 */
export function drawWallpaper(card: MedicalCard, size: ScreenSize, labels: Labels): HTMLCanvasElement {
  const { w, h } = size
  const c = newCanvas(w, h)
  const g = c.getContext('2d')!
  g.fillStyle = '#0b0b0f'
  g.fillRect(0, 0, w, h)

  const pad = w * 0.06
  const innerW = w - pad * 2
  const top = h * 0.4
  const bottom = h * 0.9
  const u = w / 1080
  const font = (px: number, weight = 400) => `${weight} ${Math.round(px * u)}px system-ui, -apple-system, "Segoe UI", sans-serif`

  // Card body
  g.fillStyle = '#fafafa'
  g.beginPath()
  g.roundRect(pad, top, innerW, bottom - top, 40 * u)
  g.fill()
  g.fillStyle = '#dc2626'
  g.beginPath()
  g.roundRect(pad, top, innerW, 96 * u, [40 * u, 40 * u, 0, 0])
  g.fill()
  g.fillStyle = '#fff'
  g.font = font(44, 700)
  g.textBaseline = 'middle'
  g.fillText(labels.title, pad + 36 * u, top + 48 * u)

  let y = top + 96 * u + 36 * u
  const x = pad + 36 * u
  const textW = innerW - 72 * u
  g.textBaseline = 'alphabetic'

  const measure = (s: string) => g.measureText(s).width
  const rows: [string, string][] = [
    [labels.blood, card.blood],
    [labels.allergies, card.allergies],
    [labels.medications, card.medications],
    [labels.conditions, card.conditions],
    [labels.contact, [card.contactName, card.contactPhone].filter(Boolean).join(' · ')],
    [labels.note, card.note],
  ]
  const nameLine = card.name.trim()
  if (nameLine) {
    g.fillStyle = '#111'
    g.font = font(56, 700)
    for (const l of wrapLines(measure, nameLine, textW).slice(0, 2)) {
      y += 56 * u
      g.fillText(l, x, y)
    }
    y += 20 * u
  }
  const filled = rows.filter(([, v]) => v.trim())
  // Shrink the text until everything fits between the clock and the bottom edge.
  for (let scale = 1; scale >= 0.4; scale -= 0.05) {
    let need = 0
    for (const [, v] of filled) {
      g.font = font(40 * scale, 600)
      need += 34 * scale * u + wrapLines(measure, v, textW).length * 50 * scale * u + 22 * scale * u
    }
    if (y + need <= bottom - 30 * u || scale <= 0.45) {
      for (const [label, v] of filled) {
        g.fillStyle = '#b91c1c'
        g.font = font(26 * scale, 700)
        y += 34 * scale * u
        g.fillText(label.toUpperCase(), x, y)
        g.fillStyle = '#111'
        g.font = font(40 * scale, 600)
        for (const l of wrapLines(measure, v, textW)) {
          y += 50 * scale * u
          if (y > bottom - 20 * u) break
          g.fillText(l, x, y)
        }
        y += 22 * scale * u
      }
      break
    }
  }
  return c
}

export const wallpaperBlob = (card: MedicalCard, size: ScreenSize, labels: Labels) => canvasBlob(drawWallpaper(card, size, labels))
