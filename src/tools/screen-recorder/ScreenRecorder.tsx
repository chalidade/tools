import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CameraOff, Download, MonitorUp, Pause, Play, Square, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { fixRecordedDuration, newId, safeFileName } from '@/lib/local-store'
import { formatDuration, formatSize, hasWebCodecs, isCanceled } from '@/lib/media'
import {
  canRecordScreen,
  defaultScreenName,
  deleteScreenRecording,
  listScreenRecordings,
  mixAudio,
  pickVideoMimeType,
  saveScreenRecording,
  toMp4,
  videoExtension,
  type ScreenRecording,
} from './screen'

type Phase = 'idle' | 'picking' | 'countdown' | 'recording' | 'paused'
type Fps = 30 | 60

const FPS_OPTIONS: { value: Fps; label: string }[] = [
  { value: 30, label: '30 fps' },
  { value: 60, label: '60 fps' },
]

function captureError(e: unknown) {
  const name = (e as DOMException)?.name
  if (name === 'NotAllowedError') return null // the visitor closed the picker: not an error
  if (name === 'NotFoundError') return 'Tidak ada layar atau jendela yang bisa direkam.'
  if (name === 'NotReadableError') return 'Layar tidak bisa direkam — mungkin sedang direkam aplikasi lain.'
  return 'Perekaman layar tidak bisa dimulai di browser ini.'
}

