import { parseNote, pc } from '@/lib/music'

/*
 * Practice material: a few public-domain tunes, generated scales, and any
 * MIDI file the visitor opens (parsed here, in the browser). Everything ends
 * up as the same list of timed notes; practice walks it in "steps" (notes
 * that start together, e.g. a chord).
 */

export interface Note {
  /** Start, seconds. */
  t: number
  /** Length, seconds. */
  d: number
  midi: number
  velocity: number
  /** MIDI track (0 for built-in songs) — lets the player pick one hand. */
  track: number
}

export interface Song {
  id: string
  title: string
  by: string
  /** English title / composer line, where it differs from the Indonesian one. */
  en?: { title: string; by: string }
  notes: Note[]
  /** Track names for an imported file, when it has more than one. */
  tracks?: { index: number; name: string; count: number }[]
}

/** "E5" → 76; "R" (rest) → null. */
function midiOf(name: string): number | null {
  if (name === 'R') return null
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name)
  if (!m) throw new Error(`bad note ${name}`)
  return parseNote(m[1])! + 12 * (Number(m[2]) + 1)
}

/** "C4 C4 G4:2 R:1" (beats; default 1) at a tempo → notes. */
function melody(bpm: number, text: string): Note[] {
  const beat = 60 / bpm
  const notes: Note[] = []
  let t = 0
  for (const token of text.trim().split(/\s+/)) {
    if (token === '|') continue
    const [name, len] = token.split(':')
    const d = (len ? Number(len) : 1) * beat
    const midi = midiOf(name)
    if (midi !== null) notes.push({ t, d: d * 0.95, midi, velocity: 0.75, track: 0 })
    t += d
  }
  return notes
}

/** Bach's C-major prelude figure: each bar's five notes as 1 2 3 4 5 3 4 5, twice. */
function prelude(bpm: number, bars: string[]): Note[] {
  const text = bars
    .map((bar) => {
      const [a, b, c, d, e] = bar.split(' ').map((n) => `${n}:0.5`)
      const half = [a, b, c, d, e, c, d, e].join(' ')
      return `${half} ${half}`
    })
    .join(' ')
  return melody(bpm, text)
}

export const SONGS: Song[] = [
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle Little Star',
    by: 'Lagu rakyat / folk',
    en: { title: 'Twinkle Twinkle Little Star', by: 'Folk song' },
    notes: melody(
      100,
      `C4 C4 G4 G4 A4 A4 G4:2 | F4 F4 E4 E4 D4 D4 C4:2 | G4 G4 F4 F4 E4 E4 D4:2 | G4 G4 F4 F4 E4 E4 D4:2
       C4 C4 G4 G4 A4 A4 G4:2 | F4 F4 E4 E4 D4 D4 C4:2`,
    ),
  },
  {
    id: 'ode',
    title: 'Ode to Joy',
    by: 'L. van Beethoven',
    notes: melody(
      110,
      `E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2 | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2
       D4 D4 E4 C4 | D4 E4:0.5 F4:0.5 E4 C4 | D4 E4:0.5 F4:0.5 E4 D4 | C4 D4 G3:2
       E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2`,
    ),
  },
  {
    id: 'birthday',
    title: 'Happy Birthday',
    by: 'M. & P. Hill',
    notes: melody(
      100,
      `G4:0.75 G4:0.25 A4 G4 C5 B4:2 | G4:0.75 G4:0.25 A4 G4 D5 C5:2
       G4:0.75 G4:0.25 G5 E5 C5 B4 A4:2 | F5:0.75 F5:0.25 E5 C5 D5 C5:2`,
    ),
  },
  {
    id: 'jingle',
    title: 'Jingle Bells',
    by: 'J. Pierpont',
    notes: melody(
      120,
      `E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:0.5 | E4:4 | F4 F4 F4:1.5 F4:0.5 | F4 E4 E4 E4:0.5 E4:0.5
       E4 D4 D4 E4 | D4:2 G4:2 | E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:0.5 | E4:4
       F4 F4 F4 F4 | F4 E4 E4 E4:0.5 E4:0.5 | G4 G4 F4 D4 | C4:4`,
    ),
  },
  {
    id: 'fur-elise',
    title: 'Für Elise (bagian awal)',
    by: 'L. van Beethoven',
    en: { title: 'Für Elise (opening)', by: 'L. van Beethoven' },
    notes: melody(
      150,
      `E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 | C4:0.5 E4:0.5 A4:0.5 B4:1.5
       E4:0.5 G#4:0.5 B4:0.5 C5:1.5 | E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5
       C4:0.5 E4:0.5 A4:0.5 B4:1.5 | E4:0.5 C5:0.5 B4:0.5 A4:3`,
    ),
  },
  {
    id: 'canon',
    title: 'Canon in D (melodi)',
    by: 'J. Pachelbel',
    en: { title: 'Canon in D (melody)', by: 'J. Pachelbel' },
    notes: melody(70, `F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 | D5:2 C#5:2 B4:2 A4:2 G4:2 F#4:2 G4:2 E4:2`),
  },
  {
    id: 'prelude',
    title: 'Prelude in C, BWV 846 (birama 1–8)',
    by: 'J. S. Bach',
    en: { title: 'Prelude in C, BWV 846 (bars 1–8)', by: 'J. S. Bach' },
    notes: prelude(66, [
      'C4 E4 G4 C5 E5',
      'C4 D4 A4 D5 F5',
      'B3 D4 G4 D5 F5',
      'C4 E4 G4 C5 E5',
      'C4 E4 A4 E5 A5',
      'C4 D4 F#4 A4 D5',
      'B3 D4 G4 D5 G5',
      'B3 C4 E4 G4 C5',
    ]),
  },
]

