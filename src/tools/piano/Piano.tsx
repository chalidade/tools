import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Piano as PianoIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { SHARPS, noteName, pc } from '@/lib/music'
import { useLang, useT } from '@/lib/i18n'
import { CHORD_TYPES } from '@/tools/chords/theory'
import { Practice, type PracticeHost } from './Practice'
import { PianoSynth, VOICES, type Voice } from './sound'

type Labels = 'keys' | 'notes' | 'solfa' | 'none'

const SOLFA = ['Do', 'Di', 'Re', 'Ri', 'Mi', 'Fa', 'Fi', 'Sol', 'Si', 'La', 'Li', 'Si']
const BLACK = new Set([1, 3, 6, 8, 10])
const LOW = 21 // A0
const HIGH = 108 // C8
/** The 52 white keys of an 88-key piano. */
const WHITES = Array.from({ length: HIGH - LOW + 1 }, (_, i) => LOW + i).filter((m) => !BLACK.has(pc(m)))
const whiteIndex = (m: number) => WHITES.findIndex((w) => w >= m)

// Two rows of the computer keyboard, laid out like piano keys (the row
// above each letter row plays the black keys). Offsets in semitones.
const LOWER: [string, number][] = [
  ['KeyZ', 0], ['KeyS', 1], ['KeyX', 2], ['KeyD', 3], ['KeyC', 4], ['KeyV', 5], ['KeyG', 6], ['KeyB', 7],
  ['KeyH', 8], ['KeyN', 9], ['KeyJ', 10], ['KeyM', 11], ['Comma', 12], ['KeyL', 13], ['Period', 14],
  ['Semicolon', 15], ['Slash', 16],
]
const UPPER: [string, number][] = [
  ['KeyQ', 12], ['Digit2', 13], ['KeyW', 14], ['Digit3', 15], ['KeyE', 16], ['KeyR', 17], ['Digit5', 18],
  ['KeyT', 19], ['Digit6', 20], ['KeyY', 21], ['Digit7', 22], ['KeyU', 23], ['KeyI', 24], ['Digit9', 25],
  ['KeyO', 26], ['Digit0', 27], ['KeyP', 28], ['BracketLeft', 29], ['Equal', 30], ['BracketRight', 31],
]
const KEYMAP = new Map([...LOWER, ...UPPER])
const keyLabel = (code: string) =>
  ({ Comma: ',', Period: '.', Semicolon: ';', Slash: '/', BracketLeft: '[', BracketRight: ']', Equal: '=' })[code] ??
  code.replace(/^(Key|Digit)/, '')

/** "C", "Am7", "G/B"… for the notes held, or null when they are not a known chord. */
function chordName(notes: number[]): string | null {
  if (notes.length < 3) return null
  const classes = [...new Set(notes.map(pc))]
  const bass = pc(Math.min(...notes))
  for (const root of classes) {
    for (const type of CHORD_TYPES) {
      const tones = new Set(type.intervals.map((i) => pc(root + i)))
      if (tones.size === classes.length && classes.every((c) => tones.has(c)))
        return SHARPS[root] + type.suffix + (bass !== root ? `/${SHARPS[bass]}` : '')
    }
  }
  return null
}

/** Octaves shown (7 = the full 88). A window of n octaves is 7n+1 white keys, C to C. */
const ZOOMS = [1, 2, 3, 4, 5, 7] as const
const widthOf = (zoom: number) => (zoom >= 7 ? WHITES.length : zoom * 7 + 1)

