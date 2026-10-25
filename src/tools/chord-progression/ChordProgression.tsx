import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Pause, Play, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { CopyButton } from '@/components/tool/CopyButton'
import { getLang, useT } from '@/lib/i18n'
import { pageUrl } from '@/lib/route'
import { GuitarSynth } from '@/tools/guitar/sound'
import { PianoSynth } from '@/tools/piano/sound'
import { PATTERNS, buildProgression, guitarNotes, pianoVoicing, progressionText, spell, usesFlats } from './progression'

type Sound = 'guitar' | 'piano'

const STORE = 'tools:chord-progression'
const KEYS = Array.from({ length: 12 }, (_, i) => i)

interface Prefs {
  tonic: number
  pattern: string
  sound: Sound
  bpm: number
  bars: number
}

function loadPrefs(): Prefs {
  const fallback: Prefs = { tonic: 0, pattern: 'pop', sound: 'guitar', bpm: 90, bars: 1 }
  try {
    const p = { ...fallback, ...JSON.parse(localStorage.getItem(STORE) ?? '{}') }
    return {
      tonic: ((Math.round(p.tonic) % 12) + 12) % 12,
      pattern: PATTERNS.some((x) => x.id === p.pattern) ? p.pattern : fallback.pattern,
      sound: p.sound === 'piano' ? 'piano' : 'guitar',
      bpm: Math.min(200, Math.max(40, Math.round(p.bpm) || fallback.bpm)),
      bars: p.bars === 2 ? 2 : 1,
    }
  } catch {
    return fallback
  }
}

