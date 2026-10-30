import { useEffect, useMemo, useRef, useState } from 'react'
import { FileMusic, Headphones, RotateCcw, Square, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { SHARPS, noteName } from '@/lib/music'
import { useLang, useT } from '@/lib/i18n'
import { SCALES, SONGS, parseMidi, scaleSong, stepsOf, type Song } from './songs'

export interface PracticeHost {
  now: () => number
  playAt: (midi: number, velocity: number, when: number, duration: number) => () => void
  /** Called with every note the player presses. Returns an unsubscribe. */
  subscribe: (fn: (midi: number) => void) => () => void
  /** Keys to light: what to press next, a wrong press, what the demo is playing. */
  highlight: (h: { target: number[]; wrong: number | null; demo: number[] }) => void
  /** Bring these notes into view on the keyboard. */
  focus: (lo: number, hi: number) => void
}

type Source = 'song' | 'scale' | 'midi'
type Run = { kind: 'idle' } | { kind: 'follow' } | { kind: 'demo' } | { kind: 'done'; correct: number; wrong: number }

export function Practice({ host }: { host: PracticeHost }) {
  const t = useT()
  const lang = useLang()
  const [source, setSource] = useState<Source>('song')
  const [songId, setSongId] = useState(SONGS[0].id)
  const [root, setRoot] = useState(0)
  const [scaleId, setScaleId] = useState('major')
  const [midiSong, setMidiSong] = useState<Song | null>(null)
  const [track, setTrack] = useState(-1)
  const [error, setError] = useState('')
  const [speed, setSpeed] = useState(1)
  const [run, setRun] = useState<Run>({ kind: 'idle' })
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })

  const song: Song | null =
    source === 'song' ? SONGS.find((s) => s.id === songId)! : source === 'scale' ? scaleSong(root, scaleId) : midiSong
  const notes = useMemo(() => (song ? song.notes.filter((n) => track < 0 || n.track === track) : []), [song, track])
  const steps = useMemo(() => stepsOf(notes), [notes])

  const hostRef = useRef(host)
  hostRef.current = host
  const demoStops = useRef<(() => void)[]>([])
  const demoTimer = useRef({ interval: 0, raf: 0 })

  const stopAll = () => {
    clearInterval(demoTimer.current.interval)
    cancelAnimationFrame(demoTimer.current.raf)
    for (const s of demoStops.current) s()
    demoStops.current = []
    hostRef.current.highlight({ target: [], wrong: null, demo: [] })
  }
  useEffect(() => () => stopAll(), [])

  // Changing the piece resets the run.
  useEffect(() => {
    stopAll()
    setRun({ kind: 'idle' })
    setIndex(0)
    setScore({ correct: 0, wrong: 0 })
  }, [steps])

  /* ---- Follow: light the next key(s) and wait for them ---- */

  const hit = useRef(new Set<number>())
  useEffect(() => {
    if (run.kind !== 'follow') return
    const step = steps[index]
    if (!step) return
    hostRef.current.highlight({ target: step.notes, wrong: null, demo: [] })
    const ahead = steps.slice(index, index + 4).flatMap((s) => s.notes)
    hostRef.current.focus(Math.min(...ahead), Math.max(...ahead))
  }, [run.kind, index, steps])

  useEffect(() => {
    if (run.kind !== 'follow') return
    let wrongTimer = 0
    const off = hostRef.current.subscribe((midi) => {
      const step = steps[indexRef.current]
      if (!step) return
      if (step.notes.includes(midi)) {
        hit.current.add(midi)
        if (step.notes.every((n) => hit.current.has(n))) {
          hit.current.clear()
          setScore((s) => ({ ...s, correct: s.correct + 1 }))
          const next = indexRef.current + 1
          if (next >= steps.length) {
            setRun({ kind: 'done', correct: scoreRef.current.correct + 1, wrong: scoreRef.current.wrong })
            hostRef.current.highlight({ target: [], wrong: null, demo: [] })
          }
          setIndex(next)
        }
      } else {
        setScore((s) => ({ ...s, wrong: s.wrong + 1 }))
        hostRef.current.highlight({ target: step.notes, wrong: midi, demo: [] })
        clearTimeout(wrongTimer)
        wrongTimer = window.setTimeout(() => hostRef.current.highlight({ target: step.notes, wrong: null, demo: [] }), 350)
      }
    })
    return () => {
      off()
      clearTimeout(wrongTimer)
    }
  }, [run.kind, steps])
  const indexRef = useRef(index)
  indexRef.current = index
  const scoreRef = useRef(score)
  scoreRef.current = score

  /* ---- Demo: play it, lighting each key as it sounds ---- */

  function startDemo() {
    stopAll()
    setRun({ kind: 'demo' })
    const h = hostRef.current
    const from = steps[index]?.t ?? 0
    const pending = notes.filter((n) => n.t >= from - 0.001)
    const zero = h.now() + 0.15
    const at = (n: (typeof notes)[number]) => zero + (n.t - from) / speed
    let next = 0
    const schedule = () => {
      const horizon = hostRef.current.now() + 1
      while (next < pending.length && at(pending[next]) < horizon) {
        const n = pending[next++]
        demoStops.current.push(hostRef.current.playAt(n.midi, n.velocity, at(n), Math.max(0.08, n.d / speed)))
      }
      if (demoStops.current.length > 400) demoStops.current = demoStops.current.slice(-200)
    }
    schedule()
    demoTimer.current.interval = window.setInterval(schedule, 200)
    const end = zero + (pending.length ? (pending[pending.length - 1].t + pending[pending.length - 1].d - from) / speed : 0)
    let lastKey = ''
    const draw = () => {
      const now = hostRef.current.now()
      if (now > end + 0.2) {
        stopAll()
        setRun({ kind: 'idle' })
        setIndex(0)
        return
      }
      demoTimer.current.raf = requestAnimationFrame(draw)
      const sounding = pending.filter((n) => at(n) <= now && now < at(n) + n.d / speed).map((n) => n.midi)
      const key = sounding.join(',')
      if (key !== lastKey) {
        lastKey = key
        hostRef.current.highlight({ target: [], wrong: null, demo: sounding })
        if (sounding.length) hostRef.current.focus(Math.min(...sounding), Math.max(...sounding))
        // The step now sounding: the one before the first that is still in the future.
        const future = steps.findIndex((s) => zero + (s.t - from) / speed > now)
        setIndex(Math.max(0, (future < 0 ? steps.length : future) - 1))
      }
    }
    demoTimer.current.raf = requestAnimationFrame(draw)
  }

  function startFollow(fromStart: boolean) {
    stopAll()
    hit.current.clear()
    if (fromStart) {
      setIndex(0)
      setScore({ correct: 0, wrong: 0 })
    }
    setRun({ kind: 'follow' })
  }

  function stop() {
    stopAll()
    setRun({ kind: 'idle' })
  }

  async function openMidi(file: File) {
    setError('')
    try {
      const parsed = parseMidi(await file.arrayBuffer(), file.name)
      setMidiSong(parsed)
      setTrack(-1)
    } catch {
      setError(t('File ini tidak bisa dibaca sebagai MIDI (.mid).', "This file couldn't be read as MIDI (.mid)."))
    }
  }

  const upcoming = steps.slice(index, index + 6)
  const total = steps.length
  const pct = total ? Math.round((Math.min(index, total) / total) * 100) : 0

  return (
    <div className="space-y-5 rounded-3xl border bg-card p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium">{t('Latihan', 'Practice')}</p>
          <p className="text-xs text-muted-foreground">
            {t(
              'Dengarkan contohnya, lalu mainkan sendiri — tuts berikutnya menyala hijau dan menunggu ditekan.',
              'Listen to it first, then play it yourself — the next key lights up green and waits for you.',
            )}
          </p>
        </div>
        <Segmented
          label=""
          value={source}
          options={[
            { value: 'song', label: t('Lagu', 'Songs') },
            { value: 'scale', label: t('Tangga nada', 'Scales') },
            { value: 'midi', label: t('File MIDI', 'MIDI file') },
          ]}
          onChange={setSource}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {source === 'song' && (
          <label className="min-w-0 flex-1 space-y-1">
            <span className="block text-xs text-muted-foreground">{t('Lagu', 'Song')}</span>
            <select
              value={songId}
              onChange={(e) => setSongId(e.target.value)}
              className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
            >
              {SONGS.map((s) => (
                <option key={s.id} value={s.id}>
                  {lang === 'en' && s.en ? `${s.en.title} — ${s.en.by}` : `${s.title} — ${s.by}`}
                </option>
              ))}
            </select>
          </label>
        )}
        {source === 'scale' && (
          <>
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">{t('Nada dasar', 'Root')}</span>
              <select value={root} onChange={(e) => setRoot(Number(e.target.value))} className="h-10 rounded-xl border bg-background px-3 text-sm">
                {SHARPS.map((n, i) => (
                  <option key={n} value={i}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">{t('Jenis', 'Type')}</span>
              <select value={scaleId} onChange={(e) => setScaleId(e.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm">
                {SCALES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === 'en' ? s.label[1] : s.label[0]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {source === 'midi' && (
          <>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-background px-4 text-sm hover:border-brand-2/50">
              <FileMusic className="size-4" />
              {midiSong ? midiSong.title : t('Pilih file .mid', 'Choose a .mid file')}
              <input
                type="file"
                accept=".mid,.midi,audio/midi,audio/x-midi"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void openMidi(f)
                  e.target.value = ''
                }}
              />
            </label>
            {midiSong?.tracks && (
              <label className="space-y-1">
                <span className="block text-xs text-muted-foreground">{t('Bagian', 'Part')}</span>
                <select value={track} onChange={(e) => setTrack(Number(e.target.value))} className="h-10 rounded-xl border bg-background px-3 text-sm">
                  <option value={-1}>{t('Semua', 'All')}</option>
                  {midiSong.tracks.map((tr) => (
                    <option key={tr.index} value={tr.index}>
                      {tr.name} ({tr.count})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">
            {t('Kecepatan contoh', 'Demo speed')} {Math.round(speed * 100)}%
          </span>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="h-10 w-32 accent-[var(--brand-2)]"
          />
        </label>
      </div>

      {source === 'midi' && !midiSong && (
        <p className="text-sm text-muted-foreground">
          {t(
            'Punya file MIDI lagu favoritmu? Buka di sini untuk berlatih — file dibaca di browser dan tidak di-upload. Pilih "Bagian" untuk berlatih satu tangan saja.',
            'Have a MIDI file of a song you like? Open it here to practise — it is read in your browser, never uploaded. Pick a "Part" to practise one hand.',
          )}
        </p>
      )}
      {error && <ErrorNote message={error} />}

      {steps.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {run.kind === 'follow' || run.kind === 'demo' ? (
              <Button variant="outline" onClick={stop}>
                <Square /> {t('Berhenti', 'Stop')}
              </Button>
            ) : (
              <>
                <Button onClick={() => startFollow(run.kind === 'done' || index >= total)}>
                  <Target /> {index > 0 && index < total ? t('Lanjut latihan', 'Resume practice') : t('Mulai latihan', 'Start practice')}
                </Button>
                <Button variant="outline" onClick={startDemo}>
                  <Headphones /> {t('Dengarkan contoh', 'Listen first')}
                </Button>
              </>
            )}
            {index > 0 && run.kind !== 'demo' && (
              <Button
                variant="ghost"
                onClick={() => {
                  stopAll()
                  setRun({ kind: 'idle' })
                  setIndex(0)
                  setScore({ correct: 0, wrong: 0 })
                }}
              >
                <RotateCcw /> {t('Ulang', 'Restart')}
              </Button>
            )}
            <span className="ml-auto font-mono text-sm text-muted-foreground tabular-nums">
              {Math.min(index, total)} / {total}
              {run.kind !== 'demo' && (score.correct > 0 || score.wrong > 0) && (
                <>
                  {' · '}
                  <span className="text-emerald-600 dark:text-emerald-400">✓ {score.correct}</span>{' '}
                  <span className="text-rose-600 dark:text-rose-400">✗ {score.wrong}</span>
                </>
              )}
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-brand-2 transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>

          {run.kind === 'done' ? (
            <p className="rounded-xl bg-emerald-500/10 p-4 text-sm">
              {t('Selesai!', 'Done!')}{' '}
              {t(
                `Ketepatan ${Math.round((run.correct / Math.max(1, run.correct + run.wrong)) * 100)}% — ${run.wrong} kali salah tekan.`,
                `Accuracy ${Math.round((run.correct / Math.max(1, run.correct + run.wrong)) * 100)}% — ${run.wrong} wrong presses.`,
              )}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
              <span className="mr-1 text-xs text-muted-foreground">{t('Berikutnya', 'Next')}</span>
              {upcoming.map((s, i) => (
                <span
                  key={index + i}
                  className={cn(
                    'rounded-lg border px-2 py-1 font-mono text-sm',
                    i === 0 ? 'border-transparent bg-emerald-500 text-white' : 'bg-background text-muted-foreground',
                  )}
                >
                  {s.notes.map((m) => noteName(m)).join('+')}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
