import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Mic, Pause, Play, Square, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { fixRecordedDuration } from '@/lib/local-store'
import { formatDuration, formatSize, hasWebCodecs, isCanceled, type AudioOut } from '@/lib/media'
import {
  canRecord,
  convertRecording,
  defaultName,
  deleteRecording,
  extensionOf,
  listRecordings,
  pickMimeType,
  safeFileName,
  saveRecording,
  type Recording,
} from './recorder'

type Phase = 'idle' | 'starting' | 'recording' | 'paused'
type Mode = 'speech' | 'raw'

const MODES: { value: Mode; label: string }[] = [
  { value: 'speech', label: 'Suara bicara' },
  { value: 'raw', label: 'Asli / musik' },
]
const MODE_HINT: Record<Mode, string> = {
  speech: 'Peredam bising, peredam gema, dan penyesuai volume otomatis aktif — pas untuk rapat, kuliah, dan voice note.',
  raw: 'Tanpa pemrosesan, stereo bila mikrofon mendukung — pas untuk musik dan suara sekitar.',
}

function micError(e: unknown) {
  const name = (e as DOMException)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Izin mikrofon ditolak. Klik ikon gembok di samping alamat situs, izinkan Mikrofon, lalu coba lagi.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Tidak ada mikrofon yang terdeteksi di perangkat ini.'
  if (name === 'NotReadableError') return 'Mikrofon sedang dipakai aplikasi lain. Tutup aplikasi itu, lalu coba lagi.'
  return 'Mikrofon tidak bisa dibuka di browser ini.'
}