export default function Piano() {
  const t = useT()
  const lang = useLang()
  // Phones start on one octave from middle C; wider screens on more.
  const [zoom, setZoom] = useState(() => (window.innerWidth < 640 ? 1 : window.innerWidth < 1100 ? 2 : 3))
  const [first, setFirst] = useState(() => whiteIndex(window.innerWidth < 640 ? 60 : 48))
  const [pressed, setPressed] = useState<number[]>([])
  const [marks, setMarks] = useState<{ target: number[]; wrong: number | null; demo: number[] }>({ target: [], wrong: null, demo: [] })
  const [labels, setLabels] = useState<Labels>('notes')
  const [voice, setVoice] = useState<Voice>('grand')
  const [pedal, setPedal] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [midiInfo, setMidiInfo] = useState('')

  const synthRef = useRef<PianoSynth | null>(null)
  const held = useRef(new Map<string, number>()) // source (pointer id, key code, midi) → note
  const listeners = useRef(new Set<(midi: number) => void>())

  const count = widthOf(zoom)
  const start = Math.max(0, Math.min(first, WHITES.length - count))
  const visible = WHITES.slice(start, start + count)
  const lo = visible[0]
  const hi = visible[visible.length - 1]
  // The computer keyboard starts on the first C in view.
  const kbBase = visible.find((m) => pc(m) === 0) ?? lo

  const synth = useCallback(() => {
    if (!synthRef.current) {
      synthRef.current = new PianoSynth()
      synthRef.current.setVoice(voice)
      synthRef.current.volume = volume
    }
    return synthRef.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => synthRef.current?.close(), [])
  useEffect(() => {
    if (synthRef.current) synthRef.current.volume = volume
  }, [volume])
  useEffect(() => synthRef.current?.setVoice(voice), [voice])

  // Render the visible notes ahead of time, one per tick, so no key press
  // waits on synthesis (a low note takes ~20 ms the first time).
  useEffect(() => {
    let m = Math.max(LOW, lo - 1)
    let timer = 0
    const next = () => {
      if (m > hi) return
      synth().warm([m++])
      timer = window.setTimeout(next, 0)
    }
    timer = window.setTimeout(next, 300)
    return () => clearTimeout(timer)
  }, [lo, hi, voice, synth])

  const refresh = () => setPressed([...new Set(held.current.values())].sort((a, b) => a - b))

  const press = useCallback(
    (source: string, midi: number, velocity = 0.8) => {
      if (midi < LOW || midi > HIGH) return
      const before = held.current.get(source)
      if (before === midi) return
      if (before !== undefined) release(source)
      held.current.set(source, midi)
      synth().noteOn(midi, velocity)
      for (const fn of listeners.current) fn(midi)
      refresh()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [synth],
  )
  function release(source: string) {
    const midi = held.current.get(source)
    if (midi === undefined) return
    held.current.delete(source)
    // Another finger or key may still hold the same note.
    if (![...held.current.values()].includes(midi)) synthRef.current?.noteOff(midi)
    refresh()
  }

  const setSustain = useCallback(
    (down: boolean) => {
      setPedal(down)
      synth().setPedal(down)
    },
    [synth],
  )

  const shift = (whites: number) => setFirst(Math.max(0, Math.min(WHITES.length - count, start + whites)))

  // Computer keyboard: two rows of notes, Space = sustain, arrows = octave.
  const kbRef = useRef({ kbBase, shift })
  kbRef.current = { kbBase, shift }
  useEffect(() => {
    const typing = (e: KeyboardEvent) =>
      e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (!e.repeat) setSustain(true)
        return
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault()
        kbRef.current.shift(e.code === 'ArrowLeft' ? -7 : 7)
        return
      }
      const off = KEYMAP.get(e.code)
      if (off === undefined || e.repeat) return
      e.preventDefault()
      press(e.code, kbRef.current.kbBase + off)
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSustain(false)
      else if (KEYMAP.has(e.code)) release(e.code)
    }
    const blur = () => {
      for (const k of held.current.keys()) release(k)
      setSustain(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [press, setSustain])

  // Pointer / touch: every finger is its own voice, and sliding plays a glissando.
  const keyAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-midi]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    // Lower on the key = played harder, like a real key's lever.
    return { midi: Number(el.dataset.midi), velocity: 0.45 + 0.55 * Math.min(1, Math.max(0, (y - r.top) / r.height)) }
  }
  const onDown = (e: ReactPointerEvent) => {
    const hit = keyAt(e.clientX, e.clientY)
    if (!hit) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    press(`p${e.pointerId}`, hit.midi, hit.velocity)
  }
  const onMove = (e: ReactPointerEvent) => {
    if (!held.current.has(`p${e.pointerId}`)) return
    const hit = keyAt(e.clientX, e.clientY)
    if (hit) press(`p${e.pointerId}`, hit.midi, hit.velocity)
    else release(`p${e.pointerId}`)
  }
  const onUp = (e: ReactPointerEvent) => release(`p${e.pointerId}`)

  // Minimap: tap or drag to move the window anywhere on the 88 keys.
  const mapRef = useRef<HTMLDivElement>(null)
  const jump = (clientX: number) => {
    const r = mapRef.current!.getBoundingClientRect()
    const at = Math.floor(((clientX - r.left) / r.width) * WHITES.length)
    setFirst(Math.max(0, Math.min(WHITES.length - count, at - Math.floor(count / 2))))
  }

  async function connectMidi() {
    try {
      const access = await navigator.requestMIDIAccess()
      const attach = () => {
        const names: string[] = []
        access.inputs.forEach((input) => {
          names.push(input.name ?? 'MIDI')
          input.onmidimessage = (m) => {
            const [status, a, b] = m.data ?? []
            const kind = status & 0xf0
            if (kind === 0x90 && b > 0) press(`m${a}`, a, b / 127)
            else if (kind === 0x80 || (kind === 0x90 && b === 0)) release(`m${a}`)
            else if (kind === 0xb0 && a === 64) setSustain(b >= 64)
          }
        })
        setMidiInfo(
          names.length
            ? t(`Tersambung: ${names.join(', ')}`, `Connected: ${names.join(', ')}`)
            : t('Belum ada keyboard MIDI yang terdeteksi — colokkan, lalu coba lagi.', 'No MIDI keyboard found — plug one in and try again.'),
        )
      }
      attach()
      access.onstatechange = attach
    } catch {
      setMidiInfo(t('Akses MIDI ditolak atau tidak didukung browser ini.', 'MIDI access was denied or is not supported here.'))
    }
  }

  const codeFor = useMemo(() => {
    const map = new Map<number, string>()
    for (const [code, off] of KEYMAP) if (!map.has(kbBase + off)) map.set(kbBase + off, code)
    return map
  }, [kbBase])

  const label = (m: number) => {
    if (labels === 'none') return ''
    if (labels === 'keys') return codeFor.has(m) ? keyLabel(codeFor.get(m)!) : ''
    if (BLACK.has(pc(m))) return ''
    if (labels === 'solfa') return SOLFA[pc(m)]
    // Every letter while keys are wide enough to read them; otherwise only the Cs.
    if (pc(m) === 0) return noteName(m)
    return count <= 15 || (zoom <= 3 && window.innerWidth >= 900) ? SHARPS[pc(m)] : ''
  }

  // What practice can do with the keyboard.
  const stateRef = useRef({ lo, hi, count })
  stateRef.current = { lo, hi, count }
  const host = useMemo<PracticeHost>(
    () => ({
      now: () => synth().now,
      playAt: (midi, velocity, when, duration) => synth().playAt(midi, velocity, when, duration),
      subscribe: (fn) => {
        listeners.current.add(fn)
        return () => listeners.current.delete(fn)
      },
      highlight: setMarks,
      focus: (a, b) => {
        const { lo: l, hi: h, count: c } = stateRef.current
        if (a >= l && b <= h) return
        // Centre the notes; if they do not fit, at least show the first.
        const mid = whiteIndex(Math.round((a + b) / 2))
        const fits = whiteIndex(b) - whiteIndex(a) < c
        const target = fits ? mid - Math.floor(c / 2) : whiteIndex(a) - 1
        setFirst(Math.max(0, Math.min(WHITES.length - c, target)))
      },
    }),
    [synth],
  )

  const chord = chordName(pressed)
  const W = 100 / visible.length
  const keyClass = (m: number) =>
    marks.wrong === m
      ? 'wrong'
      : pressed.includes(m)
        ? 'pressed'
        : marks.target.includes(m)
          ? 'target'
          : marks.demo.includes(m)
            ? 'demo'
            : ''

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-4 shadow-xs sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label={t('Geser ke kiri', 'Move left')} disabled={start <= 0} onClick={() => shift(-7)}>
              <ChevronLeft />
            </Button>
            <span className="w-24 text-center font-mono text-sm tabular-nums">
              {noteName(lo)}–{noteName(hi)}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label={t('Geser ke kanan', 'Move right')}
              disabled={start >= WHITES.length - count}
              onClick={() => shift(7)}
            >
              <ChevronRight />
            </Button>
          </div>
          <p className="min-h-7 text-right" aria-live="polite">
            {chord ? (
              <span className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Chord</span>
                <span className="text-2xl font-semibold tracking-tight">{chord}</span>
              </span>
            ) : (
              <span className="font-mono text-sm text-muted-foreground">{pressed.map((m) => noteName(m)).join(' ')}</span>
            )}
          </p>
        </div>

        {/* All 88 keys in miniature; the frame is what the big keyboard shows. */}
        <div
          ref={mapRef}
          onPointerDown={(e) => {
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            jump(e.clientX)
          }}
          onPointerMove={(e) => e.buttons && jump(e.clientX)}
          className="relative mb-3 h-7 cursor-pointer touch-none overflow-hidden rounded-md border select-none"
          aria-label={t('Peta 88 tuts', '88-key map')}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={WHITES.length - count}
          aria-valuenow={start}
        >
          <div className="flex h-full">
            {WHITES.map((m) => (
              <span
                key={m}
                className={cn(
                  'h-full flex-1 border-r border-zinc-300 last:border-r-0',
                  keyClass(m) === 'pressed' ? 'bg-brand-2' : keyClass(m) === 'target' ? 'bg-emerald-400' : keyClass(m) === 'demo' ? 'bg-sky-400' : 'bg-zinc-100',
                )}
              />
            ))}
          </div>
          {WHITES.map((m, i) =>
            BLACK.has(pc(m + 1)) && m + 1 <= HIGH ? (
              <span
                key={m + 1}
                className="absolute top-0 h-[60%] bg-zinc-800"
                style={{ left: `${((i + 1) / WHITES.length) * 100 - 0.6}%`, width: '1.2%' }}
              />
            ) : null,
          )}
          <span
            className="pointer-events-none absolute inset-y-0 rounded-sm border-2 border-brand-2 bg-brand-2/15"
            style={{ left: `${(start / WHITES.length) * 100}%`, width: `${(count / WHITES.length) * 100}%` }}
          />
        </div>

        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onContextMenu={(e) => e.preventDefault()}
          className="relative h-48 touch-none select-none sm:h-56"
          role="application"
          aria-label={t('Keyboard piano', 'Piano keyboard')}
        >
          {visible.map((m, i) => {
            const k = keyClass(m)
            return (
              <div
                key={m}
                data-midi={m}
                style={{ left: `${i * W}%`, width: `${W}%` }}
                className="absolute inset-y-0 flex items-end justify-center overflow-hidden rounded-b-lg border border-zinc-300 bg-white pb-2 text-[11px] font-medium text-zinc-500"
              >
                {k && (
                  <span
                    className={cn(
                      'pointer-events-none absolute inset-0',
                      k === 'pressed' && 'bg-brand-2/30',
                      k === 'target' && 'bg-emerald-400/60',
                      k === 'demo' && 'bg-sky-400/50',
                      k === 'wrong' && 'bg-rose-500/60',
                    )}
                  />
                )}
                <span className="relative">{label(m)}</span>
              </div>
            )
          })}
          {visible.map((m, i) => {
            const b = m + 1
            if (!BLACK.has(pc(b)) || b > hi) return null
            const k = keyClass(b)
            return (
              <div
                key={b}
                data-midi={b}
                style={{ left: `${(i + 1) * W - W * 0.3}%`, width: `${W * 0.6}%` }}
                className={cn(
                  'absolute top-0 z-10 flex h-[62%] items-end justify-center rounded-b-md pb-1.5 text-[10px] text-zinc-300',
                  k === 'pressed'
                    ? 'bg-brand-2'
                    : k === 'target'
                      ? 'bg-emerald-500'
                      : k === 'demo'
                        ? 'bg-sky-500'
                        : k === 'wrong'
                          ? 'bg-rose-500'
                          : 'bg-zinc-900 dark:bg-zinc-950',
                )}
              >
                {labels === 'keys' ? label(b) : ''}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {t('Suara', 'Sound')}
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value as Voice)}
              className="h-9 rounded-lg border bg-background px-2 text-sm text-foreground"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {lang === 'en' ? v.label[1] : v.label[0]}
                </option>
              ))}
            </select>
          </label>
          <Button variant={pedal ? 'default' : 'outline'} onClick={() => setSustain(!pedal)} aria-pressed={pedal}>
            {t('Sustain', 'Sustain')} {pedal ? t('aktif', 'on') : t('mati', 'off')}
          </Button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {t('Volume', 'Volume')}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-28 accent-[var(--brand-2)]"
            />
          </label>
          {'requestMIDIAccess' in navigator && (
            <Button variant="ghost" onClick={connectMidi}>
              <PianoIcon /> {t('Pakai keyboard MIDI', 'Use a MIDI keyboard')}
            </Button>
          )}
          {midiInfo && <span className="text-sm text-muted-foreground">{midiInfo}</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <Segmented
          label={t('Lebar tampilan', 'Keys shown')}
          value={zoom}
          options={ZOOMS.map((z) => ({ value: z, label: z === 7 ? t('88 tuts', 'All 88') : `${z} ${t('oktaf', 'oct')}` }))}
          onChange={(z) => {
            // Keep the middle of the view where it was.
            // Keep the middle of the view where it was, starting on a C.
            const mid = start + Math.floor(count / 2)
            const c = widthOf(z)
            const from = Math.max(0, Math.min(WHITES.length - c, mid - Math.floor(c / 2)))
            const onC = from + ((7 - ((from + 5) % 7)) % 7) // WHITES[2] is C1, so C sits at index ≡ 2 (mod 7)
            setZoom(z)
            setFirst(c >= WHITES.length ? 0 : Math.min(WHITES.length - c, onC > from + 3 ? onC - 7 : onC))
          }}
        />
        <Segmented
          label={t('Label tuts', 'Key labels')}
          value={labels}
          options={[
            { value: 'notes', label: 'C D E' },
            { value: 'solfa', label: 'Do Re Mi' },
            { value: 'keys', label: t('Tombol keyboard', 'Computer keys') },
            { value: 'none', label: t('Tanpa label', 'None') },
          ]}
          onChange={setLabels}
        />
      </div>

      <Practice host={host} />

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t(
          'Mainkan dengan mouse, sentuhan (bisa beberapa jari sekaligus dan digeser), atau keyboard komputer: baris Z–/ dan Q–] untuk dua oktaf mulai dari C pertama yang terlihat, baris di atasnya untuk tuts hitam. Tahan Spasi untuk sustain, panah kiri/kanan untuk geser satu oktaf, atau ketuk peta 88 tuts di atas keyboard untuk melompat.',
          'Play with the mouse, touch (several fingers at once, and slide across keys) or the computer keyboard: the Z–/ and Q–] rows cover two octaves from the first C in view, the row above each plays the black keys. Hold Space for sustain, left/right arrows move an octave, or tap the 88-key map above the keyboard to jump.',
        )}
      </p>
    </div>
  )
}
