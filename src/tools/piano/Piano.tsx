import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Piano as PianoIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { SHARPS, noteName, pc } from '@/lib/music'
import { useT } from '@/lib/i18n'
import { CHORD_TYPES } from '@/tools/chords/theory'
import { PianoSynth } from './sound'

type Labels = 'keys' | 'notes' | 'solfa' | 'none'

const SOLFA = ['Do', 'Di', 'Re', 'Ri', 'Mi', 'Fa', 'Fi', 'Sol', 'Si', 'La', 'Li', 'Si']
const BLACK = new Set([1, 3, 6, 8, 10])

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

export default function Piano() {
  const t = useT()
  const [octaves, setOctaves] = useState(2)
  // Phones show one octave: start it on middle C.
  const [startOct, setStartOct] = useState(() => (window.innerWidth < 640 ? 4 : 3))
  const [pressed, setPressed] = useState<number[]>([])
  const [labels, setLabels] = useState<Labels>('notes')
  const [pedal, setPedal] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [midiInfo, setMidiInfo] = useState('')

  const synthRef = useRef<PianoSynth | null>(null)
  const held = useRef(new Map<string, number>()) // source (pointer id, key code, midi) → note
  const boxRef = useRef<HTMLDivElement>(null)

  const start = 12 * (startOct + 1)
  const end = start + 12 * octaves // inclusive: the keyboard ends on a C
  const synth = useCallback(() => (synthRef.current ??= new PianoSynth()), [])

  // Fit as many octaves as the width allows; a phone gets one plus a C.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const fit = Math.max(1, Math.min(4, Math.floor(entry.contentRect.width / (7 * 42))))
      setOctaves(fit)
      setStartOct((s) => Math.min(s, 7 - fit))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => () => synthRef.current?.close(), [])

  // Render the visible notes ahead of time, one per tick, so no key press
  // waits on synthesis (a low note takes ~20 ms the first time).
  useEffect(() => {
    let m = start
    let timer = 0
    const next = () => {
      if (m > end) return
      synth().warm([m++])
      timer = window.setTimeout(next, 0)
    }
    timer = window.setTimeout(next, 300)
    return () => clearTimeout(timer)
  }, [start, end, synth])
  useEffect(() => {
    if (synthRef.current) synthRef.current.volume = volume
  }, [volume])

  const refresh = () => setPressed([...new Set(held.current.values())].sort((a, b) => a - b))

  const press = useCallback(
    (source: string, midi: number, velocity = 0.8) => {
      const before = held.current.get(source)
      if (before === midi) return
      if (before !== undefined) release(source)
      held.current.set(source, midi)
      synth().noteOn(midi, velocity)
      refresh()
    },
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

  // Computer keyboard: two rows of notes, Space = sustain, arrows = octave.
  const startRef = useRef(start)
  startRef.current = start
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
        setStartOct((s) => Math.max(1, Math.min(7 - octaves, s + (e.code === 'ArrowLeft' ? -1 : 1))))
        return
      }
      const off = KEYMAP.get(e.code)
      if (off === undefined || e.repeat) return
      e.preventDefault()
      press(e.code, startRef.current + off)
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
  }, [octaves, press, setSustain])

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

  const keys = useMemo(() => {
    const whites: number[] = []
    for (let m = start; m <= end; m++) if (!BLACK.has(pc(m))) whites.push(m)
    return whites
  }, [start, end])

  const codeFor = useMemo(() => {
    const map = new Map<number, string>()
    for (const [code, off] of KEYMAP) if (!map.has(start + off)) map.set(start + off, code)
    return map
  }, [start])

  const label = (m: number) => {
    if (labels === 'none') return ''
    if (labels === 'keys') return codeFor.has(m) ? keyLabel(codeFor.get(m)!) : ''
    if (labels === 'solfa') return BLACK.has(pc(m)) ? '' : SOLFA[pc(m)]
    return BLACK.has(pc(m)) ? '' : pc(m) === 0 ? noteName(m) : SHARPS[pc(m)]
  }

  const chord = chordName(pressed)
  const W = 100 / keys.length

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-4 shadow-xs sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label={t('Oktaf lebih rendah', 'Lower octave')}
              disabled={startOct <= 1}
              onClick={() => setStartOct((s) => s - 1)}
            >
              <ChevronLeft />
            </Button>
            <span className="w-24 text-center font-mono text-sm tabular-nums">
              {noteName(start)}–{noteName(end)}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label={t('Oktaf lebih tinggi', 'Higher octave')}
              disabled={startOct >= 7 - octaves}
              onClick={() => setStartOct((s) => s + 1)}
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

        <div
          ref={boxRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onContextMenu={(e) => e.preventDefault()}
          className="relative h-48 touch-none select-none sm:h-56"
          role="application"
          aria-label={t('Keyboard piano', 'Piano keyboard')}
        >
          {keys.map((m, i) => (
            <div
              key={m}
              data-midi={m}
              style={{ left: `${i * W}%`, width: `${W}%` }}
              className={cn(
                'absolute inset-y-0 flex items-end justify-center overflow-hidden rounded-b-lg border border-zinc-300 bg-white pb-2 text-[11px] font-medium text-zinc-500',
              )}
            >
              {pressed.includes(m) && <span className="pointer-events-none absolute inset-0 bg-brand-2/30" />}
              <span className="relative">{label(m)}</span>
            </div>
          ))}
          {keys.map((m, i) =>
            BLACK.has(pc(m + 1)) && m + 1 <= end ? (
              <div
                key={m + 1}
                data-midi={m + 1}
                style={{ left: `${(i + 1) * W - W * 0.3}%`, width: `${W * 0.6}%` }}
                className={cn(
                  'absolute top-0 z-10 flex h-[62%] items-end justify-center rounded-b-md pb-1.5 text-[10px] text-zinc-300 transition-colors duration-75',
                  pressed.includes(m + 1) ? 'bg-brand-2' : 'bg-zinc-900 dark:bg-zinc-950',
                )}
              >
                {labels === 'keys' ? label(m + 1) : ''}
              </div>
            ) : null,
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant={pedal ? 'default' : 'outline'}
            onClick={() => setSustain(!pedal)}
            aria-pressed={pedal}
          >
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

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t(
          'Mainkan dengan mouse, sentuhan (bisa beberapa jari sekaligus dan digeser), atau keyboard komputer: baris Z–/ dan Q–] untuk dua oktaf, baris di atasnya untuk tuts hitam. Tahan Spasi untuk sustain, panah kiri/kanan untuk pindah oktaf. Tekan tiga nada atau lebih untuk melihat nama chord-nya.',
          'Play with the mouse, touch (several fingers at once, and slide across keys) or the computer keyboard: the Z–/ and Q–] rows cover two octaves, the row above each plays the black keys. Hold Space for sustain, left/right arrows to change octave. Hold three or more notes to see the chord name.',
        )}
      </p>
    </div>
  )
}