export default function ScreenRecorder() {
  const supported = useMemo(canRecordScreen, [])
  const pipSupported = typeof document !== 'undefined' && !!document.pictureInPictureEnabled

  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [systemAudio, setSystemAudio] = useState(true)
  const [mic, setMic] = useState(true)
  const [fps, setFps] = useState<Fps>(30)
  const [useCountdown, setUseCountdown] = useState(true)
  const [cameraOn, setCameraOn] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recordings, setRecordings] = useState<ScreenRecording[]>([])

  const previewRef = useRef<HTMLVideoElement>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const streams = useRef<MediaStream[]>([])
  const cameraStream = useRef<MediaStream | null>(null)
  const closeMix = useRef<() => void>(() => {})
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const discard = useRef(false)
  const size = useRef({ width: 0, height: 0 })
  const clock = useRef({ done: 0, since: 0 })
  const ticker = useRef(0)

  const refresh = useCallback(() => {
    listScreenRecordings()
      .then(setRecordings)
      .catch(() => setError('Penyimpanan browser tidak bisa dibuka (mode privat?). Rekaman tetap bisa diunduh.'))
  }, [])
  useEffect(refresh, [refresh])

  const seconds = () => {
    const c = clock.current
    return (c.done + (c.since ? performance.now() - c.since : 0)) / 1000
  }

  const release = useCallback(() => {
    clearInterval(ticker.current)
    streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()))
    streams.current = []
    closeMix.current()
    closeMix.current = () => {}
    if (previewRef.current) previewRef.current.srcObject = null
  }, [])

  // Leaving the page mid-take stops and keeps it; the floating camera closes too.
  useEffect(
    () => () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      else release()
      cameraStream.current?.getTracks().forEach((t) => t.stop())
      if (document.pictureInPictureElement) void document.exitPictureInPicture()
    },
    [release],
  )

  // Closing the tab mid-take would lose it.
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [phase])

  // The tab title shows the take while you're looking at another window.
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') return
    const original = document.title
    document.title = `${phase === 'recording' ? '● Merekam' : '❚❚ Dijeda'} ${formatDuration(elapsed)} — Rekam Layar`
    return () => {
      document.title = original
    }
  }, [phase, elapsed])

  // ------------------------------------------------------------- floating camera

  // Closing the floating window turns the camera off.
  useEffect(() => {
    const video = cameraRef.current
    if (!video) return
    const off = () => {
      cameraStream.current?.getTracks().forEach((t) => t.stop())
      cameraStream.current = null
      setCameraOn(false)
    }
    video.addEventListener('leavepictureinpicture', off)
    return () => video.removeEventListener('leavepictureinpicture', off)
  }, [])

  async function toggleCamera() {
    setError('')
    if (cameraOn) {
      if (document.pictureInPictureElement) await document.exitPictureInPicture().catch(() => {})
      cameraStream.current?.getTracks().forEach((t) => t.stop())
      cameraStream.current = null
      setCameraOn(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false,
      })
      cameraStream.current = stream
      const video = cameraRef.current!
      video.srcObject = stream
      await video.play()
      setCameraOn(true)
      // Always on top of every window, so recording the whole screen picks it up.
      if (pipSupported) await video.requestPictureInPicture()
    } catch {
      cameraStream.current?.getTracks().forEach((t) => t.stop())
      cameraStream.current = null
      setCameraOn(false)
      setError('Kamera tidak bisa dibuka. Pastikan izin kamera diberikan dan kamera tidak dipakai aplikasi lain.')
    }
  }

  // ------------------------------------------------------------- recording

  async function start() {
    setError('')
    setNotice('')
    setPhase('picking')
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: fps }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: systemAudio,
        // Chrome: offer "share system audio" and let the visitor switch tabs mid-share.
        ...({ systemAudio: 'include', surfaceSwitching: 'include' } as object),
      } as DisplayMediaStreamOptions)
      streams.current = [display]

      const audioTracks = [...display.getAudioTracks()]
      if (systemAudio && !audioTracks.length)
        setNotice('Suara tab/sistem tidak ikut terekam — centang "Bagikan audio" di jendela pilihan untuk menyertakannya.')
      if (mic) {
        try {
          const voice = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          })
          streams.current.push(voice)
          audioTracks.push(...voice.getAudioTracks())
        } catch {
          setNotice('Mikrofon tidak bisa dibuka, jadi rekaman ini tanpa suara mikrofon.')
        }
      }

      const [video] = display.getVideoTracks()
      const settings = video.getSettings()
      size.current = { width: settings.width ?? 0, height: settings.height ?? 0 }
      // "Stop sharing" in the browser's own bar ends the take.
      video.addEventListener('ended', () => stop(true))

      const mixed = mixAudio(audioTracks)
      closeMix.current = mixed.close
      const stream = new MediaStream([video, ...(mixed.track ? [mixed.track] : [])])
      if (previewRef.current) {
        previewRef.current.srcObject = display
        void previewRef.current.play().catch(() => {})
      }

      const mimeType = pickVideoMimeType()
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: fps === 60 ? 8_000_000 : 5_000_000,
        audioBitsPerSecond: 128_000,
      })
      chunks.current = []
      discard.current = false
      recorder.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      recorder.onstop = () => void finish(recorder.mimeType || mimeType || 'video/webm')
      recorderRef.current = recorder

      // A few seconds to switch to the window being recorded.
      if (useCountdown) {
        setPhase('countdown')
        for (let n = 3; n > 0; n--) {
          setCountdown(n)
          await new Promise((r) => setTimeout(r, 1000))
          if (video.readyState === 'ended') return
        }
      }
      clock.current = { done: 0, since: performance.now() }
      setElapsed(0)
      recorder.start(1000)
      setPhase('recording')
      ticker.current = window.setInterval(() => setElapsed(seconds()), 250)
    } catch (e) {
      release()
      setPhase('idle')
      const message = captureError(e)
      if (message) setError(message)
    }
  }

  async function finish(mimeType: string) {
    const duration = seconds()
    clock.current = { done: 0, since: 0 }
    release()
    setPhase('idle')
    setElapsed(0)
    const blob = new Blob(chunks.current, { type: mimeType })
    chunks.current = []
    recorderRef.current = null
    if (discard.current || !blob.size) return
    const recording: ScreenRecording = {
      id: newId(),
      name: defaultScreenName(),
      createdAt: Date.now(),
      duration,
      mimeType,
      ...size.current,
      blob,
    }
    setRecordings((list) => [recording, ...list])
    try {
      await saveScreenRecording(recording)
    } catch {
      setError('Rekaman terlalu besar untuk disimpan di browser ini. Unduh sekarang agar tidak hilang saat halaman ditutup.')
    }
  }

  function pause() {
    const r = recorderRef.current
    if (r?.state !== 'recording') return
    r.pause()
    clock.current = { done: seconds() * 1000, since: 0 }
    setPhase('paused')
  }
  function resume() {
    const r = recorderRef.current
    if (r?.state !== 'paused') return
    r.resume()
    clock.current.since = performance.now()
    setPhase('recording')
  }
  function stop(keep: boolean) {
    const r = recorderRef.current
    if (!r || r.state === 'inactive') {
      // Ended during the countdown: nothing was recorded yet.
      release()
      recorderRef.current = null
      setPhase('idle')
      return
    }
    discard.current = !keep
    if (r.state === 'recording') clock.current = { done: seconds() * 1000, since: 0 }
    r.stop()
  }

  const rename = (r: ScreenRecording, name: string) => {
    const next = { ...r, name: name.trim() || r.name }
    setRecordings((list) => list.map((x) => (x.id === r.id ? next : x)))
    void saveScreenRecording(next).catch(() => {})
  }
  const remove = (r: ScreenRecording) => {
    setRecordings((list) => list.filter((x) => x.id !== r.id))
    void deleteScreenRecording(r.id).catch(() => {})
  }

  if (!supported)
    return (
      <ErrorNote message="Perekaman layar hanya bisa di browser komputer (Chrome, Edge, Firefox, atau Safari versi terbaru) — ponsel dan tablet belum mengizinkan situs web merekam layar." />
    )

  const active = phase === 'recording' || phase === 'paused'
  const busy = phase !== 'idle'

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border bg-card shadow-xs">
        {/* Preview */}
        <div className="relative aspect-video bg-zinc-950">
          <video ref={previewRef} muted playsInline className={cn('size-full object-contain', !busy && 'hidden')} />
          {!busy && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                <button
                  type="button"
                  onClick={() => void start()}
                  className="mx-auto grid size-20 place-items-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-transform hover:scale-105"
                  aria-label="Mulai rekam layar"
                >
                  <MonitorUp className="size-8" />
                </button>
                <p className="mt-4 font-medium text-white">Mulai rekam layar</p>
                <p className="mt-1 text-sm text-zinc-400">Pilih seluruh layar, satu jendela, atau satu tab browser.</p>
              </div>
            </div>
          )}
          {phase === 'picking' && (
            <p className="absolute inset-0 grid place-items-center text-sm text-zinc-400">Pilih apa yang mau direkam…</p>
          )}
          {phase === 'countdown' && (
            <div className="absolute inset-0 grid place-items-center bg-black/50">
              <span key={countdown} className="animate-in zoom-in-50 fade-in text-8xl font-semibold text-white tabular-nums">
                {countdown}
              </span>
            </div>
          )}
          {active && (
            <span className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 font-mono text-sm text-white backdrop-blur">
              <span className={cn('size-2.5 rounded-full', phase === 'recording' ? 'animate-pulse bg-red-500' : 'bg-amber-400')} />
              {phase === 'recording' ? 'REC' : 'JEDA'} {formatDuration(elapsed)}
            </span>
          )}
        </div>

        {/* Controls while recording */}
        {(active || phase === 'countdown') && (
          <div className="flex items-center justify-center gap-4 border-t px-5 py-4">
            <button
              type="button"
              onClick={() => stop(false)}
              aria-label="Batalkan rekaman"
              title="Batalkan (tidak disimpan)"
              className="grid size-11 place-items-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => stop(true)}
              disabled={!active}
              aria-label="Selesai dan simpan"
              title="Selesai & simpan"
              className="grid size-14 place-items-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-transform hover:scale-105 disabled:opacity-50"
            >
              <Square className="size-6 fill-current" />
            </button>
            <button
              type="button"
              onClick={phase === 'recording' ? pause : resume}
              disabled={!active}
              aria-label={phase === 'paused' ? 'Lanjutkan' : 'Jeda'}
              title={phase === 'paused' ? 'Lanjutkan' : 'Jeda'}
              className="grid size-11 place-items-center rounded-full border bg-background transition-colors hover:bg-accent disabled:opacity-50"
            >
              {phase === 'paused' ? <Play className="size-5" /> : <Pause className="size-5" />}
            </button>
          </div>
        )}

        {/* Settings */}
        <div className="grid gap-5 border-t bg-muted/30 px-5 py-5 sm:grid-cols-2 sm:px-8">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Suara</p>
            <Toggle checked={systemAudio} disabled={busy} onChange={setSystemAudio}>
              Suara tab / sistem
            </Toggle>
            <Toggle checked={mic} disabled={busy} onChange={setMic}>
              Mikrofon (suaramu)
            </Toggle>
          </div>
          <div className="space-y-3">
            <Segmented label="Kehalusan gerak" value={fps} options={FPS_OPTIONS} onChange={setFps} disabled={busy} />
            <Toggle checked={useCountdown} disabled={busy} onChange={setUseCountdown}>
              Hitung mundur 3 detik sebelum mulai
            </Toggle>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <video
              ref={cameraRef}
              muted
              playsInline
              className={cn('size-14 rounded-full object-cover -scale-x-100', !cameraOn && 'hidden')}
            />
            <Button variant="outline" size="sm" onClick={() => void toggleCamera()}>
              {cameraOn ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
              {cameraOn ? 'Matikan kamera' : 'Tampilkan kamera melayang'}
            </Button>
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
              {pipSupported
                ? 'Wajahmu tampil di jendela kecil yang selalu di atas — ikut terekam saat kamu merekam seluruh layar.'
                : 'Browser ini tidak punya jendela melayang (picture-in-picture), jadi kamera hanya tampil di halaman ini.'}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">
            Di Chrome dan Edge, centang <b>Bagikan audio</b> di jendela pilihan agar suara tab (atau seluruh sistem, di
            Windows) ikut terekam. Hentikan kapan saja dengan tombol merah di sini atau "Berhenti berbagi" milik
            browser.
          </p>
        </div>
      </div>

      {notice && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">{notice}</p>
      )}
      {error && <ErrorNote message={error} />}

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Rekaman</h2>
          <p className="text-xs text-muted-foreground">Tersimpan di browser ini saja</p>
        </div>
        {recordings.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada rekaman layar.
          </p>
        ) : (
          <ul className="mt-3 grid gap-4 md:grid-cols-2">
            {recordings.map((r) => (
              <RecordingCard key={r.id} recording={r} onRename={(n) => rename(r, n)} onDelete={() => remove(r)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Toggle({
  checked,
  disabled,
  onChange,
  children,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  children: string
}) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-3 text-sm', disabled && 'cursor-default opacity-60')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-gradient-brand' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
      {children}
    </label>
  )
}

function RecordingCard({
  recording,
  onRename,
  onDelete,
}: {
  recording: ScreenRecording
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const url = useMemo(() => URL.createObjectURL(recording.blob), [recording.blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const [name, setName] = useState(recording.name)
  const [progress, setProgress] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const cancel = useRef<(() => void) | null>(null)
  const ext = videoExtension(recording.mimeType)
  const file = safeFileName(recording.name)

  async function saveMp4() {
    setError('')
    setProgress(0)
    try {
      const blob = await toMp4(recording, setProgress, (c) => (cancel.current = c))
      downloadBlob(blob, `${file}.mp4`)
    } catch (e) {
      if (!isCanceled(e)) setError(`Gagal mengubah ke MP4. Unduh format aslinya (.${ext}) sebagai gantinya.`)
    } finally {
      setProgress(null)
      cancel.current = null
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <video
        controls
        preload="metadata"
        src={url}
        className="aspect-video w-full bg-zinc-950"
        onLoadedMetadata={(e) => fixRecordedDuration(e.currentTarget)}
      />
      <div className="p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== recording.name && onRename(name)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label="Nama rekaman"
          className="w-full rounded-md bg-transparent px-1 py-0.5 font-medium outline-none hover:bg-muted focus:bg-muted"
        />
        <p className="mt-1 px-1 font-mono text-xs text-muted-foreground">
          {formatDuration(recording.duration)} · {formatSize(recording.blob.size)}
          {recording.width ? ` · ${recording.width}×${recording.height}` : ''} · {ext.toUpperCase()}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadBlob(recording.blob, `${file}.${ext}`)}>
            <Download className="size-4" /> Unduh .{ext}
          </Button>
          {hasWebCodecs() && ext !== 'mp4' && (
            <Button size="sm" variant="outline" disabled={progress !== null} onClick={() => void saveMp4()}>
              {progress !== null ? `MP4 ${Math.round(progress * 100)}%` : 'Ubah ke MP4'}
            </Button>
          )}
          {progress !== null && (
            <Button size="sm" variant="ghost" onClick={() => cancel.current?.()}>
              Batal
            </Button>
          )}
          {confirming ? (
            <span className="ml-auto flex items-center gap-1.5 text-sm">
              Hapus?
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
      </div>
    </li>
  )
}
