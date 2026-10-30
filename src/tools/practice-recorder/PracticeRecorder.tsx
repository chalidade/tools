import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, Mic, Play, RotateCcw, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { useT, tr } from '@/lib/i18n'
import { timestampName } from '@/lib/local-store'
import {
  AUDIO_OUTPUTS,
  NoEncoderError,
  convertMedia,
  ensureAudioEncoder,
  formatDuration,
  hasWebCodecs,
  isCanceled,
  type AudioOut,
} from '@/lib/media'
import { click } from '@/tools/metronome/click'
import { canRecord, extensionOf, pickMimeType } from '@/tools/audio-recorder/recorder'

/*
 * The metronome plays only through the speakers; the recording is the raw
 * microphone stream, so the click is never in the file (use headphones, or the
 * mic hears the speakers). Beat k of the take sits at k × 60/bpm after the
 * recording started, which is what lets playback lay a click back over it.
 */

type Phase = 'idle' | 'starting' | 'recording' | 'ready' | 'playing'

interface Take {
  blob: Blob
  mimeType: string
  bpm: number
  beats: number
  duration: number
  buffer: AudioBuffer | null
}

const STORE = 'tools:practice-recorder'
const LOOKAHEAD = 0.15

interface Prefs {
  bpm: number
  beats: number
  countIn: boolean
  nudge: number
}