export default function ChordProgression() {
  const t = useT()
  const [prefs, setPrefs] = useState(loadPrefs)
  const [playing, setPlaying] = useState(false)
  const [lit, setLit] = useState(-1)

  const pattern = PATTERNS.find((p) => p.id === prefs.pattern)!
  const chords = useMemo(() => buildProgression(prefs.tonic, pattern), [prefs.tonic, pattern])
  const keyName = spell(prefs.tonic, usesFlats(prefs.tonic, pattern.minor)) + (pattern.minor ? 'm' : '')

  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const chordsRef = useRef(chords)
  chordsRef.current = chords
  const guitar = useRef<GuitarSynth | null>(null)
  const piano = useRef<PianoSynth | null>(null)
  const loop = useRef<{ timer: number; raf: number } | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(prefs))
    } catch {
      /* private mode */
    }
  }, [prefs])

  const stop = () => {
    if (loop.current) {
      clearInterval(loop.current.timer)
      cancelAnimationFrame(loop.current.raf)
      loop.current = null
    }
    guitar.current?.dampAll()
    piano.current?.allOff()
    setPlaying(false)
    setLit(-1)
  }
  const stopRef = useRef(stop)
  stopRef.current = stop

  useEffect(
    () => () => {
      stopRef.current()
      guitar.current?.close()
      piano.current?.close()
    },
    [],
  )

  const start = () => {
    const ctx = prefsRef.current.sound === 'piano' ? (piano.current ??= new PianoSynth()).ctx : (guitar.current ??= new GuitarSynth()).ctx
    void ctx.resume()

    let next = ctx.currentTime + 0.1
    let beat = 0 // beats since the start
    const queue: { time: number; chord: number }[] = []

    const schedule = () => {
      const { bpm, bars, sound } = prefsRef.current
      const list = chordsRef.current
      const beatLen = 60 / bpm
      const perChord = 4 * bars
      while (next < ctx.currentTime + 0.15) {
        const index = Math.floor(beat / perChord) % list.length
        const inChord = beat % perChord
        const c = list[index]
        if (inChord === 0) queue.push({ time: next, chord: index })
        if (sound === 'piano') {
          if (inChord === 0) {
            // Held for the whole chord, released a hair early so the next one is clean.
            const dur = perChord * beatLen * 0.97
            pianoVoicing(c.root, c.suffix).forEach((m, i) => piano.current!.playAt(m, i === 0 ? 0.75 : 0.55, next, dur))
          }
        } else if (inChord % 2 === 0) {
          // Strum on beats 1 and 3: down, with a few ms between strings.
          guitarNotes(c.root, c.suffix).forEach((n, i) => guitar.current!.pluck(n.string, n.midi, inChord === 0 ? 0.85 : 0.65, next + i * 0.018))
        }
        next += beatLen
        beat++
      }
    }
    const draw = () => {
      if (!loop.current) return
      loop.current.raf = requestAnimationFrame(draw)
      while (queue.length && queue[0].time <= ctx.currentTime) setLit(queue.shift()!.chord)
    }
    loop.current = { timer: window.setInterval(schedule, 25), raf: 0 }
    schedule()
    loop.current.raf = requestAnimationFrame(draw)
    setPlaying(true)
  }

  // Changing the sound while playing would leave the old synth ringing: restart cleanly.
  const set = (patch: Partial<Prefs>) => {
    if (playing && patch.sound) stop()
    setPrefs((p) => ({ ...p, ...patch }))
  }

  const text = progressionText(chords, 4)
  const names = chords.map((c) => c.name)
  const lang = getLang()
  const unique = [...new Set(names)].slice(0, 8).join(',')

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">{t('Pola progresi', 'Progression')}</span>
          <select
            value={prefs.pattern}
            onChange={(e) => set({ pattern: e.target.value })}
            className="h-10 w-full rounded-xl border bg-card px-3 text-sm"
          >
            {PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {t(p.label[0], p.label[1])}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t('Kunci', 'Key')}</p>
          <div className="flex h-10 items-center gap-1 rounded-xl border bg-card px-1">
            <button
              type="button"
              aria-label={t('Turun setengah nada', 'Down a semitone')}
              onClick={() => set({ tonic: (prefs.tonic + 11) % 12 })}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Minus className="size-4" />
            </button>
            <span className="flex-1 text-center font-mono text-sm">{keyName}</span>
            <button
              type="button"
              aria-label={t('Naik setengah nada', 'Up a semitone')}
              onClick={() => set({ tonic: (prefs.tonic + 1) % 12 })}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Pilih kunci', 'Pick a key')}>
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => set({ tonic: k })}
            className={cn(
              'h-8 min-w-10 rounded-lg border px-2 font-mono text-xs',
              k === prefs.tonic ? 'border-brand-2 bg-brand-2/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {spell(k, usesFlats(k, pattern.minor))}
            {pattern.minor ? 'm' : ''}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border bg-card p-4 shadow-xs sm:p-6">
        <div className={'grid grid-cols-2 gap-3 sm:grid-cols-4'}>
          {chords.map((c, i) => (
            <div
              key={i}
              className={cn(
                'rounded-2xl border p-4 text-center transition-colors duration-100',
                lit === i ? 'border-brand-2 bg-brand-2/10' : 'bg-background',
              )}
            >
              <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{c.name}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{c.degree}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={() => (playing ? stop() : start())} className="min-w-32">
            {playing ? <Pause /> : <Play />}
            {playing ? t('Berhenti', 'Stop') : t('Putar', 'Play')}
          </Button>
          <CopyButton text={text} label={t('Salin chord', 'Copy chords')} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <Segmented
          label={t('Suara', 'Sound')}
          value={prefs.sound}
          options={[
            { value: 'guitar', label: t('Gitar', 'Guitar') },
            { value: 'piano', label: t('Piano', 'Piano') },
          ]}
          onChange={(sound) => set({ sound })}
        />
        <Segmented
          label={t('Ketukan per chord', 'Length per chord')}
          value={prefs.bars}
          options={[
            { value: 1, label: t('1 birama', '1 bar') },
            { value: 2, label: t('2 birama', '2 bars') },
          ]}
          onChange={(bars) => set({ bars })}
        />
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Tempo: {prefs.bpm} BPM</span>
          <input
            type="range"
            min={40}
            max={200}
            value={prefs.bpm}
            onChange={(e) => set({ bpm: Number(e.target.value) })}
            aria-label="BPM"
            className="block w-48 accent-[var(--brand-2)]"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href={pageUrl('guitar', lang, `chords=${encodeURIComponent(unique)}`)}
          className="rounded-xl border bg-card px-4 py-2 hover:bg-accent"
        >
          {t('Buka di Gitar Online →', 'Open in Online Guitar →')}
        </a>
        <a href={pageUrl('piano', lang)} className="rounded-xl border bg-card px-4 py-2 hover:bg-accent">
          {t('Buka Piano Online →', 'Open Online Piano →')}
        </a>
        <a href={pageUrl('chords', lang)} className="rounded-xl border bg-card px-4 py-2 hover:bg-accent">
          {t('Lihat diagram chord →', 'See chord diagrams →')}
        </a>
      </div>
    </div>
  )
}
