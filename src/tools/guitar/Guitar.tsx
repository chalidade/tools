import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowDown, ArrowUp, Hand, Pause, Play, Plus, Repeat, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { Stage, StageButton, useStage } from '@/components/tool/Stage'
import { SHARPS, parseNote, pc } from '@/lib/music'
import { routeQuery } from '@/lib/route'
import { useLang, useT } from '@/lib/i18n'
import { CHORD_TYPES, INSTRUMENTS, voicings, type Voicing } from '@/tools/chords/theory'
import { GuitarSynth, type Tone } from './sound'

type Mode = 'strum' | 'fret'

interface TrayChord {
  root: number
  suffix: string
  /** Which of the generated shapes to play. */
  shape: number
}

const GUITAR = INSTRUMENTS.find((i) => i.id === 'guitar')!
const OPEN = GUITAR.strings // low E … high e
const FRETS = 12
const MARKERS = new Set([3, 5, 7, 9, 12])
const STORE = 'tools:guitar'

const PATTERNS: { id: string; label: readonly [string, string]; slots: string }[] = [
  { id: 'pop', label: ['Pop', 'Pop'], slots: 'D-DU-UDU' },
  { id: 'folk', label: ['Folk', 'Folk'], slots: 'D-DUDUDU' },
  { id: 'balada', label: ['Balada', 'Ballad'], slots: 'D---D-DU' },
  { id: 'rock', label: ['Rock', 'Rock'], slots: 'DDDDDDDD' },
  { id: 'reggae', label: ['Reggae', 'Reggae'], slots: '-U-U-U-U' },
  { id: 'waltz', label: ['Waltz 3/4', 'Waltz 3/4'], slots: 'D-DUDU' },
]

const chordName = (c: TrayChord) => SHARPS[c.root] + c.suffix

interface Prefs {
  tray: TrayChord[]
  tone: Tone
  pattern: string
  bpm: number
}