export const SCALES = [
  { id: 'major', label: ['Mayor', 'Major'], steps: [0, 2, 4, 5, 7, 9, 11, 12] },
  { id: 'minor', label: ['Minor natural', 'Natural minor'], steps: [0, 2, 3, 5, 7, 8, 10, 12] },
  { id: 'harmonic', label: ['Minor harmonis', 'Harmonic minor'], steps: [0, 2, 3, 5, 7, 8, 11, 12] },
  { id: 'pentatonic', label: ['Pentatonik mayor', 'Major pentatonic'], steps: [0, 2, 4, 7, 9, 12] },
] as const

/** A scale up and back down from the root near middle C, as a song. */
export function scaleSong(root: number, scaleId: string, bpm = 90): Song {
  const scale = SCALES.find((s) => s.id === scaleId) ?? SCALES[0]
  const base = 60 + pc(root) - (pc(root) > 6 ? 12 : 0)
  const up = scale.steps.map((s) => base + s)
  const seq = [...up, ...up.slice(0, -1).reverse()]
  const beat = 60 / bpm
  return {
    id: `scale-${root}-${scaleId}`,
    title: '',
    by: '',
    notes: seq.map((midi, i) => ({ t: i * beat, d: beat * 0.9, midi, velocity: 0.75, track: 0 })),
  }
}

/* ---- Standard MIDI File reader ---- */