function loadPrefs(): Prefs {
  const fallback = { bpm: 90, beats: 4, countIn: true, nudge: 0 }
  try {
    const p = { ...fallback, ...JSON.parse(localStorage.getItem(STORE) ?? '{}') }
    return {
      bpm: Math.min(240, Math.max(40, Math.round(p.bpm) || 90)),
      beats: Math.min(12, Math.max(1, Math.round(p.beats) || 4)),
      countIn: p.countIn !== false,
      nudge: Math.min(200, Math.max(-200, Math.round(p.nudge) || 0)),
    }
  } catch {
    return fallback
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
  return tr('Mikrofon tidak bisa dibuka di browser ini.', "The microphone can't be opened in this browser.")
}

export default function PracticeRecorder() {
  const t = useT()
  const supported = canRecord()
  const [prefs, setPrefs] = useState(loadPrefs)
  const [phase, setPhase] = useState<Phase>('idle')
  const [take, setTake] = useState<Take | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [lit, setLit] = useState(-1)
  const [counting, setCounting] = useState(false)
  const [withClick, setWithClick] = useState(true)
  const [format, setFormat] = useState<AudioOut>('wav')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<number | null>(null)

  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const clickRef = useRef(withClick)
  clickRef.current = withClick
  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const discard = useRef(false)
  /** Everything that keeps running while a take records or plays: intervals, frames, the start timeout. */
  const stops = useRef<(() => void)[]>([])
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(prefs))
    } catch {
      /* private mode */
    }
  }, [prefs])

  const ctx = () => (ctxRef.current ??= new AudioContext())

  const clearTimers = () => {
    for (const stop of stops.current.splice(0)) stop()
  }
  const every = (fn: () => void, ms: number) => {
    const id = window.setInterval(fn, ms)
    stops.current.push(() => clearInterval(id))
  }
  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }
  const cleanup = () => {
    clearTimers()
    releaseMic()
    try {
      sourceRef.current?.stop()
    } catch {
      /* already stopped */
    }
    sourceRef.current = null
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      discard.current = true
      recorderRef.current.stop()
    }
  }
  const cleanupRef = useRef(cleanup)
  cleanupRef.current = cleanup
  /** Set on unmount, so a mic prompt answered afterwards releases its stream instead of recording. */
  const gone = useRef(false)
  useEffect(() => {
    gone.current = false // StrictMode remounts after a cleanup
    return () => {
      gone.current = true
      cleanupRef.current()
      void ctxRef.current?.close().catch(() => {})
    }
  }, [])

  /**
   * Clicks for beats k = 0, 1, 2… at `origin + k × beat` (AudioContext time),
   * kept just ahead of the clock. `from` skips beats already past.
   */
  function runClicks(audio: AudioContext, origin: number, bpm: number, beats: number, opts: { countIn: number; shift: number; until: number }) {
    const beatLen = 60 / bpm
    const queue: { time: number; beat: number; count: boolean }[] = []
    // k runs from −countIn, so the count-in is the bar before the take.
    let k = -opts.countIn
    const schedule = () => {
      for (;;) {
        const time = origin + k * beatLen + opts.shift
        if (time >= opts.until || time >= audio.currentTime + LOOKAHEAD) break
        if (time >= audio.currentTime - 0.01 && clickRef.current) {
          const inBar = ((k % beats) + beats) % beats
          click(audio, Math.max(time, audio.currentTime), inBar === 0 && beats > 1 ? 'accent' : 'beat')
        }
        queue.push({ time, beat: ((k % beats) + beats) % beats, count: k < 0 })
        k++
      }
    }
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      while (queue.length && queue[0].time <= audio.currentTime) {
        const q = queue.shift()!
        setLit(q.beat)
        setCounting(q.count)
      }
    }
    schedule()
    every(schedule, 25)
    raf = requestAnimationFrame(draw)
    stops.current.push(() => cancelAnimationFrame(raf))
  }

  async function record() {
    setError('')
    setPhase('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      if (gone.current) return stream.getTracks().forEach((track) => track.stop())
      streamRef.current = stream
      const audio = ctx()
      await audio.resume()
      const { bpm, beats, countIn } = prefsRef.current
      const mimeType = pickMimeType() ?? ''
      const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 192_000 })
      chunks.current = []
      discard.current = false
      recorder.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      let duration = 0
      recorder.onstop = () => {
        releaseMic()
        const blob = new Blob(chunks.current, { type: recorder.mimeType || mimeType || 'audio/webm' })
        chunks.current = []
        clearTimers()
        setLit(-1)
        setCounting(false)
        if (discard.current || !blob.size) return setPhase('idle')
        setTake({ blob, mimeType: blob.type, bpm, beats, duration, buffer: null })
        setPhase('ready')
      }
      recorderRef.current = recorder

      // The take starts on a beat: after one bar of count-in, or straight away.
      const origin = audio.currentTime + 0.15 + (countIn ? (60 / bpm) * beats : 0)
      runClicks(audio, origin, bpm, beats, { countIn: countIn ? beats : 0, shift: 0, until: Infinity })
      const startAt = (origin - audio.currentTime) * 1000
      const startTimer = window.setTimeout(() => {
        if (recorder.state === 'inactive') recorder.start(1000)
        setCounting(false)
      }, Math.max(0, startAt))
      stops.current.push(() => clearTimeout(startTimer))
      every(() => {
        const e = Math.max(0, audio.currentTime - origin)
        duration = e
        setElapsed(e)
      }, 100)
      setElapsed(0)
      setPhase('recording')
    } catch (e) {
      cleanup()
      setPhase('idle')
      setError(micError(e))
    }
  }

  function finish() {
    const r = recorderRef.current
    if (r && r.state !== 'inactive') r.stop()
    else {
      // Stopped during the count-in: nothing recorded.
      discard.current = true
      clearTimers()
      releaseMic()
      setLit(-1)
      setCounting(false)
      setPhase('idle')
    }
  }

  async function play() {
    if (!take) return
    setError('')
    const audio = ctx()
    await audio.resume()
    let buffer = take.buffer
    if (!buffer) {
      try {
        buffer = await audio.decodeAudioData(await take.blob.arrayBuffer())
      } catch {
        return setError(t('Rekaman ini tidak bisa diputar ulang di browser ini.', "This recording can't be played back in this browser."))
      }
      setTake({ ...take, buffer })
    }
    const src = audio.createBufferSource()
    src.buffer = buffer
    src.connect(audio.destination)
    const at = audio.currentTime + 0.15
    src.onended = () => {
      if (sourceRef.current !== src) return
      sourceRef.current = null
      clearTimers()
      setLit(-1)
      setPhase('ready')
      setElapsed(0)
    }
    sourceRef.current = src
    src.start(at)
    runClicks(audio, at, take.bpm, take.beats, {
      countIn: 0,
      shift: prefsRef.current.nudge / 1000,
      until: at + buffer.duration,
    })
    every(() => setElapsed(Math.max(0, audio.currentTime - at)), 100)
    setPhase('playing')
  }

  function stopPlayback() {
    const src = sourceRef.current
    sourceRef.current = null
    try {
      src?.stop()
    } catch {
      /* not started */
    }
    clearTimers()
    setLit(-1)
    setElapsed(0)
    setPhase('ready')
  }

  function again() {
    setTake(null)
    setElapsed(0)
    setError('')
    setPhase('idle')
  }

  async function save() {
    if (!take) return
    setError('')
    setProgress(0)
    try {
      const choice = AUDIO_OUTPUTS[format]
      if (choice.codec && !(await ensureAudioEncoder(choice.codec))) throw new NoEncoderError(format)
      const name = timestampName(tr('Latihan', 'Practice'))
      const blob = await convertMedia({
        file: new File([take.blob], `${name}.${extensionOf(take.mimeType)}`, { type: take.mimeType }),
        format: choice.format,
        mimeType: choice.mimeType,
        audio: choice.codec ? { codec: choice.codec, bitrate: 192_000 } : { codec: 'pcm-s16' },
        onProgress: setProgress,
      })
      downloadBlob(blob, `${name.replace(/[\\/:*?"<>|]+/g, '-')}.${choice.ext}`)
    } catch (e) {
      if (!isCanceled(e))
        setError(
          e instanceof NoEncoderError
            ? t('Browser ini tidak punya pengode untuk format itu. Coba WAV.', "This browser has no encoder for that format. Try WAV.")
            : t('Rekaman tidak bisa diubah ke format itu.', "The recording couldn't be converted to that format."),
        )
    } finally {
      setProgress(null)
    }
  }

  if (!supported)
    return (
      <ErrorNote
        message={t(
          'Browser ini tidak bisa merekam suara dari halaman web. Coba Chrome, Edge, Firefox, atau Safari versi terbaru.',
          "This browser can't record audio from a web page. Try the latest Chrome, Edge, Firefox, or Safari.",
        )}
      />
    )

  const busy = phase === 'starting' || phase === 'recording'
  const setPref = (patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch }))
  const shownBeats = take && !busy ? take.beats : prefs.beats

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-5 shadow-xs sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className={cn(
                'size-2.5 rounded-full',
                phase === 'recording' && !counting ? 'animate-pulse bg-red-500' : 'bg-muted-foreground/40',
              )}
            />
            {phase === 'recording'
              ? counting
                ? t('Hitung masuk…', 'Count-in…')
                : t('Merekam', 'Recording')
              : phase === 'playing'
                ? t('Memutar ulang', 'Playing back')
                : phase === 'ready'
                  ? t('Rekaman siap', 'Take ready')
                  : phase === 'starting'
                    ? t('Membuka mikrofon…', 'Opening microphone…')
                    : t('Siap merekam', 'Ready to record')}
          </div>
          <p className="mt-3 font-mono text-5xl font-medium tracking-tight tabular-nums sm:text-6xl">
            {formatDuration(phase === 'ready' && take ? take.duration : elapsed)}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2" aria-hidden>
            {Array.from({ length: shownBeats }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'size-5 rounded-full border-2 transition-colors duration-75',
                  lit === i ? (i === 0 ? 'border-brand-2 bg-brand-2' : 'border-foreground bg-foreground') : 'border-border',
                )}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {phase === 'idle' || phase === 'starting' ? (
              <Button size="lg" onClick={record} disabled={phase === 'starting'} className="min-w-36">
                {phase === 'starting' ? <Loader2 className="animate-spin" /> : <Mic />}
                {t('Rekam', 'Record')}
              </Button>
            ) : phase === 'recording' ? (
              <Button size="lg" variant="destructive" onClick={finish} className="min-w-36">
                <Square /> {t('Selesai', 'Stop')}
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={phase === 'playing' ? stopPlayback : play} className="min-w-36">
                  {phase === 'playing' ? <Square /> : <Play />}
                  {phase === 'playing' ? t('Berhenti', 'Stop') : t('Putar ulang', 'Play back')}
                </Button>
                <Button size="lg" variant="outline" onClick={again} disabled={phase === 'playing' || progress !== null}>
                  <RotateCcw /> {t('Rekam lagi', 'Record again')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorNote message={error} />}

      <div className="flex flex-wrap items-end gap-6">
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Tempo: {prefs.bpm} BPM</span>
          <input
            type="range"
            min={40}
            max={240}
            value={prefs.bpm}
            disabled={phase !== 'idle'}
            onChange={(e) => setPref({ bpm: Number(e.target.value) })}
            aria-label="BPM"
            className="block w-48 accent-[var(--brand-2)]"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">{t('Ketukan per birama', 'Beats per bar')}</span>
          <select
            value={prefs.beats}
            disabled={phase !== 'idle'}
            onChange={(e) => setPref({ beats: Number(e.target.value) })}
            className="block h-10 rounded-xl border bg-card px-3 text-sm"
          >
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <Segmented
          label={t('Hitung masuk satu birama', 'One-bar count-in')}
          value={prefs.countIn ? 1 : 0}
          disabled={phase !== 'idle'}
          options={[
            { value: 1, label: t('Ya', 'On') },
            { value: 0, label: t('Tidak', 'Off') },
          ]}
          onChange={(v) => setPref({ countIn: v === 1 })}
        />
        <Segmented
          label={t('Klik saat rekam & putar ulang', 'Click while recording & playback')}
          value={withClick ? 1 : 0}
          options={[
            { value: 1, label: t('Ya', 'On') },
            { value: 0, label: t('Tidak', 'Off') },
          ]}
          onChange={(v) => setWithClick(v === 1)}
        />
      </div>

      {take && (
        <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
          <label className="block space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t('Geser klik saat putar ulang', 'Shift the click on playback')}: {prefs.nudge > 0 ? '+' : ''}
              {prefs.nudge} ms
            </span>
            <input
              type="range"
              min={-200}
              max={200}
              step={5}
              value={prefs.nudge}
              disabled={phase === 'playing'}
              onChange={(e) => setPref({ nudge: Number(e.target.value) })}
              aria-label={t('Geser klik', 'Click shift')}
              className="block w-full max-w-md accent-[var(--brand-2)]"
            />
            <span className="block text-xs text-muted-foreground">
              {t(
                'Kalau klik terdengar sedikit mendahului atau tertinggal dari permainanmu, geser di sini. Ini hanya mengubah putar ulang, bukan file-nya.',
                "If the click sounds slightly ahead of or behind your playing, nudge it here. It only changes playback, not the file.",
              )}
            </span>
          </label>
          <div className="flex flex-wrap items-end gap-4">
            <Segmented
              label={t('Simpan sebagai', 'Save as')}
              value={format}
              disabled={progress !== null}
              options={[
                { value: 'wav', label: 'WAV' },
                ...(hasWebCodecs()
                  ? [
                      { value: 'mp3' as const, label: 'MP3' },
                      { value: 'm4a' as const, label: 'M4A' },
                    ]
                  : []),
              ]}
              onChange={setFormat}
            />
            <Button onClick={save} disabled={progress !== null || phase === 'playing'}>
              {progress !== null ? <Loader2 className="animate-spin" /> : <Download />}
              {progress !== null ? `${Math.round(progress * 100)}%` : t('Unduh rekaman', 'Download take')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('File berisi suaramu saja, tanpa klik metronom.', 'The file holds only your playing, without the metronome click.')}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Pakai headphone supaya klik metronom tidak masuk lewat mikrofon. Rekaman tidak dikirim ke mana pun dan hilang saat halaman ditutup.',
          "Use headphones so the click doesn't leak into the microphone. Nothing is uploaded, and the take is gone when you close the page.",
        )}
      </p>
    </div>
  )
}
