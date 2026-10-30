import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Mic, MicOff, Minus, Plus, Square, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { tr, useLang, useT } from '@/lib/i18n'
import { freqToMidi, midiToFreq, noteLetter, noteName } from '@/lib/music'
import { TUNINGS, detectPitch } from './pitch'

/** Within this many cents counts as in tune. */
const IN_TUNE = 5
/** How long a string has to stay in tune before it is ticked off. */
const HOLD_MS = 600
/** Analyse at most this often; the loop itself runs on requestAnimationFrame. */
const STEP_MS = 45
const STORE = 'tools:guitar-tuner'
/** Drone note range (MIDI): C2 – C6. */
const DRONE_MIN = 36
const DRONE_MAX = 84
/** Below this the analysis window doubles, so a low cello string still fits a few periods. */
const LOW_HZ = 60

interface Reading {
  freq: number
  midi: number
  /** performance.now() of the last periodic frame, to fade a reading out. */
  at: number
}

function loadPrefs(): { tuning: string; a4: number } {
  try {
    const p = JSON.parse(localStorage.getItem(STORE) ?? '{}')
    return {
      tuning: TUNINGS.some((t) => t.id === p.tuning) ? p.tuning : 'standard',
      a4: typeof p.a4 === 'number' && p.a4 >= 415 && p.a4 <= 466 ? p.a4 : 440,
    }
  } catch {
    return { tuning: 'standard', a4: 440 }
  }
}

function micError(e: unknown) {
  const name = (e as DOMException)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return tr(
      'Izin mikrofon ditolak. Klik ikon gembok di samping alamat situs, izinkan Mikrofon, lalu coba lagi.',
      'Microphone access was denied. Click the lock icon next to the site address, allow Microphone, then try again.',
    )
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return tr('Tidak ada mikrofon yang terdeteksi di perangkat ini.', 'No microphone was detected on this device.')
  if (name === 'NotReadableError')
    return tr(
      'Mikrofon sedang dipakai aplikasi lain. Tutup aplikasi itu, lalu coba lagi.',
      'Another app is using the microphone. Close that app, then try again.',
    )
  return tr('Mikrofon tidak bisa dibuka di browser ini.', "The microphone can't be opened in this browser.")
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[s.length >> 1]
}

