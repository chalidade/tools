// Built-in twibbon frames for the events people search for most (17 Agustus,
// Ramadan, Hari Guru, wisuda, MPLS). Each is drawn on a canvas from code, so
// there is no image to fetch and the texts stay editable. Every frame is
// 1080×1080 with a round hole; the photo is drawn behind it.

import { tr } from '@/lib/i18n'
import { toHijri } from '../hijriah/hijri'

export type TemplateId = '17-agustus' | 'ramadan' | 'hari-guru' | 'wisuda' | 'mpls'

export interface TemplateText {
  top: string
  title: string
  subtitle: string
  name: string
}

export interface Hole {
  x: number
  y: number
  w: number
  h: number
}

export const SIZE = 1080
const CX = 540
const CY = 495
const R = 325
export const TEMPLATE_HOLE: Hole = { x: CX - R, y: CY - R, w: 2 * R, h: 2 * R }

/** The year an event falls in next: after its month has passed, next year's. */
function eventYear(month: number, now = new Date()) {
  return now.getMonth() + 1 > month ? now.getFullYear() + 1 : now.getFullYear()
}

export const TEMPLATES: { id: TemplateId; label: [string, string]; slug: string }[] = [
  { id: '17-agustus', label: ['17 Agustus', '17 August'], slug: 'twibbon-17-agustus' },
  { id: 'ramadan', label: ['Ramadan', 'Ramadan'], slug: 'twibbon-ramadan' },
  { id: 'hari-guru', label: ['Hari Guru', "Teachers' Day"], slug: 'twibbon-hari-guru' },
  { id: 'wisuda', label: ['Wisuda', 'Graduation'], slug: 'twibbon-wisuda' },
  { id: 'mpls', label: ['MPLS', 'School orientation'], slug: 'twibbon-mpls' },
]

/** Starting texts; built when asked for, so they follow the current language. */
export function defaultText(id: TemplateId): TemplateText {
  switch (id) {
    case '17-agustus': {
      const year = eventYear(8)
      return {
        top: tr(`DIRGAHAYU KE-${year - 1945}`, `HAPPY ${year - 1945}TH`),
        title: tr('Republik Indonesia', 'Independence Day'),
        subtitle: tr(`17 Agustus ${year}`, `17 August ${year} · Indonesia`),
        name: tr('Nama kamu', 'Your name'),
      }
    }
    case 'ramadan': {
      const h = toHijri(new Date())
      const year = h.month > 9 ? h.year + 1 : h.year
      return {
        top: `RAMADAN ${year} H`,
        title: 'Marhaban ya Ramadan',
        subtitle: tr('Selamat menunaikan ibadah puasa', 'Wishing you a blessed fast'),
        name: tr('Nama kamu', 'Your name'),
      }
    }
    case 'hari-guru':
      return {
        top: tr(`25 NOVEMBER ${eventYear(11)}`, `25 NOVEMBER ${eventYear(11)}`),
        title: tr('Selamat Hari Guru', "Happy Teachers' Day"),
        subtitle: tr('Terima kasih, Guruku', 'Thank you, teacher'),
        name: tr('Nama kamu', 'Your name'),
      }
    case 'wisuda':
      return {
        top: `CLASS OF ${new Date().getFullYear()}`,
        title: tr('Selamat Wisuda', 'Happy Graduation'),
        subtitle: tr('Semoga ilmunya bermanfaat', 'On to the next chapter'),
        name: tr('Nama wisudawan', 'Graduate name'),
      }
    case 'mpls':
      return {
        top: `MPLS ${eventYear(8)}`,
        title: tr('Siap Belajar!', 'Ready to Learn!'),
        subtitle: tr('Masa Pengenalan Lingkungan Sekolah', 'New student orientation'),
        name: tr('Nama sekolah', 'School name'),
      }
  }
}

interface Style {
  background: (c: CanvasRenderingContext2D) => void
  /** Drawn over the frame after the hole is cut (e.g. a cap on the ring). */
  over?: (c: CanvasRenderingContext2D) => void
  ring: (c: CanvasRenderingContext2D) => void
  top: string
  title: string
  subtitle: string
  pill: string
  pillText: string
  /** A card behind the bottom texts. */
  card?: string
}

