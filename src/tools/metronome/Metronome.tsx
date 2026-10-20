import { useCallback, useEffect, useRef, useState } from 'react'
import { Hand, Minus, Pause, Play, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { routeQuery } from '@/lib/route'
import { useT } from '@/lib/i18n'

/*
 * Clicks are scheduled on the AudioContext clock a little ahead of time
 * (the classic "lookahead" scheduler), so the beat stays steady even when the
 * main thread is busy; a timer only tops the queue up. The flashing dots are
 * driven from the same schedule by requestAnimationFrame.
 */

const MIN = 30
const MAX = 300
const LOOKAHEAD_S = 0.12
const TIMER_MS = 25
const STORE = 'tools:metronome'

const SUBDIVISIONS = [
  { value: 1, label: '♩' },
  { value: 2, label: '♫' },
  { value: 3, label: '3' },
  { value: 4, label: '♬' },
]

const TEMPO_NAMES: [number, string][] = [
  [40, 'Grave'],
  [60, 'Largo'],
  [66, 'Larghetto'],
  [76, 'Adagio'],
  [108, 'Andante'],
  [120, 'Moderato'],
  [156, 'Allegro'],
  [176, 'Vivace'],
  [200, 'Presto'],
  [Infinity, 'Prestissimo'],
]
const tempoName = (bpm: number) => TEMPO_NAMES.find(([max]) => bpm < max)![1]

interface Prefs {
  bpm: number
  beats: number
  sub: number
  accent: boolean
}

const clampBpm = (n: number) => Math.round(Math.min(MAX, Math.max(MIN, n)))

function loadPrefs(): Prefs {
  const fallback = { bpm: 100, beats: 4, sub: 1, accent: true }
  let prefs = fallback
  try {
    prefs = { ...fallback, ...JSON.parse(localStorage.getItem(STORE) ?? '{}') }
  } catch {
    /* keep defaults */
  }
  // /metronome/?bpm=128 (the BPM detector links here) wins over the stored tempo.
  const asked = Number(routeQuery().get('bpm'))
  if (asked) prefs.bpm = asked
  return { ...prefs, bpm: clampBpm(prefs.bpm), beats: Math.min(12, Math.max(1, prefs.beats)) }
}

function click(ctx: AudioContext, when: number, kind: 'accent' | 'beat' | 'sub') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = kind === 'accent' ? 1760 : kind === 'beat' ? 1100 : 800
  const peak = kind === 'sub' ? 0.25 : 0.6
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
  osc.connect(gain).connect(ctx.destination)
  osc.start(when)
  osc.stop(when + 0.06)
}