/** /guitar/?chords=C,G,Am,F (the progression builder links here): up to 8 known chords. */
function chordsFromQuery(): TrayChord[] | null {
  const tray: TrayChord[] = []
  for (const name of (routeQuery().get('chords') ?? '').split(',')) {
    const m = /^([A-G][#b]?)(.*)$/.exec(name.trim())
    const root = m ? parseNote(m[1]) : null
    if (root !== null && CHORD_TYPES.some((c) => c.suffix === m![2])) tray.push({ root, suffix: m![2], shape: 0 })
  }
  return tray.length ? tray.slice(0, 8) : null
}

function loadPrefs(): Prefs {
  const fallback: Prefs = {
    tray: [
      { root: 0, suffix: '', shape: 0 },
      { root: 7, suffix: '', shape: 0 },
      { root: 9, suffix: 'm', shape: 0 },
      { root: 5, suffix: '', shape: 0 },
    ],
    tone: 'acoustic',
    pattern: 'pop',
    bpm: 90,
  }
  try {
    const p = JSON.parse(localStorage.getItem(STORE) ?? '{}')
    return { ...fallback, ...p, tray: chordsFromQuery() ?? (Array.isArray(p.tray) && p.tray.length ? p.tray : fallback.tray) }
  } catch {
    return { ...fallback, tray: chordsFromQuery() ?? fallback.tray }
  }
}

export default function Guitar() {
  const t = useT()
  const lang = useLang()
  const [prefs, setPrefs] = useState(loadPrefs)
  const [mode, setMode] = useState<Mode>('strum')
  const [active, setActive] = useState(0)
  const [capo, setCapo] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [playing, setPlaying] = useState(false)
  const [slot, setSlot] = useState(-1)
  /** Fret each string last sounded at, for the light-up; null = quiet. */
  const [lit, setLit] = useState<(number | null)[]>(() => OPEN.map(() => null))
  const [adding, setAdding] = useState<{ root: number; suffix: string } | null>(null)

  const stage = useStage()
  const synthRef = useRef<GuitarSynth | null>(null)
  const timers = useRef<number[]>([])
  const pointers = useRef(new Map<number, string>())
  const loop = useRef<{ timer: number; raf: number } | null>(null)

  const synth = useCallback(() => {
    if (!synthRef.current) {
      synthRef.current = new GuitarSynth()
      synthRef.current.setTone(prefs.tone)
    }
    return synthRef.current
  }, [prefs.tone])

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(prefs))
    } catch {
      /* private mode */
    }
  }, [prefs])
  useEffect(() => synthRef.current?.setTone(prefs.tone), [prefs.tone])
  useEffect(() => {
    if (synthRef.current) synthRef.current.volume = volume
  }, [volume])
  useEffect(
    () => () => {
      stopLoop()
      timers.current.forEach(clearTimeout)
      synthRef.current?.close()
    },
    [],
  )

  const tray = prefs.tray
  const current = tray[Math.min(active, tray.length - 1)]

  /** The shape to finger for a chord: the chord a capo-width lower, moved up by the capo. */
  const shapeOf = useCallback(
    (c: TrayChord): Voicing => {
      const type = CHORD_TYPES.find((x) => x.suffix === c.suffix) ?? CHORD_TYPES[0]
      const all = voicings(GUITAR, pc(c.root - capo), type)
      const v = all[c.shape % Math.max(1, all.length)] ?? OPEN.map(() => -1)
      return v.map((f) => (f < 0 ? -1 : f + capo))
    },
    [capo],
  )
  const shape = useMemo(() => shapeOf(current), [current, shapeOf])
  const shapeCount = useMemo(() => {
    const type = CHORD_TYPES.find((x) => x.suffix === current.suffix) ?? CHORD_TYPES[0]
    return voicings(GUITAR, pc(current.root - capo), type).length
  }, [current, capo])

  // Warm the current chord's notes so the first strum is instant.
  useEffect(() => {
    if (!synthRef.current) return
    synthRef.current.warm(shape.map((f, s) => (f < 0 ? -1 : OPEN[s] + f)).filter((m) => m > 0))
  }, [shape])

  const flash = (string: number, fret: number, delayMs = 0) => {
    const on = window.setTimeout(() => {
      setLit((l) => l.map((x, i) => (i === string ? fret : x)))
      const off = window.setTimeout(() => setLit((l) => l.map((x, i) => (i === string && x === fret ? null : x))), 450)
      timers.current.push(off)
    }, delayMs)
    timers.current.push(on)
  }

  const pluck = (string: number, fret: number, velocity = 0.8, when = 0) => {
    const s = synth()
    s.pluck(string, OPEN[string] + fret, velocity, when)
    flash(string, fret, when ? Math.max(0, (when - s.ctx.currentTime) * 1000) : 0)
  }

  const strum = (dir: 'down' | 'up', v: Voicing = shape, when = 0) => {
    const s = synth()
    const start = Math.max(when, s.ctx.currentTime + 0.005)
    // Downstrokes cross every string low to high; upstrokes mostly catch the top four.
    const order = OPEN.map((_, i) => i).filter((i) => v[i] >= 0 && (dir === 'down' || i >= 2))
    if (dir === 'up') order.reverse()
    order.forEach((string, k) => pluck(string, v[string], dir === 'down' ? 0.85 : 0.6, start + k * (dir === 'down' ? 0.014 : 0.01)))
  }

  const mute = () => {
    synthRef.current?.dampAll()
    setLit(OPEN.map(() => null))
  }

  /* ---- Accompaniment ---- */

  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const shapeOfRef = useRef(shapeOf)
  shapeOfRef.current = shapeOf
  const strumRef = useRef(strum)
  strumRef.current = strum

  function stopLoop() {
    if (!loop.current) return
    clearInterval(loop.current.timer)
    cancelAnimationFrame(loop.current.raf)
    loop.current = null
    setPlaying(false)
    setSlot(-1)
  }

  function startLoop() {
    const s = synth()
    void s.ctx.resume()
    let next = s.ctx.currentTime + 0.1
    let step = 0
    let chord = active
    const queue: { time: number; slot: number; chord: number }[] = []
    const schedule = () => {
      const p = prefsRef.current
      const pattern = PATTERNS.find((x) => x.id === p.pattern) ?? PATTERNS[0]
      const slotLen = 60 / p.bpm / 2 // eighth notes
      while (next < s.ctx.currentTime + 0.15) {
        const i = step % pattern.slots.length
        if (i === 0 && step > 0) chord = (chord + 1) % p.tray.length
        const mark = pattern.slots[i]
        const c = p.tray[chord % p.tray.length]
        if (mark === 'D' || mark === 'U') strumRef.current(mark === 'D' ? 'down' : 'up', shapeOfRef.current(c), next)
        queue.push({ time: next, slot: i, chord })
        next += slotLen
        step++
      }
    }
    const draw = () => {
      if (!loop.current) return
      loop.current.raf = requestAnimationFrame(draw)
      while (queue.length && queue[0].time <= s.ctx.currentTime) {
        const q = queue.shift()!
        setSlot(q.slot)
        setActive(q.chord)
      }
    }
    loop.current = { timer: window.setInterval(schedule, 25), raf: 0 }
    schedule()
    loop.current.raf = requestAnimationFrame(draw)
    setPlaying(true)
  }

  /* ---- Keyboard ---- */

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyRef.current = (e: KeyboardEvent) => {
    // composedPath: in a Shadow DOM embed, e.target is the host element, not the input.
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.composedPath()[0] as HTMLElement).tagName ?? '')) return
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
    if (e.code === 'Space' || e.code === 'ArrowDown') {
      e.preventDefault()
      strum('down')
    } else if (e.code === 'ArrowUp') {
      e.preventDefault()
      strum('up')
    } else if (e.code === 'KeyM') mute()
    else if (/^Digit[1-8]$/.test(e.code)) {
      const i = Number(e.code.slice(5)) - 1
      if (i < tray.length) setActive(i)
    }
  }
  useEffect(() => {
    const on = (e: KeyboardEvent) => keyRef.current(e)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  /* ---- Touch / mouse on the neck ---- */

  const hit = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-s]')
    if (!el) return null
    return { string: Number(el.dataset.s), fret: el.dataset.f === undefined ? null : Number(el.dataset.f) }
  }
  const touch = (e: ReactPointerEvent) => {
    const h = hit(e.clientX, e.clientY)
    if (!h) return
    if (mode === 'strum') {
      // Crossing a string plays it with the chord's fret: a swipe is a strum.
      const key = `${h.string}`
      if (pointers.current.get(e.pointerId) === key) return
      pointers.current.set(e.pointerId, key)
      if (shape[h.string] >= 0) pluck(h.string, shape[h.string], 0.8)
    } else {
      if (h.fret === null) return
      const fret = Math.max(h.fret, capo)
      const key = `${h.string}:${fret}`
      if (pointers.current.get(e.pointerId) === key) return
      pointers.current.set(e.pointerId, key)
      pluck(h.string, fret, 0.8)
    }
  }
  const onDown = (e: ReactPointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.delete(e.pointerId)
    touch(e)
  }
  const onMove = (e: ReactPointerEvent) => {
    if (pointers.current.has(e.pointerId)) touch(e)
  }
  const onUp = (e: ReactPointerEvent) => pointers.current.delete(e.pointerId)

  const pattern = PATTERNS.find((x) => x.id === prefs.pattern) ?? PATTERNS[0]
  const setTray = (next: TrayChord[]) => setPrefs((p) => ({ ...p, tray: next }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-6">
        <Segmented
          label={t('Mode', 'Mode')}
          value={mode}
          options={[
            { value: 'strum', label: t('Genjreng chord', 'Strum chords') },
            { value: 'fret', label: t('Petik bebas', 'Free fretboard') },
          ]}
          onChange={setMode}
        />
        <Segmented
          label={t('Suara', 'Sound')}
          value={prefs.tone}
          options={[
            { value: 'acoustic', label: t('Akustik', 'Acoustic') },
            { value: 'clean', label: t('Listrik', 'Electric') },
            { value: 'drive', label: t('Distorsi', 'Distortion') },
          ]}
          onChange={(tone) => setPrefs((p) => ({ ...p, tone }))}
        />
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Capo</p>
          <div className="flex h-10 items-center gap-1 rounded-xl border bg-card px-1">
            <button
              type="button"
              aria-label={t('Turunkan capo', 'Capo down')}
              onClick={() => setCapo((c) => Math.max(0, c - 1))}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              −
            </button>
            <span className="w-14 text-center font-mono text-sm tabular-nums">{capo ? `fret ${capo}` : t('tanpa', 'none')}</span>
            <button
              type="button"
              aria-label={t('Naikkan capo', 'Capo up')}
              onClick={() => setCapo((c) => Math.min(7, c + 1))}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              +
            </button>
          </div>
        </div>
        <div className="self-end">
          <StageButton onClick={stage.enter} />
        </div>
      </div>

      <Stage stage={stage} title={t('Gitar Online', 'Online Guitar')} className="rounded-3xl border bg-card p-4 shadow-xs sm:p-6">
        {mode === 'strum' && (
          <div className={cn('flex flex-wrap items-center gap-2', stage.full ? 'shrink-0' : 'mb-4')}>
            {tray.map((c, i) => (
              <span key={i} className="group relative">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    'h-11 min-w-14 rounded-xl border px-3 text-lg font-semibold transition-colors',
                    i === active ? 'border-transparent bg-primary text-primary-foreground' : 'bg-background hover:border-foreground/30',
                  )}
                >
                  {chordName(c)}
                  <span className="ml-1.5 align-top font-mono text-[10px] opacity-50">{i + 1}</span>
                </button>
                {tray.length > 1 && (
                  <button
                    type="button"
                    aria-label={t(`Hapus ${chordName(c)}`, `Remove ${chordName(c)}`)}
                    onClick={() => {
                      setTray(tray.filter((_, j) => j !== i))
                      setActive((a) => (a >= i && a > 0 ? a - 1 : a))
                    }}
                    className="absolute -top-1.5 -right-1.5 hidden size-5 place-items-center rounded-full border bg-card text-muted-foreground group-hover:grid hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}
            {adding ? (
              <span className="flex items-center gap-1 rounded-xl border bg-background p-1">
                <select
                  aria-label={t('Kunci dasar', 'Root')}
                  value={adding.root}
                  onChange={(e) => setAdding({ ...adding, root: Number(e.target.value) })}
                  className="h-9 rounded-lg bg-card px-2 text-sm"
                >
                  {SHARPS.map((n, i) => (
                    <option key={n} value={i}>
                      {n}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t('Jenis chord', 'Chord type')}
                  value={adding.suffix}
                  onChange={(e) => setAdding({ ...adding, suffix: e.target.value })}
                  className="h-9 rounded-lg bg-card px-2 text-sm"
                >
                  {CHORD_TYPES.map((c) => (
                    <option key={c.suffix} value={c.suffix}>
                      {c.suffix || (lang === 'en' ? 'maj' : 'mayor')}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={() => {
                    setTray([...tray, { ...adding, shape: 0 }].slice(0, 8))
                    setActive(Math.min(tray.length, 7))
                    setAdding(null)
                  }}
                >
                  {t('Tambah', 'Add')}
                </Button>
                <button
                  type="button"
                  aria-label={t('Batal', 'Cancel')}
                  onClick={() => setAdding(null)}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </span>
            ) : (
              tray.length < 8 && (
                <button
                  type="button"
                  onClick={() => setAdding({ root: 2, suffix: '' })}
                  className="inline-flex h-11 items-center gap-1 rounded-xl border border-dashed px-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-4" /> {t('Chord', 'Chord')}
                </button>
              )
            )}
            {shapeCount > 1 && (
              <button
                type="button"
                onClick={() => setTray(tray.map((c, i) => (i === active ? { ...c, shape: (c.shape + 1) % shapeCount } : c)))}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Repeat className="size-4" />
                {t('Bentuk lain', 'Other shape')} {(current.shape % shapeCount) + 1}/{shapeCount}
              </button>
            )}
          </div>
        )}

        {/* The neck: high e on top, like a chord chart or tab. */}
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onContextMenu={(e) => e.preventDefault()}
          role="application"
          aria-label={t('Leher gitar', 'Guitar neck')}
          className={cn(
            'relative touch-none overflow-hidden rounded-xl bg-amber-950/90 select-none dark:bg-amber-950/60',
            stage.full && 'flex min-h-0 flex-1 flex-col',
          )}
        >
          {/* Fret wires and inlays. */}
          <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `0.7fr repeat(${FRETS}, 1fr)` }}>
            {Array.from({ length: FRETS + 1 }, (_, f) => (
              <div
                key={f}
                className={cn(
                  'relative border-r',
                  f === 0 ? 'border-r-4 border-zinc-200' : 'border-zinc-400/70',
                  f > 0 && f <= capo && 'bg-black/30',
                )}
              >
                {MARKERS.has(f) && (
                  <span className="absolute top-1/2 left-1/2 flex -translate-1/2 flex-col gap-10">
                    <span className="size-2.5 rounded-full bg-zinc-200/40" />
                    {f === 12 && <span className="size-2.5 rounded-full bg-zinc-200/40" />}
                  </span>
                )}
                {f === capo && capo > 0 && <span className="absolute inset-y-1 right-0 w-2 translate-x-1/2 rounded bg-zinc-900 ring-1 ring-zinc-500" />}
              </div>
            ))}
          </div>
          {[5, 4, 3, 2, 1, 0].map((s) => (
            <div key={s} data-s={s} className={cn('relative grid', stage.full ? 'min-h-0 flex-1' : 'h-9 sm:h-10')} style={{ gridTemplateColumns: `0.7fr repeat(${FRETS}, 1fr)` }}>
              <span
                className={cn(
                  'pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 transition-colors',
                  lit[s] !== null ? 'bg-brand-2' : 'bg-zinc-300/80',
                )}
                style={{ height: `${1 + (5 - s) * 0.45}px` }}
              />
              {Array.from({ length: FRETS + 1 }, (_, f) => {
                const inShape = mode === 'strum' && shape[s] === f && f > capo
                const sounding = lit[s] === f
                // In the nut column: ○ = rings open (or at the capo), × = not played.
                const nutMark = mode === 'strum' && f === 0 && !sounding ? (shape[s] < 0 ? 'x' : shape[s] === capo ? 'o' : null) : null
                return (
                  <div key={f} data-s={s} data-f={f} className="relative grid place-items-center">
                    {nutMark === 'o' && <span className="pointer-events-none z-10 size-4 rounded-full border-2 border-zinc-100 bg-amber-950" />}
                    {nutMark === 'x' && (
                      <span className="pointer-events-none z-10 grid size-4 place-items-center rounded-full bg-amber-950 text-sm leading-none font-bold text-zinc-300">
                        ×
                      </span>
                    )}
                    {(inShape || sounding) && (
                      <span
                        className={cn(
                          'pointer-events-none z-10 size-5 rounded-full border-2 sm:size-6',
                          sounding ? 'border-white bg-brand-2' : 'border-white/70 bg-white/85',
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="mt-1 grid shrink-0 font-mono text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `0.7fr repeat(${FRETS}, 1fr)` }}>
          {Array.from({ length: FRETS + 1 }, (_, f) => (
            <span key={f} className="text-center">
              {f === 0 ? '' : f}
            </span>
          ))}
        </div>

        {mode === 'strum' && (
          <div className={cn('flex flex-wrap items-center gap-2', stage.full ? 'shrink-0' : 'mt-4')}>
            <Button size="lg" onClick={() => strum('down')}>
              <ArrowDown /> {t('Genjreng bawah', 'Down')}
            </Button>
            <Button size="lg" variant="outline" onClick={() => strum('up')}>
              <ArrowUp /> {t('Atas', 'Up')}
            </Button>
            <Button size="lg" variant="ghost" onClick={mute}>
              <Hand /> {t('Redam', 'Mute')}
            </Button>
            <label className={cn('ml-auto items-center gap-2 text-sm text-muted-foreground', stage.full ? 'hidden' : 'flex')}>
              {t('Volume', 'Volume')}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-24 accent-[var(--brand-2)]"
              />
            </label>
          </div>
        )}
      </Stage>

      {mode === 'strum' && (
        <div className="rounded-3xl border bg-card p-4 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-sm font-medium">{t('Iringan otomatis', 'Auto accompaniment')}</p>
              <p className="text-xs text-muted-foreground">
                {t('Memainkan pola genjrengan, pindah ke chord berikutnya tiap birama.', 'Plays a strum pattern, moving to the next chord every bar.')}
              </p>
            </div>
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">{t('Pola', 'Pattern')}</span>
              <select
                value={prefs.pattern}
                onChange={(e) => setPrefs((p) => ({ ...p, pattern: e.target.value }))}
                className="h-10 rounded-xl border bg-background px-3 text-sm"
              >
                {PATTERNS.map((p) => (
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
                max={200}
                value={prefs.bpm}
                onChange={(e) => setPrefs((p) => ({ ...p, bpm: Math.min(200, Math.max(50, Number(e.target.value) || 90)) }))}
                className="h-10 w-20 rounded-xl border bg-background px-3 text-sm tabular-nums"
              />
            </label>
            <Button onClick={() => (playing ? stopLoop() : startLoop())} className="min-w-28">
              {playing ? <Pause /> : <Play />} {playing ? t('Berhenti', 'Stop') : t('Mainkan', 'Play')}
            </Button>
          </div>
          <div className="mt-4 flex gap-1 font-mono" aria-hidden>
            {[...pattern.slots].map((m, i) => (
              <span
                key={i}
                className={cn(
                  'grid h-9 flex-1 place-items-center rounded-lg border text-sm transition-colors duration-75',
                  slot === i ? 'border-transparent bg-brand-2 text-white' : 'bg-background text-muted-foreground',
                )}
              >
                {m === 'D' ? '↓' : m === 'U' ? '↑' : '·'}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm leading-relaxed text-muted-foreground">
        {mode === 'strum'
          ? t(
              'Usap jari atau mouse melintasi senar untuk menggenjreng, atau pakai tombol: Spasi/↓ genjreng bawah, ↑ genjreng atas, M redam, angka 1–8 ganti chord. Capo menggeser semua nada naik; bentuk jarinya ikut ditampilkan.',
              'Swipe a finger or the mouse across the strings to strum, or use the keys: Space/↓ down-strum, ↑ up-strum, M mute, 1–8 change chord. A capo moves every note up; the shape shown follows it.',
            )
          : t(
              'Ketuk titik mana pun di leher gitar untuk memetik nada itu — tiap senar berbunyi satu nada, seperti gitar sungguhan. Geser jari untuk slide atau memetik beberapa senar.',
              'Tap anywhere on the neck to pick that note — each string sounds one note at a time, like a real guitar. Slide a finger to slide or to pick across strings.',
            )}
      </p>
    </div>
  )
}