const FONT = 'Geist, ui-sans-serif, system-ui, sans-serif'

/** Small seeded random numbers, so the confetti sits in the same place on every redraw. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

function dots(c: CanvasRenderingContext2D, colors: string[], n: number, seed: number, avoidHole = true) {
  const rnd = seeded(seed)
  for (let i = 0; i < n; i++) {
    const x = rnd() * SIZE
    const y = rnd() * 860
    const r = 3 + rnd() * 7
    if (avoidHole && Math.hypot(x - CX, y - CY) < R + 40) continue
    if (y > 70 && y < 145 && x > 220 && x < 860) continue // the top text
    c.fillStyle = colors[i % colors.length]
    c.globalAlpha = 0.5 + rnd() * 0.5
    c.beginPath()
    c.arc(x, y, r, 0, Math.PI * 2)
    c.fill()
  }
  c.globalAlpha = 1
}

function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  c.fillStyle = color
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 ? r * 0.42 : r
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  c.closePath()
  c.fill()
}

function ring(color: string, width: number, outer?: { color: string; width: number; dash?: number[] }) {
  return (c: CanvasRenderingContext2D) => {
    c.strokeStyle = color
    c.lineWidth = width
    c.beginPath()
    c.arc(CX, CY, R + width / 2, 0, Math.PI * 2)
    c.stroke()
    if (outer) {
      c.strokeStyle = outer.color
      c.lineWidth = outer.width
      c.setLineDash(outer.dash ?? [])
      c.beginPath()
      c.arc(CX, CY, R + width + 10 + outer.width / 2, 0, Math.PI * 2)
      c.stroke()
      c.setLineDash([])
    }
  }
}

const STYLES: Record<TemplateId, Style> = {
  '17-agustus': {
    background: (c) => {
      c.fillStyle = '#ffffff'
      c.fillRect(0, 0, SIZE, SIZE)
      c.fillStyle = '#ce1126'
      c.beginPath()
      c.moveTo(0, 0)
      c.lineTo(SIZE, 0)
      c.lineTo(SIZE, 430)
      c.bezierCurveTo(780, 560, 330, 420, 0, 580)
      c.closePath()
      c.fill()
      // Bunting along the top.
      for (let x = 0, i = 0; x < SIZE; x += 72, i++) {
        c.fillStyle = i % 2 ? '#ffffff' : '#8e0c1f'
        c.beginPath()
        c.moveTo(x, 0)
        c.lineTo(x + 72, 0)
        c.lineTo(x + 36, 56)
        c.closePath()
        c.fill()
      }
      dots(c, ['#ffffff', '#f6c4c9'], 40, 17)
    },
    ring: ring('#ffffff', 18, { color: '#ce1126', width: 6 }),
    top: '#ffffff',
    title: '#ce1126',
    subtitle: '#3f3f46',
    pill: '#ce1126',
    pillText: '#ffffff',
  },
  ramadan: {
    background: (c) => {
      const g = c.createLinearGradient(0, 0, 0, SIZE)
      g.addColorStop(0, '#0d4433')
      g.addColorStop(1, '#05231a')
      c.fillStyle = g
      c.fillRect(0, 0, SIZE, SIZE)
      const rnd = seeded(9)
      for (let i = 0; i < 26; i++) {
        const x = rnd() * SIZE
        const y = rnd() * 820
        if (Math.hypot(x - CX, y - CY) < R + 50) continue
        star(c, x, y, 5 + rnd() * 9, i % 3 ? '#d4af37' : '#f3e7b3')
      }
      // Crescent: a gold disc with an offset disc taken out, on its own layer.
      const moon = document.createElement('canvas')
      moon.width = moon.height = 240
      const m = moon.getContext('2d')!
      m.fillStyle = '#d4af37'
      m.beginPath()
      m.arc(120, 120, 95, 0, Math.PI * 2)
      m.fill()
      m.globalCompositeOperation = 'destination-out'
      m.beginPath()
      m.arc(160, 95, 85, 0, Math.PI * 2)
      m.fill()
      c.drawImage(moon, 40, 110)
      star(c, 225, 175, 22, '#d4af37')
      // A lantern hanging on the right.
      c.strokeStyle = '#d4af37'
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(950, 0)
      c.lineTo(950, 150)
      c.stroke()
      c.fillStyle = '#d4af37'
      c.beginPath()
      c.moveTo(920, 165)
      c.lineTo(980, 165)
      c.lineTo(950, 145)
      c.closePath()
      c.fill()
      c.beginPath()
      c.roundRect(915, 165, 70, 100, 18)
      c.fill()
      c.fillStyle = '#f9e9a6'
      c.beginPath()
      c.roundRect(930, 180, 40, 70, 12)
      c.fill()
      c.fillStyle = '#d4af37'
      c.beginPath()
      c.moveTo(920, 265)
      c.lineTo(980, 265)
      c.lineTo(950, 292)
      c.closePath()
      c.fill()
    },
    ring: ring('#d4af37', 14, { color: '#d4af37', width: 3, dash: [2, 12] }),
    top: '#d4af37',
    title: '#f3d97a',
    subtitle: '#e8e2c8',
    pill: '#d4af37',
    pillText: '#05231a',
  },
  'hari-guru': {
    background: (c) => {
      c.fillStyle = '#fff7e6'
      c.fillRect(0, 0, SIZE, SIZE)
      c.fillStyle = '#fde68a'
      c.beginPath()
      c.arc(40, 80, 230, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#bfdbfe'
      c.beginPath()
      c.arc(1060, 700, 260, 0, Math.PI * 2)
      c.fill()
      dots(c, ['#1e3a8a', '#f59e0b', '#ef4444'], 46, 25)
      // A pencil across the lower left.
      c.save()
      c.translate(150, 760)
      c.rotate(-Math.PI / 4)
      c.fillStyle = '#f59e0b'
      c.fillRect(-110, -22, 190, 44)
      c.fillStyle = '#fb7185'
      c.fillRect(-140, -22, 30, 44)
      c.fillStyle = '#fcd9b6'
      c.beginPath()
      c.moveTo(80, -22)
      c.lineTo(130, 0)
      c.lineTo(80, 22)
      c.closePath()
      c.fill()
      c.fillStyle = '#1f2937'
      c.beginPath()
      c.moveTo(115, -7)
      c.lineTo(130, 0)
      c.lineTo(115, 7)
      c.closePath()
      c.fill()
      c.restore()
    },
    ring: ring('#1e3a8a', 14, { color: '#f59e0b', width: 6, dash: [18, 12] }),
    top: '#1e3a8a',
    title: '#1e3a8a',
    subtitle: '#92400e',
    pill: '#1e3a8a',
    pillText: '#ffffff',
  },
  wisuda: {
    background: (c) => {
      c.fillStyle = '#0e1a3a'
      c.fillRect(0, 0, SIZE, SIZE)
      c.strokeStyle = '#d4af37'
      c.lineWidth = 3
      c.strokeRect(28, 28, SIZE - 56, SIZE - 56)
      c.lineWidth = 1
      c.strokeRect(40, 40, SIZE - 80, SIZE - 80)
      dots(c, ['#d4af37', '#f3e7b3', '#ffffff'], 60, 33)
    },
    over: (c) => {
      // A mortarboard resting on the ring, top right.
      c.save()
      c.translate(CX + 245, CY - 250)
      c.rotate(0.28)
      c.fillStyle = '#111827'
      c.beginPath()
      c.moveTo(-70, 12)
      c.lineTo(70, 12)
      c.lineTo(58, 62)
      c.quadraticCurveTo(0, 80, -58, 62)
      c.closePath()
      c.fill()
      c.fillStyle = '#1f2937'
      c.strokeStyle = '#d4af37'
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(0, -48)
      c.lineTo(130, 0)
      c.lineTo(0, 48)
      c.lineTo(-130, 0)
      c.closePath()
      c.fill()
      c.stroke()
      c.strokeStyle = '#d4af37'
      c.lineWidth = 5
      c.beginPath()
      c.moveTo(0, 0)
      c.lineTo(100, 8)
      c.lineTo(104, 80)
      c.stroke()
      c.fillStyle = '#d4af37'
      c.beginPath()
      c.roundRect(94, 76, 20, 34, 6)
      c.fill()
      c.beginPath()
      c.arc(0, 0, 9, 0, Math.PI * 2)
      c.fill()
      c.restore()
    },
    ring: ring('#d4af37', 14, { color: '#d4af37', width: 2 }),
    top: '#d4af37',
    title: '#ffffff',
    subtitle: '#c9d3f0',
    pill: '#d4af37',
    pillText: '#0e1a3a',
  },
  mpls: {
    background: (c) => {
      c.fillStyle = '#0284c7'
      c.fillRect(0, 0, SIZE, SIZE)
      c.fillStyle = '#38bdf8'
      for (let i = -SIZE; i < SIZE * 2; i += 120) {
        c.beginPath()
        c.moveTo(i, 0)
        c.lineTo(i + 50, 0)
        c.lineTo(i + 50 - SIZE, SIZE)
        c.lineTo(i - SIZE, SIZE)
        c.closePath()
        c.globalAlpha = 0.35
        c.fill()
      }
      c.globalAlpha = 1
      const rnd = seeded(41)
      for (let i = 0; i < 14; i++) {
        const x = rnd() * SIZE
        const y = rnd() * 820
        if (Math.hypot(x - CX, y - CY) < R + 50) continue
        star(c, x, y, 10 + rnd() * 16, i % 2 ? '#facc15' : '#ffffff')
      }
    },
    ring: ring('#facc15', 18, { color: '#ffffff', width: 5 }),
    top: '#ffffff',
    title: '#0369a1',
    subtitle: '#334155',
    pill: '#facc15',
    pillText: '#0c4a6e',
    card: '#ffffff',
  },
}

/** Draws text centred at y, shrinking the font until it fits the width. */
function fitText(c: CanvasRenderingContext2D, text: string, y: number, weight: number, size: number, color: string, maxWidth = 940, spacing = 0) {
  if (!text) return
  let s = size
  const set = () => {
    c.font = `${weight} ${s}px ${FONT}`
    if ('letterSpacing' in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`
  }
  set()
  while (s > 14 && c.measureText(text).width > maxWidth) {
    s -= 2
    set()
  }
  c.fillStyle = color
  c.textAlign = 'center'
  c.textBaseline = 'alphabetic'
  c.fillText(text, CX, y)
  if ('letterSpacing' in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
}

/** The frame for a template, with its texts, as a 1080×1080 canvas with a transparent hole. */
export function drawTemplate(id: TemplateId, text: TemplateText, canvas = document.createElement('canvas')) {
  const st = STYLES[id]
  canvas.width = canvas.height = SIZE
  const c = canvas.getContext('2d')!
  c.clearRect(0, 0, SIZE, SIZE)
  st.background(c)
  if (st.card) {
    c.fillStyle = st.card
    c.beginPath()
    c.roundRect(50, 852, SIZE - 100, 210, 36)
    c.fill()
  }
  c.globalCompositeOperation = 'destination-out'
  c.beginPath()
  c.arc(CX, CY, R, 0, Math.PI * 2)
  c.fill()
  c.globalCompositeOperation = 'source-over'
  st.ring(c)
  st.over?.(c)

  fitText(c, text.top, 122, 600, 40, st.top, 700, 6)
  fitText(c, text.title, 912, 700, 70, st.title)
  fitText(c, text.subtitle, 966, 500, 34, st.subtitle)
  if (text.name) {
    c.font = `600 30px ${FONT}`
    const w = Math.min(Math.max(c.measureText(text.name).width + 56, 180), 900)
    c.fillStyle = st.pill
    c.beginPath()
    c.roundRect(CX - w / 2, 1000, w, 52, 26)
    c.fill()
    fitText(c, text.name, 1036, 600, 30, st.pillText, w - 40)
  }
  return canvas
}