export default function Metronome() {
  const t = useT()
  const [prefs, setPrefs] = useState(loadPrefs)
  const [playing, setPlaying] = useState(false)
  /** Beat (0-based) currently lit, or -1. */
  const [lit, setLit] = useState(-1)

  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const ctxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef(0)
  const rafRef = useRef(0)
  const taps = useRef<number[]>([])

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(prefs))
    } catch {
      /* private mode */
    }
  }, [prefs])

  const stop = useCallback(() => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    setPlaying(false)
    setLit(-1)
  }, [])

  const start = () => {
    const ctx = (ctxRef.current ??= new AudioContext())
    void ctx.resume()
    let next = ctx.currentTime + 0.06
    let tick = 0 // counts subdivisions since start
    const queue: { time: number; beat: number }[] = []

    const schedule = () => {
      const { bpm, beats, sub, accent } = prefsRef.current
      const step = 60 / bpm / sub
      while (next < ctx.currentTime + LOOKAHEAD_S) {
        const inBeat = tick % sub
        const beat = Math.floor(tick / sub) % beats
        click(ctx, next, inBeat ? 'sub' : beat === 0 && accent && beats > 1 ? 'accent' : 'beat')
        if (!inBeat) queue.push({ time: next, beat })
        next += step
        tick++
      }
    }
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      while (queue.length && queue[0].time <= ctx.currentTime) setLit(queue.shift()!.beat)
    }
    schedule()
    timerRef.current = window.setInterval(schedule, TIMER_MS)
    rafRef.current = requestAnimationFrame(draw)
    setPlaying(true)
  }

  useEffect(
    () => () => {
      stop()
      void ctxRef.current?.close().catch(() => {})
    },
    [stop],
  )

  // Space toggles, arrows nudge the tempo — unless someone is typing.
  const toggleRef = useRef(() => {})
  toggleRef.current = () => (playing ? stop() : start())
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return
      if (e.code === 'Space') {
        e.preventDefault()
        toggleRef.current()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setBpm((b) => b + 1)
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setBpm((b) => b - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function setBpm(f: (bpm: number) => number) {
    setPrefs((p) => ({ ...p, bpm: clampBpm(f(p.bpm)) }))
  }

  const tap = () => {
    const now = performance.now()
    const recent = taps.current.filter((x) => now - x < 2500)
    recent.push(now)
    taps.current = recent.slice(-6)
    if (taps.current.length >= 2) {
      const gaps = taps.current.slice(1).map((x, i) => x - taps.current[i])
      setBpm(() => 60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length))
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-5 shadow-xs sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              type="button"
              aria-label={t('Lebih lambat', 'Slower')}
              onClick={() => setBpm((b) => b - 1)}
              className="grid size-12 place-items-center rounded-2xl border bg-background text-muted-foreground hover:text-foreground"
            >
              <Minus className="size-5" />
            </button>
            <div className="w-36 sm:w-44">
              <p className="text-7xl font-semibold tracking-tight tabular-nums sm:text-8xl">{prefs.bpm}</p>
              <p className="font-mono text-xs text-muted-foreground">BPM · {tempoName(prefs.bpm)}</p>
            </div>
            <button
              type="button"
              aria-label={t('Lebih cepat', 'Faster')}
              onClick={() => setBpm((b) => b + 1)}
              className="grid size-12 place-items-center rounded-2xl border bg-background text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-5" />
            </button>
          </div>

          <input
            type="range"
            min={MIN}
            max={MAX}
            value={prefs.bpm}
            onChange={(e) => setBpm(() => Number(e.target.value))}
            aria-label="BPM"
            className="mt-6 w-full max-w-md accent-[var(--brand-2)]"
          />

          <div className="mt-6 flex flex-wrap justify-center gap-2" aria-hidden>
            {Array.from({ length: prefs.beats }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'size-5 rounded-full border-2 transition-colors duration-75 sm:size-6',
                  lit === i
                    ? i === 0 && prefs.accent && prefs.beats > 1
                      ? 'border-brand-2 bg-brand-2'
                      : 'border-foreground bg-foreground'
                    : 'border-border',
                )}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => toggleRef.current()} className="min-w-32">
              {playing ? <Pause /> : <Play />}
              {playing ? t('Berhenti', 'Stop') : t('Mulai', 'Start')}
            </Button>
            <Button size="lg" variant="outline" onClick={tap}>
              <Hand /> {t('Ketuk tempo', 'Tap tempo')}
            </Button>
          </div>
          <p className="mt-3 hidden text-xs text-muted-foreground sm:block">
            {t('Spasi: mulai/berhenti · Panah: ubah tempo', 'Space: start/stop · Arrows: change tempo')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t('Ketukan per birama', 'Beats per bar')}</p>
          <div className="flex h-10 items-center gap-1 rounded-xl border bg-card px-1">
            <button
              type="button"
              aria-label={t('Kurangi', 'Fewer')}
              onClick={() => setPrefs((p) => ({ ...p, beats: Math.max(1, p.beats - 1) }))}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-12 text-center font-mono text-sm tabular-nums">{prefs.beats}</span>
            <button
              type="button"
              aria-label={t('Tambah', 'More')}
              onClick={() => setPrefs((p) => ({ ...p, beats: Math.min(12, p.beats + 1) }))}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
        <Segmented
          label={t('Pembagian ketukan', 'Subdivision')}
          value={prefs.sub}
          options={SUBDIVISIONS}
          onChange={(sub) => setPrefs((p) => ({ ...p, sub }))}
        />
        <Segmented
          label={t('Aksen ketukan pertama', 'Accent the first beat')}
          value={prefs.accent ? 1 : 0}
          options={[
            { value: 1, label: t('Ya', 'On') },
            { value: 0, label: t('Tidak', 'Off') },
          ]}
          onChange={(v) => setPrefs((p) => ({ ...p, accent: v === 1 }))}
        />
      </div>
    </div>
  )
}