/** Parses a .mid file (format 0 or 1) into timed notes, honouring tempo changes. */
export function parseMidi(buf: ArrayBuffer, name: string): Song {
  const v = new DataView(buf)
  let p = 0
  const str = (n: number) => String.fromCharCode(...new Uint8Array(buf, p, n))
  if (str(4) !== 'MThd') throw new Error('not a MIDI file')
  const headerLen = v.getUint32(4)
  const trackCount = v.getUint16(10)
  const division = v.getUint16(12)
  if (division & 0x8000) throw new Error('SMPTE timing is not supported')
  p = 8 + headerLen

  type Raw = { tick: number; kind: 'on' | 'off' | 'tempo'; midi?: number; velocity?: number; track: number; tempo?: number; ch?: number }
  const events: Raw[] = []
  const names: string[] = []

  for (let tr = 0; tr < trackCount && p < buf.byteLength; tr++) {
    if (str(4) !== 'MTrk') break
    const len = v.getUint32(p + 4)
    p += 8
    const end = p + len
    let tick = 0
    let status = 0
    const varint = () => {
      let n = 0
      for (;;) {
        const b = v.getUint8(p++)
        n = (n << 7) | (b & 0x7f)
        if (!(b & 0x80)) return n
      }
    }
    while (p < end) {
      tick += varint()
      let b = v.getUint8(p)
      if (b & 0x80) {
        status = b
        p++
      } else b = status // running status
      const type = status & 0xf0
      if (status === 0xff) {
        const meta = v.getUint8(p++)
        const n = varint()
        if (meta === 0x51 && n === 3) events.push({ tick, kind: 'tempo', tempo: (v.getUint8(p) << 16) | (v.getUint8(p + 1) << 8) | v.getUint8(p + 2), track: tr })
        if (meta === 0x03) names[tr] = new TextDecoder().decode(new Uint8Array(buf, p, n))
        p += n
      } else if (status === 0xf0 || status === 0xf7) {
        p += varint()
      } else if (type === 0x90 || type === 0x80) {
        const midi = v.getUint8(p++)
        const vel = v.getUint8(p++)
        const on = type === 0x90 && vel > 0
        events.push({ tick, kind: on ? 'on' : 'off', midi, velocity: vel / 127, track: tr, ch: status & 0x0f })
      } else if (type === 0xc0 || type === 0xd0) p += 1
      else p += 2
    }
    p = end
  }

  // Ticks → seconds through the tempo map (tempo events from any track apply to all).
  events.sort((a, b) => a.tick - b.tick || (a.kind === 'tempo' ? -1 : 0))
  let usPerQuarter = 500000
  let lastTick = 0
  let seconds = 0
  const open = new Map<string, { t: number; velocity: number }>()
  const notes: Note[] = []
  for (const e of events) {
    seconds += ((e.tick - lastTick) / division) * (usPerQuarter / 1e6)
    lastTick = e.tick
    if (e.kind === 'tempo') {
      usPerQuarter = e.tempo!
      continue
    }
    if (e.ch === 9) continue // percussion channel: not piano notes
    const key = `${e.track}:${e.ch}:${e.midi}`
    if (e.kind === 'on') {
      const prev = open.get(key)
      if (prev) notes.push({ t: prev.t, d: seconds - prev.t, midi: e.midi!, velocity: prev.velocity, track: e.track })
      open.set(key, { t: seconds, velocity: e.velocity! })
    } else {
      const start = open.get(key)
      if (!start) continue
      open.delete(key)
      notes.push({ t: start.t, d: Math.max(0.05, seconds - start.t), midi: e.midi!, velocity: start.velocity, track: e.track })
    }
  }
  notes.sort((a, b) => a.t - b.t || a.midi - b.midi)
  if (notes.length === 0) throw new Error('no notes')
  // Start at the first note, not after a silent count-in.
  const first = notes[0].t
  for (const n of notes) n.t -= first

  const counts = new Map<number, number>()
  for (const n of notes) counts.set(n.track, (counts.get(n.track) ?? 0) + 1)
  const tracks = [...counts]
    .sort((a, b) => a[0] - b[0])
    .map(([index, count]) => ({ index, count, name: names[index]?.trim() || `Track ${index + 1}` }))
  return { id: `midi-${name}`, title: name.replace(/\.midi?$/i, ''), by: 'MIDI', notes, tracks: tracks.length > 1 ? tracks : undefined }
}

export interface Step {
  t: number
  notes: number[]
}

/** Groups notes that start together (within 40 ms) into one step to press. */
export function stepsOf(notes: Note[]): Step[] {
  const steps: Step[] = []
  for (const n of notes) {
    const last = steps[steps.length - 1]
    if (last && n.t - last.t < 0.04) {
      if (!last.notes.includes(n.midi)) last.notes.push(n.midi)
    } else steps.push({ t: n.t, notes: [n.midi] })
  }
  return steps
}

/** Lowest and highest note, to fit the keyboard to a song. */
export const rangeOf = (notes: Note[]) => [Math.min(...notes.map((n) => n.midi)), Math.max(...notes.map((n) => n.midi))] as const