export default function AudioRecorder() {
  const supported = useMemo(canRecord, [])
  const [phase, setPhase] = useState<Phase>('idle')
  const [mode, setMode] = useState<Mode>('speech')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [recordings, setRecordings] = useState<Recording[]>([])

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const discard = useRef(false)
  // Time recorded so far = finished segments + the running one.
  const clock = useRef({ done: 0, since: 0 })
  const audioCtx = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const peaks = useRef<number[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)

  const refresh = useCallback(() => {
    listRecordings()
      .then(setRecordings)
      .catch(() => setError('Penyimpanan browser tidak bisa dibuka (mode privat?). Rekaman tetap bisa diunduh.'))
  }, [])
  useEffect(refresh, [refresh])

  // Labels only show once the page has microphone permission.
  const loadDevices = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices()
    setDevices(all.filter((d) => d.kind === 'audioinput' && d.deviceId))
  }, [])
  useEffect(() => {
    if (!supported) return
    void loadDevices()
    navigator.mediaDevices.addEventListener('devicechange', loadDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadDevices)
  }, [supported, loadDevices])

  const seconds = () => {
    const c = clock.current
    return (c.done + (c.since ? performance.now() - c.since : 0)) / 1000
  }

  // ------------------------------------------------------------- live waveform

  const draw = useCallback(() => {
    raf.current = requestAnimationFrame(draw)
    const canvas = canvasRef.current
    const node = analyser.current
    if (!canvas || !node) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr)
    if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr)

    if (recorderRef.current?.state === 'recording') {
      const data = new Float32Array(node.fftSize)
      node.getFloatTimeDomainData(data)
      let peak = 0
      for (const v of data) peak = Math.max(peak, Math.abs(v))
      // Square root lifts quiet speech so it's visible without clipping loud parts.
      peaks.current.push(Math.min(1, Math.sqrt(peak) * 1.15))
      const max = Math.ceil(w / 4)
      if (peaks.current.length > max) peaks.current.splice(0, peaks.current.length - max)
      setElapsed(seconds())
    }

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const style = getComputedStyle(canvas)
    ctx.fillStyle = style.color
    const list = peaks.current
    // Newest on the right, scrolling left.
    for (let i = 0; i < list.length; i++) {
      const x = w - (list.length - i) * 4
      const bar = Math.max(2, list[i] * (h - 8))
      ctx.globalAlpha = 0.35 + 0.65 * (i / list.length)
      ctx.beginPath()
      ctx.roundRect(x, (h - bar) / 2, 2.5, bar, 1.25)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [])

  // ------------------------------------------------------------- controls

  const cleanup = useCallback(() => {
    cancelAnimationFrame(raf.current)
    raf.current = 0
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void audioCtx.current?.close()
    audioCtx.current = null
    analyser.current = null
  }, [])
  // Leaving the page mid-take (another tool, the home page) stops and keeps it.
  useEffect(
    () => () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      cleanup()
    },
    [cleanup],
  )

  // Leaving mid-recording would lose it.
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [phase])

  async function start() {
    setError('')
    setPhase('starting')
    const speech = mode === 'speech'
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: speech,
          noiseSuppression: speech,
          autoGainControl: speech,
          channelCount: speech ? 1 : 2,
        },
      })
      streamRef.current = stream
      void loadDevices()

      const ctx = new AudioContext()
      const node = ctx.createAnalyser()
      node.fftSize = 1024
      ctx.createMediaStreamSource(stream).connect(node)
      audioCtx.current = ctx
      analyser.current = node

      const mimeType = pickMimeType() ?? ''
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: speech ? 96_000 : 192_000,
      })
      chunks.current = []
      discard.current = false
      recorder.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      recorder.onstop = () => void finish(recorder.mimeType || mimeType || 'audio/webm')
      recorderRef.current = recorder

      peaks.current = []
      clock.current = { done: 0, since: performance.now() }
      setElapsed(0)
      // A chunk every second, so a long take never sits in one giant buffer.
      recorder.start(1000)
      setPhase('recording')
      if (!raf.current) draw()
    } catch (e) {
      cleanup()
      setPhase('idle')
      setError(micError(e))
    }
  }

  async function finish(mimeType: string) {
    const duration = seconds()
    clock.current = { done: 0, since: 0 }
    cleanup()
    setPhase('idle')
    const blob = new Blob(chunks.current, { type: mimeType })
    chunks.current = []
    if (discard.current || !blob.size) return
    const recording: Recording = {
      id: Math.random().toString(36).slice(2, 10),
      name: defaultName(),
      createdAt: Date.now(),
      duration,
      mimeType,
      blob,
    }
    setRecordings((list) => [recording, ...list])
    try {
      await saveRecording(recording)
    } catch {
      setError('Rekaman tidak bisa disimpan di browser ini (penyimpanan penuh atau mode privat). Unduh sekarang agar tidak hilang.')
    }
  }

  function pause() {
    const r = recorderRef.current
    if (!r || r.state !== 'recording') return
    r.pause()
    clock.current = { done: seconds() * 1000, since: 0 }
    setPhase('paused')
  }
  function resume() {
    const r = recorderRef.current
    if (!r || r.state !== 'paused') return
    r.resume()
    clock.current.since = performance.now()
    setPhase('recording')
  }
  function stop(keep = true) {
    const r = recorderRef.current
    if (!r || r.state === 'inactive') return
    discard.current = !keep
    if (r.state === 'paused') clock.current.since = 0
    else clock.current = { done: seconds() * 1000, since: 0 }
    r.stop()
  }

  // ------------------------------------------------------------- list actions

  const rename = (r: Recording, name: string) => {
    const next = { ...r, name: name.trim() || r.name }
    setRecordings((list) => list.map((x) => (x.id === r.id ? next : x)))
    void saveRecording(next).catch(() => {})
  }
  const remove = (r: Recording) => {
    setRecordings((list) => list.filter((x) => x.id !== r.id))
    void deleteRecording(r.id).catch(() => {})
  }

  if (!supported)
    return (
      <ErrorNote message="Browser ini tidak bisa merekam suara dari halaman web. Coba Chrome, Edge, Firefox, atau Safari versi terbaru." />
    )

  const active = phase === 'recording' || phase === 'paused'

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border bg-card shadow-xs">
        <div className="px-5 pt-8 pb-6 sm:px-8">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span
              className={cn(
                'size-2.5 rounded-full',
                phase === 'recording' ? 'animate-pulse bg-red-500' : phase === 'paused' ? 'bg-amber-500' : 'bg-muted-foreground/40',
              )}
            />
            {phase === 'recording' ? 'Merekam' : phase === 'paused' ? 'Dijeda' : phase === 'starting' ? 'Membuka mikrofon…' : 'Siap merekam'}
          </div>
          <p className="mt-3 text-center font-mono text-5xl font-medium tracking-tight tabular-nums sm:text-6xl">
            {formatDuration(elapsed)}
            <span className="text-2xl text-muted-foreground">.{String(Math.floor((elapsed % 1) * 10))}</span>
          </p>
          <div className="relative mt-6 h-24">
            <canvas
              ref={canvasRef}
              aria-hidden
              className={cn('size-full', phase === 'paused' ? 'text-amber-500' : 'text-red-500')}
            />
            {!active && !peaks.current.length && (
              <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Gelombang suara muncul di sini saat merekam
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            {active && (
              <button
                type="button"
                onClick={() => stop(false)}
                aria-label="Batalkan rekaman"
                title="Batalkan (tidak disimpan)"
                className="grid size-12 place-items-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="size-5" />
              </button>
            )}
            {!active ? (
              <button
                type="button"
                onClick={() => void start()}
                disabled={phase === 'starting'}
                aria-label="Mulai merekam"
                className="group grid size-20 place-items-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-transform hover:scale-105 disabled:opacity-60"
              >
                <Mic className="size-8" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => stop(true)}
                aria-label="Selesai dan simpan"
                title="Selesai & simpan"
                className="grid size-20 place-items-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-transform hover:scale-105"
              >
                <Square className="size-7 fill-current" />
              </button>
            )}
            {active && (
              <button
                type="button"
                onClick={phase === 'recording' ? pause : resume}
                aria-label={phase === 'recording' ? 'Jeda' : 'Lanjutkan'}
                title={phase === 'recording' ? 'Jeda' : 'Lanjutkan'}
                className="grid size-12 place-items-center rounded-full border bg-background transition-colors hover:bg-accent"
              >
                {phase === 'recording' ? <Pause className="size-5" /> : <Play className="size-5" />}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-5 border-t bg-muted/30 px-5 py-5 sm:grid-cols-[1fr_auto] sm:px-8">
          <label className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Mikrofon</span>
            <select
              value={deviceId}
              disabled={active}
              onChange={(e) => setDeviceId(e.target.value)}
              className="h-10 w-full rounded-xl border bg-background px-3 text-sm disabled:opacity-60"
            >
              <option value="">Bawaan sistem</option>
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Mikrofon ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2">
            <Segmented label="Mode" value={mode} options={MODES} onChange={setMode} disabled={active} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">{MODE_HINT[mode]}</p>
        </div>
      </div>

      {error && <ErrorNote message={error} />}

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Rekaman</h2>
          <p className="text-xs text-muted-foreground">Tersimpan di browser ini saja</p>
        </div>
        {recordings.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada rekaman. Tekan tombol merah untuk mulai.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recordings.map((r) => (
              <RecordingRow key={r.id} recording={r} onRename={(n) => rename(r, n)} onDelete={() => remove(r)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

const OUTPUTS: { value: AudioOut; label: string }[] = [
  { value: 'mp3', label: 'MP3' },
  { value: 'm4a', label: 'M4A' },
  { value: 'wav', label: 'WAV' },
]

function RecordingRow({
  recording,
  onRename,
  onDelete,
}: {
  recording: Recording
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const url = useMemo(() => URL.createObjectURL(recording.blob), [recording.blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const [name, setName] = useState(recording.name)
  const [job, setJob] = useState<{ out: AudioOut; progress: number } | null>(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const cancel = useRef<(() => void) | null>(null)
  const ext = extensionOf(recording.mimeType)
  const file = safeFileName(recording.name)

  async function save(out: AudioOut) {
    setError('')
    setJob({ out, progress: 0 })
    try {
      const blob = await convertRecording(
        recording,
        out,
        (progress) => setJob({ out, progress }),
        (c) => (cancel.current = c),
      )
      downloadBlob(blob, `${file}.${out}`)
    } catch (e) {
      if (!isCanceled(e)) setError(`Gagal mengubah ke ${out.toUpperCase()}. Unduh format aslinya (.${ext}) sebagai gantinya.`)
    } finally {
      setJob(null)
      cancel.current = null
    }
  }

  return (
    <li className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== recording.name && onRename(name)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label="Nama rekaman"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 font-medium outline-none hover:bg-muted focus:bg-muted"
        />
        <span className="font-mono text-xs text-muted-foreground">
          {formatDuration(recording.duration)} · {formatSize(recording.blob.size)} · {ext.toUpperCase()}
        </span>
      </div>
      <audio
        controls
        preload="metadata"
        src={url}
        className="mt-3 h-10 w-full"
        onLoadedMetadata={(e) => fixRecordedDuration(e.currentTarget)}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => downloadBlob(recording.blob, `${file}.${ext}`)}>
          <Download className="size-4" /> Unduh .{ext}
        </Button>
        {hasWebCodecs() && <span className="ml-1 text-xs text-muted-foreground">Ubah ke:</span>}
        {hasWebCodecs() &&
          OUTPUTS.map((o) => (
            <Button key={o.value} size="sm" variant="outline" disabled={!!job} onClick={() => void save(o.value)}>
              {job?.out === o.value ? `${Math.round(job.progress * 100)}%` : o.label}
            </Button>
          ))}
        {job && (
          <Button size="sm" variant="ghost" onClick={() => cancel.current?.()}>
            Batal
          </Button>
        )}
        {confirming ? (
          <span className="ml-auto flex items-center gap-1.5 text-sm">
            Hapus permanen?
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Hapus
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Batal
            </Button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Hapus rekaman"
            title="Hapus rekaman"
            className="ml-auto grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </li>
  )
}
