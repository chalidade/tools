import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Eraser, Pause, Play, Piano as MidiIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Stage, StageButton, useStage } from '@/components/tool/Stage'
import { useLang, useT } from '@/lib/i18n'
import { DrumKit, type Piece } from './sound'

interface Pad {
  id: Piece
  label: readonly [string, string]
  key: string
  /** Shown on the pad. */
  keyLabel: string
  /** General MIDI drum notes that play it (e-drum kits and pads send these). */
  gm: number[]
}

// Laid out roughly like a kit seen from the stool: cymbals and toms on top,
// hats and snare in the middle, the kick along the bottom.
const PADS: Pad[] = [
  { id: 'crash', label: ['Crash', 'Crash'], key: 'KeyQ', keyLabel: 'Q', gm: [49, 57, 52, 55] },
  { id: 'tom1', label: ['Tom 1', 'Tom 1'], key: 'KeyW', keyLabel: 'W', gm: [48, 50] },
  { id: 'tom2', label: ['Tom 2', 'Tom 2'], key: 'KeyE', keyLabel: 'E', gm: [45, 47] },
  { id: 'ride', label: ['Ride', 'Ride'], key: 'KeyR', keyLabel: 'R', gm: [51, 59, 53] },
  { id: 'hhOpen', label: ['Hi-hat buka', 'Open hi-hat'], key: 'KeyA', keyLabel: 'A', gm: [46] },
  { id: 'hhClosed', label: ['Hi-hat tutup', 'Closed hi-hat'], key: 'KeyS', keyLabel: 'S', gm: [42, 44] },
  { id: 'snare', label: ['Snare', 'Snare'], key: 'KeyD', keyLabel: 'D', gm: [38, 40, 37, 39] },
  { id: 'floor', label: ['Floor tom', 'Floor tom'], key: 'KeyF', keyLabel: 'F', gm: [41, 43] },
  { id: 'kick', label: ['Kick', 'Kick'], key: 'Space', keyLabel: 'Spasi', gm: [35, 36] },
]

/** Sequencer rows, top to bottom. */
const ROWS: Piece[] = ['crash', 'ride', 'hhOpen', 'hhClosed', 'tom1', 'tom2', 'floor', 'snare', 'kick']
const STEPS = 16
const STORE = 'tools:drums'

type Grid = Record<Piece, string> // 16 chars: '.' rest, 'x' hit, 'X' accent

const EMPTY = '.'.repeat(STEPS)
const grid = (rows: Partial<Grid>): Grid => Object.fromEntries(ROWS.map((r) => [r, rows[r] ?? EMPTY])) as Grid

const PRESETS: { id: string; label: readonly [string, string]; bpm: number; swing: number; grid: Grid }[] = [
  {
    id: 'rock',
    label: ['Rock', 'Rock'],
    bpm: 110,
    swing: 0,
    grid: grid({ crash: 'X...............', hhClosed: 'x.x.x.x.x.x.x.x.', snare: '....X.......X...', kick: 'X.......X.x.....' }),
  },
  {
    id: 'pop',
    label: ['Pop', 'Pop'],
    bpm: 100,
    swing: 0,
    grid: grid({ hhClosed: 'x.x.x.x.x.x.x.x.', snare: '....X.......X...', kick: 'X.....x.X.......' }),
  },
  {
    id: 'disco',
    label: ['Disco', 'Disco'],
    bpm: 120,
    swing: 0,
    grid: grid({ hhOpen: '..x...x...x...x.', hhClosed: 'x...x...x...x...', snare: '....X.......X...', kick: 'X...X...X...X...' }),
  },
  {
    id: 'funk',
    label: ['Funk', 'Funk'],
    bpm: 98,
    swing: 0,
    grid: grid({ hhClosed: 'xxxxxxxxxxxxxxxx', snare: '....X..x.x..X..x', kick: 'X.x...x...X..x..' }),
  },
  {
    id: 'hiphop',
    label: ['Hip-hop', 'Hip-hop'],
    bpm: 88,
    swing: 20,
    grid: grid({ hhClosed: 'x.x.x.x.x.x.x.x.', snare: '....X.......X...', kick: 'X......X..X.....' }),
  },
  {
    id: 'shuffle',
    label: ['Shuffle / blues', 'Shuffle / blues'],
    bpm: 96,
    swing: 60,
    grid: grid({ ride: 'x.x.x.x.x.x.x.x.', snare: '....X.......X...', kick: 'X.......X.......' }),
  },
  {
    id: 'bossa',
    label: ['Bossa nova', 'Bossa nova'],
    bpm: 130,
    swing: 0,
    grid: grid({ hhClosed: 'x.x.x.x.x.x.x.x.', snare: 'x..x..x...x..x..', kick: 'X..xX..xX..xX..x' }),
  },
  {
    id: 'reggae',
    label: ['Reggae (one drop)', 'Reggae (one drop)'],
    bpm: 76,
    swing: 30,
    grid: grid({ hhClosed: 'x.x.x.x.x.x.x.x.', snare: '........X.......', kick: '........X.......' }),
  },
  {
    id: 'dangdut',
    label: ['Dangdut (di drum set)', 'Dangdut (on a kit)'],
    bpm: 128,
    swing: 0,
    grid: grid({ hhClosed: 'x.x.x.x.x.x.x.x.', tom1: '...x.x.....x.x..', floor: '........X.....x.', kick: 'X......X........' }),
  },
]