export default function GuitarTuner() {
  const t = useT()
  const lang = useLang()
  const [prefs, setPrefs] = useState(loadPrefs)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [reading, setReading] = useState<Reading | null>(null)
  /** Manually chosen string (index), or null to follow the nearest one. */
  const [target, setTarget] = useState<number | null>(null)
  const [tuned, setTuned] = useState<Set<number>>(new Set())
  const [now, setNow] = useState(0)

  const tuning = TUNINGS.find((x) => x.id === prefs.tuning) ?? TUNINGS[0]
  const chromatic = tuning.strings.length === 0

  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef(0)
  const toneCtxRef = useRef<AudioContext | null>(null)
  const droneRef = useRef<{ osc: OscillatorNode[]; gain: GainNode } | null>(null)
  const [drone, setDrone] = useState<number | null>(null)
  const [droneNote, setDroneNote] = useState(57)
  const inTuneSince = useRef<{ string: number; at: number } | null>(null)
  /** Bumped by every start/stop, so a mic prompt answered after Stop or unmount releases its stream. */
  const session = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(prefs))
    } catch {
      /* private mode: just don't remember */
    }
  }, [prefs])

  // Search range: a bit below the lowest string and well above the highest,
  // so a string tuned far off is still caught.
  const range = useMemo(() => {
    if (chromatic) return { min: 30, max: 1400 }
    const freqs = tuning.strings.map((m) => midiToFreq(m, prefs.a4))
    return { min: Math.max(28, Math.min(...freqs) * 0.6), max: Math.max(...freqs) * 1.7 }
  }, [chromatic, tuning, prefs.a4])
  const rangeRef = useRef(range)
  rangeRef.current = range
  const a4Ref = useRef(prefs.a4)
  a4Ref.current = prefs.a4

  const stop = useCallback(() => {
    session.current++
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    void ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    setRunning(false)
  }, [])

  const stopDrone = useCallback(() => {
    const d = droneRef.current
    const ctx = toneCtxRef.current
    droneRef.current = null
    setDrone(null)
    if (!d || !ctx) return
    const t0 = ctx.currentTime
    d.gain.gain.cancelScheduledValues(t0)
    d.gain.gain.setValueAtTime(d.gain.gain.value, t0)
    d.gain.gain.linearRampToValueAtTime(0, t0 + 0.08)
    d.osc.forEach((o) => o.stop(t0 + 0.1))
  }, [])

  const startDrone = (midi: number) => {
    stopDrone()
    const ctx = (toneCtxRef.current ??= new AudioContext())
    void ctx.resume()
    const gain = ctx.createGain()
    const t0 = ctx.currentTime
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(0.25, t0 + 0.1)
    gain.connect(ctx.destination)
    // A soft triangle plus a quiet octave above: steady and easy to hear a beat against.
    const osc = [
      { type: 'triangle' as const, mul: 1, level: 1 },
      { type: 'sine' as const, mul: 2, level: 0.25 },
    ].map(({ type, mul, level }) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = type
      o.frequency.value = midiToFreq(midi, a4Ref.current) * mul
      g.gain.value = level
      o.connect(g).connect(gain)
      o.start(t0)
      return o
    })
    droneRef.current = { osc, gain }
    setDrone(midi)
  }

  // Keep a running drone on pitch when the reference A4 changes.
  useEffect(() => {
    const d = droneRef.current
    if (!d || drone === null) return
    d.osc.forEach((o, i) => (o.frequency.value = midiToFreq(drone, prefs.a4) * (i + 1)))
  }, [prefs.a4, drone])

  useEffect(
    () => () => {
      stop()
      stopDrone()
      void toneCtxRef.current?.close().catch(() => {})
    },
    [stop, stopDrone],
  )

  const start = async () => {
    setError('')
    const id = ++session.current
    try {
      // Raw signal: speech processing would gate and smear a plucked note.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      if (id !== session.current) return stream.getTracks().forEach((track) => track.stop())
      streamRef.current = stream
      const ctx = new AudioContext()
      ctxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 8192
      ctx.createMediaStreamSource(stream).connect(analyser)
      const full = new Float32Array(analyser.fftSize)
      const history: number[] = []
      let last = 0
      setRunning(true)

      const tick = (time: number) => {
        rafRef.current = requestAnimationFrame(tick)
        if (time - last < STEP_MS) return
        last = time
        setNow(time)
        analyser.getFloatTimeDomainData(full)
        const { min, max } = rangeRef.current
        // The newest 4096 samples, or all 8192 for very low notes.
        const buf = full.subarray(min < LOW_HZ ? 0 : full.length >> 1)
        const pitch = detectPitch(buf, ctx.sampleRate, min, max)
        if (!pitch || pitch.clarity < 0.85) return
        // A jump of more than a semitone is a new note: start over.
        if (history.length && Math.abs(12 * Math.log2(pitch.freq / median(history))) > 1) history.length = 0
        history.push(pitch.freq)
        if (history.length > 5) history.shift()
        const freq = median(history)
        setReading({ freq, midi: freqToMidi(freq, a4Ref.current), at: time })
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (e) {
      if (id !== session.current) return
      stop()
      setError(micError(e))
    }
  }

  const playTone = (midi: number) => {
    const ctx = (toneCtxRef.current ??= new AudioContext())
    void ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = midiToFreq(midi, prefs.a4)
    const t0 = ctx.currentTime
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 2)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 2.05)
  }

  // A reading fades out a moment after the string stops ringing.
  const live = reading && now - reading.at < 1500 ? reading : null

  let targetIndex: number | null = null
  let targetMidi: number | null = null
  if (live) {
    if (chromatic) targetMidi = Math.round(live.midi)
    else {
      targetIndex =
        target ??
        tuning.strings.reduce((best, m, i) => (Math.abs(live.midi - m) < Math.abs(live.midi - tuning.strings[best]) ? i : best), 0)
      targetMidi = tuning.strings[targetIndex]
    }
  } else if (!chromatic && target !== null) {
    targetIndex = target
    targetMidi = tuning.strings[target]
  }
  const cents = live && targetMidi !== null ? (live.midi - targetMidi) * 100 : null
  const inTune = cents !== null && Math.abs(cents) <= IN_TUNE

  // Tick a string off once it has stayed in tune for a moment.
  useEffect(() => {
    if (!inTune || targetIndex === null || !live) {
      inTuneSince.current = null
      return
    }
    const since = inTuneSince.current
    if (!since || since.string !== targetIndex) inTuneSince.current = { string: targetIndex, at: live.at }
    else if (live.at - since.at >= HOLD_MS && !tuned.has(targetIndex)) setTuned((s) => new Set(s).add(targetIndex))
  }, [inTune, targetIndex, live, tuned])

  const changeTuning = (id: string) => {
    setPrefs((p) => ({ ...p, tuning: id }))
    setTarget(null)
    setTuned(new Set())
  }
  const changeA4 = (d: number) => setPrefs((p) => ({ ...p, a4: Math.min(466, Math.max(415, p.a4 + d)) }))

  const shown = cents === null ? 0 : Math.max(-50, Math.min(50, cents))
  const tone = cents === null ? 'idle' : inTune ? 'good' : Math.abs(cents) <= 15 ? 'near' : 'off'

  let status: string
  if (!running) status = t('Tekan “Mulai” lalu petik satu senar.', 'Press “Start”, then pluck a string.')
  else if (cents === null) status = t('Petik satu senar…', 'Pluck a string…')
  else if (inTune) status = t('Pas!', 'In tune!')
  else if (cents < 0)
    status = chromatic ? t('Terlalu rendah', 'Too low') : t('Terlalu rendah — kencangkan senar', 'Too low — tighten the string')
  else status = chromatic ? t('Terlalu tinggi', 'Too high') : t('Terlalu tinggi — kendurkan senar', 'Too high — loosen the string')

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-5 shadow-xs sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              'flex items-baseline gap-1 font-semibold tracking-tight tabular-nums transition-colors',
              tone === 'good' ? 'text-emerald-500' : tone === 'idle' ? 'text-muted-foreground/50' : 'text-foreground',
            )}
          >
            <span className="text-7xl sm:text-8xl">{targetMidi !== null ? noteLetter(targetMidi) : '–'}</span>
            {targetMidi !== null && <span className="text-2xl text-muted-foreground">{Math.floor(targetMidi / 12) - 1}</span>}
          </div>
          <p className="mt-1 h-5 font-mono text-sm text-muted-foreground tabular-nums">
            {live
              ? `${live.freq.toFixed(1)} Hz · ${cents! > 0 ? '+' : ''}${cents!.toFixed(0)} cent`
              : targetMidi !== null
                ? `${midiToFreq(targetMidi, prefs.a4).toFixed(1)} Hz`
                : ''}
          </p>

          {/* -50 … +50 cent meter. */}
          <div className="relative mt-6 h-12 w-full max-w-md" aria-hidden>
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
            <div className="absolute top-1/2 left-1/2 h-4 w-[10%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/20" />
            {[-50, -25, 0, 25, 50].map((c) => (
              <span
                key={c}
                className={cn('absolute top-1/2 w-px -translate-y-1/2 bg-border', c === 0 ? 'h-8 bg-foreground/40' : 'h-4')}
                style={{ left: `${50 + c}%` }}
              />
            ))}
            <span
              className={cn(
                'absolute top-1/2 h-10 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,background-color] duration-150',
                tone === 'good' && 'bg-emerald-500',
                tone === 'near' && 'bg-amber-500',
                tone === 'off' && 'bg-rose-500',
                tone === 'idle' && 'bg-muted-foreground/30',
              )}
              style={{ left: `${50 + shown}%` }}
            />
          </div>
          <div className="flex w-full max-w-md justify-between font-mono text-[11px] text-muted-foreground">
            <span>♭ −50</span>
            <span>0</span>
            <span>+50 ♯</span>
          </div>

          <p
            role="status"
            className={cn('mt-4 min-h-6 font-medium', tone === 'good' ? 'text-emerald-500' : 'text-foreground')}
          >
            {status}
          </p>

          <div className="mt-5">
            {running ? (
              <Button variant="outline" onClick={stop}>
                <MicOff /> {t('Berhenti', 'Stop')}
              </Button>
            ) : (
              <Button onClick={start}>
                <Mic /> {t('Mulai', 'Start')}
              </Button>
            )}
          </div>
        </div>

        {!chromatic && (
          <div className="mt-8 border-t pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t('Senar — ketuk untuk mengunci & dengar nadanya', 'Strings — tap to lock on and hear the note')}
              </p>
              <button
                type="button"
                onClick={() => setTarget(null)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  target === null ? 'border-transparent bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t('Otomatis', 'Auto')}
              </button>
            </div>
            <div
              className="mt-3 grid gap-1.5 sm:mx-auto sm:flex sm:w-fit sm:gap-3"
              style={{ gridTemplateColumns: `repeat(${tuning.strings.length}, minmax(0, 1fr))` }}
            >
              {tuning.strings.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setTarget(i)
                    playTone(m)
                  }}
                  aria-label={`${t('Senar', 'String')} ${tuning.strings.length - i}: ${noteName(m)}`}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-xl border bg-background transition-colors sm:size-16 sm:rounded-2xl',
                    targetIndex === i ? 'border-brand-2 ring-2 ring-brand-2/30' : 'hover:border-foreground/30',
                  )}
                >
                  <span className="text-lg font-semibold">{noteLetter(m)}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{noteName(m)}</span>
                  {tuned.has(i) && (
                    <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
                      <Check className="size-3" />
                    </span>
                  )}
                  {target === i && <Volume2 className="absolute bottom-1 left-1 size-3 text-muted-foreground" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t('Nada acuan (drone)', 'Reference tone (drone)')}</p>
            <p className="text-xs text-muted-foreground">
              {t('Berbunyi terus sampai dimatikan — untuk menyetem dengan telinga.', 'Keeps sounding until you stop it — for tuning by ear.')}
            </p>
          </div>
          {drone !== null ? (
            <Button variant="outline" onClick={stopDrone}>
              <Square /> {t('Matikan', 'Stop')} · {noteName(drone)}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => startDrone(droneNote)}>
              <Volume2 /> {t('Bunyikan', 'Play')} · {noteName(droneNote)}
            </Button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            aria-label={t('Nada drone', 'Drone note')}
            value={droneNote}
            onChange={(e) => {
              const m = Number(e.target.value)
              setDroneNote(m)
              if (drone !== null) startDrone(m)
            }}
            className="h-10 rounded-xl border bg-background px-3 text-sm"
          >
            {Array.from({ length: DRONE_MAX - DRONE_MIN + 1 }, (_, i) => DRONE_MIN + i).map((m) => (
              <option key={m} value={m}>
                {noteName(m)} · {midiToFreq(m, prefs.a4).toFixed(1)} Hz
              </option>
            ))}
          </select>
          {!chromatic &&
            tuning.strings.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setDroneNote(m)
                  startDrone(m)
                }}
                className={cn(
                  'h-10 min-w-10 rounded-xl border px-3 text-sm font-medium transition-colors',
                  drone === m ? 'border-brand-2 ring-2 ring-brand-2/30' : 'hover:border-foreground/30',
                )}
              >
                {noteLetter(m)}
              </button>
            ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t(
            'Matikan drone sebelum memakai mikrofon, supaya suaranya tidak terbaca sebagai nada senar.',
            'Stop the drone before using the microphone, so its sound is not read as the string.',
          )}
        </p>
      </div>

      {error && <ErrorNote message={error} />}

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="space-y-2">
          <span className="block text-xs font-medium text-muted-foreground">{t('Instrumen & tuning', 'Instrument & tuning')}</span>
          <select
            value={tuning.id}
            onChange={(e) => changeTuning(e.target.value)}
            className="h-10 w-full rounded-xl border bg-card px-3 text-sm"
          >
            {TUNINGS.map((x) => (
              <option key={x.id} value={x.id}>
                {lang === 'en' ? x.label[1] : x.label[0]}
                {x.strings.length ? ` — ${x.strings.map((m) => noteLetter(m)).join(' ')}` : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-2">
          <span className="block text-xs font-medium text-muted-foreground">{t('Nada acuan A4', 'Reference A4')}</span>
          <div className="flex h-10 items-center gap-1 rounded-xl border bg-card px-1">
            <button
              type="button"
              aria-label={t('Turunkan', 'Lower')}
              onClick={() => changeA4(-1)}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-16 text-center font-mono text-sm tabular-nums">{prefs.a4} Hz</span>
            <button
              type="button"
              aria-label={t('Naikkan', 'Raise')}
              onClick={() => changeA4(1)}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t(
          'Petik satu senar saja dan biarkan berbunyi. Suara dari mikrofon dianalisis langsung di browser ini dan tidak direkam atau dikirim ke mana pun. Di tempat bising, dekatkan gitar ke mikrofon.',
          'Pluck one string at a time and let it ring. The microphone sound is analysed right in this browser and is never recorded or sent anywhere. In a noisy room, hold the guitar close to the microphone.',
        )}
      </p>
    </div>
  )
}