function load(): { grid: Grid; bpm: number; swing: number } {
  try {
    const p = JSON.parse(localStorage.getItem(STORE) ?? 'null')
    if (p?.grid && ROWS.every((r) => typeof p.grid[r] === 'string' && p.grid[r].length === STEPS)) return p
  } catch {
    /* fall through */
  }
  return { grid: PRESETS[0].grid, bpm: PRESETS[0].bpm, swing: 0 }
}

export default function Drums() {
  const t = useT()
  const lang = useLang()
  const [seq, setSeq] = useState(load)
  const [playing, setPlaying] = useState(false)
  const [step, setStep] = useState(-1)
  const [volume, setVolume] = useState(0.8)
  const [midiInfo, setMidiInfo] = useState('')
  const stage = useStage()
  const kitRef = useRef<DrumKit | null>(null)
  const padEls = useRef(new Map<Piece, HTMLElement>())
  const loop = useRef<{ timer: number; raf: number } | null>(null)

  const kit = useCallback(() => (kitRef.current ??= new DrumKit()), [])

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(seq))
    } catch {
      /* private mode */
    }
  }, [seq])
  useEffect(() => {
    if (kitRef.current) kitRef.current.volume = volume
  }, [volume])

  // Light a pad by touching the DOM directly: no re-render on every hit.
  const flash = useCallback((piece: Piece, delayMs = 0) => {
    window.setTimeout(() => {
      const el = padEls.current.get(piece)
      if (!el) return
      el.dataset.hit = ''
      window.setTimeout(() => delete el.dataset.hit, 90)
    }, delayMs)
  }, [])

  const play = useCallback(
    (piece: Piece, velocity = 0.85) => {
      const k = kit()
      k.resume()
      k.hit(piece, velocity)
      flash(piece)
    },
    [kit, flash],
  )

  // Keyboard: one key per pad.
  useEffect(() => {
    const byKey = new Map(PADS.map((p) => [p.key, p.id]))
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const piece = byKey.get(e.code)
      if (!piece) return
      e.preventDefault()
      play(piece)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [play])

  // Pads react on pointer *down* (not click) — every millisecond counts on drums.
  const onPad = (e: ReactPointerEvent, piece: Piece) => {
    e.preventDefault()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    // Hit nearer the centre for a louder note, like a real head.
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
    play(piece, Math.max(0.45, 1 - 0.45 * Math.min(1, Math.hypot(dx, dy))))
  }

  /* ---- Sequencer ---- */

  const seqRef = useRef(seq)
  seqRef.current = seq

  function stop() {
    if (!loop.current) return
    clearInterval(loop.current.timer)
    cancelAnimationFrame(loop.current.raf)
    loop.current = null
    setPlaying(false)
    setStep(-1)
  }

  function start() {
    const k = kit()
    k.resume()
    let next = k.now + 0.08
    let i = 0
    const queue: { time: number; step: number }[] = []
    const schedule = () => {
      const { grid: g, bpm, swing } = seqRef.current
      const sixteenth = 60 / bpm / 4
      while (next < k.now + 0.12) {
        const s = i % STEPS
        // Swing pushes every off-beat sixteenth later, towards a triplet feel.
        const at = next + (s % 2 === 1 ? sixteenth * (swing / 100) * 0.66 : 0)
        for (const row of ROWS) {
          const c = g[row][s]
          if (c !== '.') {
            k.hit(row, c === 'X' ? 1 : 0.7, at)
            flash(row, Math.max(0, (at - k.now) * 1000))
          }
        }
        queue.push({ time: at, step: s })
        next += sixteenth
        i++
      }
    }
    const draw = () => {
      if (!loop.current) return
      loop.current.raf = requestAnimationFrame(draw)
      while (queue.length && queue[0].time <= k.now) setStep(queue.shift()!.step)
    }
    loop.current = { timer: window.setInterval(schedule, 25), raf: 0 }
    schedule()
    loop.current.raf = requestAnimationFrame(draw)
    setPlaying(true)
  }

  useEffect(
    () => () => {
      stop()
      kitRef.current?.close()
    },
    [],
  )

  const toggle = (row: Piece, s: number) => {
    const cur = seq.grid[row][s]
    const next = cur === '.' ? 'x' : cur === 'x' ? 'X' : '.'
    if (next !== '.' && !playing) play(row, next === 'X' ? 1 : 0.7)
    setSeq((q) => ({ ...q, grid: { ...q.grid, [row]: q.grid[row].slice(0, s) + next + q.grid[row].slice(s + 1) } }))
  }

  async function connectMidi() {
    try {
      const access = await navigator.requestMIDIAccess()
      const byNote = new Map(PADS.flatMap((p) => p.gm.map((n) => [n, p.id] as const)))
      const attach = () => {
        const names: string[] = []
        access.inputs.forEach((input) => {
          names.push(input.name ?? 'MIDI')
          input.onmidimessage = (m) => {
            const [status, note, vel] = m.data ?? []
            if ((status & 0xf0) !== 0x90 || !vel) return
            const piece = byNote.get(note)
            if (piece) play(piece, vel / 127)
          }
        })
        setMidiInfo(
          names.length
            ? t(`Tersambung: ${names.join(', ')}`, `Connected: ${names.join(', ')}`)
            : t('Belum ada drum/keyboard MIDI yang terdeteksi.', 'No MIDI drum kit or keyboard found.'),
        )
      }
      attach()
      access.onstatechange = attach
    } catch {
      setMidiInfo(t('Akses MIDI ditolak atau tidak didukung browser ini.', 'MIDI access was denied or is not supported here.'))
    }
  }

  const name = (p: Pad) => (lang === 'en' ? p.label[1] : p.label[0])
  const padOf = (id: Piece) => PADS.find((p) => p.id === id)!

  return (
    <div className="space-y-6">
      <Stage stage={stage} title={t('Drum Online', 'Online Drums')} className="rounded-3xl border bg-card p-4 shadow-xs sm:p-6">
        <div className={cn('grid grid-cols-4 gap-2 sm:gap-3', stage.full && 'min-h-0 flex-1 grid-rows-[1fr_1fr_0.8fr]')}>
          {PADS.map((p) => (
            <button
              key={p.id}
              type="button"
              ref={(el) => {
                if (el) padEls.current.set(p.id, el)
              }}
              onPointerDown={(e) => onPad(e, p.id)}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                'flex touch-none flex-col items-center justify-center rounded-2xl border bg-background select-none transition-[background-color,transform] duration-75 data-[hit]:scale-[0.97] data-[hit]:bg-brand-2/30',
                p.id === 'kick' && 'col-span-4',
                stage.full ? 'h-full min-h-0' : p.id === 'kick' ? 'h-20 sm:h-24' : 'h-24 sm:h-28',
                (p.id === 'crash' || p.id === 'ride') && 'rounded-full',
              )}
            >
              <span className="text-sm font-semibold sm:text-base">{name(p)}</span>
              <span className="mt-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">{p.keyLabel}</span>
            </button>
          ))}
        </div>
        <div className={cn('flex-wrap items-center gap-3', stage.full ? 'hidden' : 'mt-4 flex')}>
          {!stage.full && <StageButton onClick={stage.enter} />}
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
              <MidiIcon /> {t('Pakai drum elektrik / MIDI', 'Use an e-drum / MIDI')}
            </Button>
          )}
          {midiInfo && <span className="text-sm text-muted-foreground">{midiInfo}</span>}
        </div>
      </Stage>

      <div className="rounded-3xl border bg-card p-4 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <p className="font-medium">{t('Sequencer 16 langkah', '16-step sequencer')}</p>
            <p className="text-xs text-muted-foreground">
              {t('Ketuk kotak: sekali = pukul, dua kali = aksen (lebih keras), tiga kali = hapus.', 'Tap a cell: once = hit, twice = accent (louder), three times = clear.')}
            </p>
          </div>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">{t('Pola', 'Pattern')}</span>
            <select
              defaultValue=""
              onChange={(e) => {
                const p = PRESETS.find((x) => x.id === e.target.value)
                if (p) setSeq({ grid: p.grid, bpm: p.bpm, swing: p.swing })
                e.target.value = ''
              }}
              className="h-10 rounded-xl border bg-background px-3 text-sm"
            >
              <option value="" disabled>
                {t('Pilih pola…', 'Load a pattern…')}
              </option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {lang === 'en' ? p.label[1] : p.label[0]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">BPM</span>
            <input
              type="number"
              min={50}
              max={220}
              value={seq.bpm}
              onChange={(e) => setSeq((q) => ({ ...q, bpm: Math.min(220, Math.max(50, Number(e.target.value) || 100)) }))}
              className="h-10 w-20 rounded-xl border bg-background px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Swing {seq.swing}%</span>
            <input
              type="range"
              min={0}
              max={75}
              step={5}
              value={seq.swing}
              onChange={(e) => setSeq((q) => ({ ...q, swing: Number(e.target.value) }))}
              className="h-10 w-28 accent-[var(--brand-2)]"
            />
          </label>
          <Button variant="ghost" onClick={() => setSeq((q) => ({ ...q, grid: grid({}) }))}>
            <Eraser /> {t('Kosongkan', 'Clear')}
          </Button>
          <Button onClick={() => (playing ? stop() : start())} className="min-w-28">
            {playing ? <Pause /> : <Play />} {playing ? t('Berhenti', 'Stop') : t('Mainkan', 'Play')}
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[560px] space-y-1">
            {ROWS.map((row) => (
              <div key={row} className="flex items-center gap-1">
                <span className="sticky left-0 z-10 w-24 shrink-0 truncate bg-card pr-1 text-xs text-muted-foreground">{name(padOf(row))}</span>
                <div className="grid flex-1 grid-cols-16 gap-1">
                  {[...seq.grid[row]].map((c, s) => (
                    <button
                      key={s}
                      type="button"
                      aria-label={`${name(padOf(row))} ${s + 1}`}
                      aria-pressed={c !== '.'}
                      onClick={() => toggle(row, s)}
                      className={cn(
                        'h-7 rounded-md border transition-colors',
                        s % 4 === 0 && c === '.' && 'bg-muted',
                        c === 'x' && 'border-transparent bg-brand-2/60',
                        c === 'X' && 'border-transparent bg-brand-2',
                        c === '.' && s % 4 !== 0 && 'bg-background',
                        step === s && 'ring-2 ring-foreground/60',
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t(
          'Pukul pad dengan jari (bisa beberapa sekaligus; makin ke tengah makin keras), mouse, atau keyboard: Q crash, W/E tom, R ride, A hi-hat buka, S hi-hat tutup, D snare, F floor tom, Spasi kick. Drum elektrik dengan peta General MIDI langsung dikenali. Polamu tersimpan di browser ini.',
          'Hit the pads with your fingers (several at once; nearer the centre is louder), the mouse or the keyboard: Q crash, W/E toms, R ride, A open hat, S closed hat, D snare, F floor tom, Space kick. E-drum kits using the General MIDI map work as-is. Your pattern is saved in this browser.',
        )}
      </p>
    </div>
  )
}
