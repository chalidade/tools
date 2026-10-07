import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CameraOff, Download, MonitorUp, Pause, Play, Square, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { fixRecordedDuration, newId, safeFileName } from '@/lib/local-store'
import { formatDuration, formatSize, hasWebCodecs, isCanceled } from '@/lib/media'
import {
  canRecordScreen,
  captureScreen,
  defaultScreenName,
  deleteScreenRecording,
  listScreenRecordings,
  saveScreenRecording,
  toMp4,
  videoExtension,
  type Capture,
  type CaptureWarning,
  type RecordingResult,
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
  if (name === 'NotFoundError')
    return tr('Tidak ada layar atau jendela yang bisa direkam.', 'There is no screen or window to record.')
  if (name === 'NotReadableError')
    return tr(
      'Layar tidak bisa direkam — mungkin sedang direkam aplikasi lain.',
      "The screen can't be recorded — another app may be recording it.",
    )
  return tr('Perekaman layar tidak bisa dimulai di browser ini.', "Screen recording can't start in this browser.")
}

const WARNINGS: Record<CaptureWarning, readonly [string, string]> = {
  'system-audio-missing': [
    'Suara tab/sistem tidak ikut terekam — centang "Bagikan audio" di jendela pilihan untuk menyertakannya.',
    'Tab/system audio wasn\'t recorded — tick "Share audio" in the picker to include it.',
  ],
  'microphone-unavailable': [
    'Mikrofon tidak bisa dibuka, jadi rekaman ini tanpa suara mikrofon.',
    "The microphone couldn't be opened, so this recording has no mic audio.",
  ],
}

export interface ScreenRecorderProps {
  /** Keep recordings in this browser (IndexedDB) and list them. Default true. */
  persist?: boolean
  /** Called with every finished recording — e.g. to upload it to your own server. */
  onRecording?: (recording: RecordingResult) => void
  /** Show "● Merekam 0:42" in the tab title while recording. Default true. */
  showInTitle?: boolean
}

export default function ScreenRecorder({ persist = true, onRecording, showInTitle = true }: ScreenRecorderProps = {}) {
  const t = useT()
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
  const cameraStream = useRef<MediaStream | null>(null)
  const captureRef = useRef<Capture | null>(null)
  const ticker = useRef(0)
  const onRecordingRef = useRef(onRecording)
  onRecordingRef.current = onRecording

  const refresh = useCallback(() => {
    if (!persist) return
    listScreenRecordings()
      .then(setRecordings)
      .catch(() =>
        setError(
          tr(
            'Penyimpanan browser tidak bisa dibuka (mode privat?). Rekaman tetap bisa diunduh.',
            "Browser storage can't be opened (private mode?). You can still download your recordings.",
          ),
        ),
      )
  }, [persist])
  useEffect(refresh, [refresh])

  // Leaving the page mid-take stops and keeps it; the floating camera closes too.
  useEffect(
    () => () => {
      clearInterval(ticker.current)
      const capture = captureRef.current
      if (capture && capture.state !== 'ready') void capture.stop().then((r) => r && keep(r))
      else capture?.cancel()
      cameraStream.current?.getTracks().forEach((t) => t.stop())
      if (document.pictureInPictureElement) void document.exitPictureInPicture()
    },
    [],
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
    if (!showInTitle || (phase !== 'recording' && phase !== 'paused')) return
    const original = document.title
    document.title = `${phase === 'recording' ? t('● Merekam', '● Recording') : t('❚❚ Dijeda', '❚❚ Paused')} ${formatDuration(elapsed)} — ${t('Rekam Layar', 'Screen Recorder')}`
    return () => {
      document.title = original
    }
  }, [phase, elapsed, showInTitle, t])

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
      setError(
        t(
          'Kamera tidak bisa dibuka. Pastikan izin kamera diberikan dan kamera tidak dipakai aplikasi lain.',
          "The camera couldn't be opened. Make sure camera access is allowed and no other app is using it.",
        ),
      )
    }
  }

  // ------------------------------------------------------------- recording

  function reset() {
    clearInterval(ticker.current)
    captureRef.current = null
    if (previewRef.current) previewRef.current.srcObject = null
    setPhase('idle')
    setElapsed(0)
  }

  async function keep(result: RecordingResult) {
    onRecordingRef.current?.(result)
    if (!persist) {
      // Without storage the file only lives in this list until the page closes.
      setRecordings((list) => [{ ...result, id: newId(), name: defaultScreenName(), createdAt: Date.now() }, ...list])
      return
    }
    const recording: ScreenRecording = { ...result, id: newId(), name: defaultScreenName(), createdAt: Date.now() }
    setRecordings((list) => [recording, ...list])
    try {
      await saveScreenRecording(recording)
    } catch {
      setError(
        tr(
          'Rekaman terlalu besar untuk disimpan di browser ini. Unduh sekarang agar tidak hilang saat halaman ditutup.',
          "The recording is too large to save in this browser. Download it now so it isn't lost when the page closes.",
        ),
      )
    }
  }

  async function start() {
    setError('')
    setNotice('')
    setPhase('picking')
    let capture: Capture
    try {
      capture = await captureScreen({ systemAudio, microphone: mic, fps })
    } catch (e) {
      reset()
      const message = captureError(e)
      if (message) setError(message)
      return
    }
    captureRef.current = capture
    setNotice(capture.warnings.map((w) => t(...WARNINGS[w])).join(' '))
    // "Stop sharing" in the browser's own bar ends the take.
    capture.onended = () => void stop(true)
    if (previewRef.current) {
      previewRef.current.srcObject = capture.stream
      void previewRef.current.play().catch(() => {})
    }

    // A few seconds to switch to the window being recorded.
    if (useCountdown) {
      setPhase('countdown')
      for (let n = 3; n > 0; n--) {
        setCountdown(n)
        await new Promise((r) => setTimeout(r, 1000))
        if (capture.state === 'stopped') return
      }
    }
    capture.start()
    setPhase('recording')
    ticker.current = window.setInterval(() => setElapsed(capture.elapsed()), 250)
  }

  function pause() {
    captureRef.current?.pause()
    setPhase('paused')
  }
  function resume() {
    captureRef.current?.resume()
    setPhase('recording')
  }
  async function stop(save: boolean) {
    const capture = captureRef.current
    if (!capture) return
    reset()
    if (!save) return capture.cancel()
    const result = await capture.stop()
    if (result) await keep(result)
  }

  const rename = (r: ScreenRecording, name: string) => {
    const next = { ...r, name: name.trim() || r.name }
    setRecordings((list) => list.map((x) => (x.id === r.id ? next : x)))
    if (persist) void saveScreenRecording(next).catch(() => {})
  }
  const remove = (r: ScreenRecording) => {
    setRecordings((list) => list.filter((x) => x.id !== r.id))
    if (persist) void deleteScreenRecording(r.id).catch(() => {})
  }

  if (!supported)
    return (
      <ErrorNote
        message={t(
          'Perekaman layar hanya bisa di browser komputer (Chrome, Edge, Firefox, atau Safari versi terbaru) — ponsel dan tablet belum mengizinkan situs web merekam layar.',
          "Screen recording only works in desktop browsers (the latest Chrome, Edge, Firefox, or Safari) — phones and tablets don't let websites record the screen yet.",
        )}
      />
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
                  aria-label={t('Mulai rekam layar', 'Start screen recording')}
                >
                  <MonitorUp className="size-8" />
                </button>
                <p className="mt-4 font-medium text-white">{t('Mulai rekam layar', 'Start screen recording')}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {t('Pilih seluruh layar, satu jendela, atau satu tab browser.', 'Pick your entire screen, a window, or a browser tab.')}
                </p>
              </div>
            </div>
          )}
          {phase === 'picking' && (
            <p className="absolute inset-0 grid place-items-center text-sm text-zinc-400">
              {t('Pilih apa yang mau direkam…', 'Choose what to record…')}
            </p>
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
              {phase === 'recording' ? 'REC' : t('JEDA', 'PAUSED')} {formatDuration(elapsed)}
            </span>
          )}
        </div>

        {/* Controls while recording */}
        {(active || phase === 'countdown') && (
          <div className="flex items-center justify-center gap-4 border-t px-5 py-4">
            <button
              type="button"
              onClick={() => stop(false)}
              aria-label={t('Batalkan rekaman', 'Discard recording')}
              title={t('Batalkan (tidak disimpan)', 'Discard (not saved)')}
              className="grid size-11 place-items-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => stop(true)}
              disabled={!active}
              aria-label={t('Selesai dan simpan', 'Finish and save')}
              title={t('Selesai & simpan', 'Finish & save')}
              className="grid size-14 place-items-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-transform hover:scale-105 disabled:opacity-50"
            >
              <Square className="size-6 fill-current" />
            </button>
            <button
              type="button"
              onClick={phase === 'recording' ? pause : resume}
              disabled={!active}
              aria-label={phase === 'paused' ? t('Lanjutkan', 'Resume') : t('Jeda', 'Pause')}
              title={phase === 'paused' ? t('Lanjutkan', 'Resume') : t('Jeda', 'Pause')}
              className="grid size-11 place-items-center rounded-full border bg-background transition-colors hover:bg-accent disabled:opacity-50"
            >
              {phase === 'paused' ? <Play className="size-5" /> : <Pause className="size-5" />}
            </button>
          </div>
        )}

        {/* Settings */}
        <div className="grid gap-5 border-t bg-muted/30 px-5 py-5 sm:grid-cols-2 sm:px-8">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('Suara', 'Audio')}</p>
            <Toggle checked={systemAudio} disabled={busy} onChange={setSystemAudio}>
              {t('Suara tab / sistem', 'Tab / system audio')}
            </Toggle>
            <Toggle checked={mic} disabled={busy} onChange={setMic}>
              {t('Mikrofon (suaramu)', 'Microphone (your voice)')}
            </Toggle>
          </div>
          <div className="space-y-3">
            <Segmented label={t('Kehalusan gerak', 'Motion smoothness')} value={fps} options={FPS_OPTIONS} onChange={setFps} disabled={busy} />
            <Toggle checked={useCountdown} disabled={busy} onChange={setUseCountdown}>
              {t('Hitung mundur 3 detik sebelum mulai', '3-second countdown before starting')}
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
              {cameraOn ? t('Matikan kamera', 'Turn off camera') : t('Tampilkan kamera melayang', 'Show floating camera')}
            </Button>
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
              {pipSupported
                ? t(
                    'Wajahmu tampil di jendela kecil yang selalu di atas — ikut terekam saat kamu merekam seluruh layar.',
                    'Your face appears in a small always-on-top window — it gets recorded when you record the entire screen.',
                  )
                : t(
                    'Browser ini tidak punya jendela melayang (picture-in-picture), jadi kamera hanya tampil di halaman ini.',
                    "This browser has no floating window (picture-in-picture), so the camera only shows on this page.",
                  )}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">
            {t('Di Chrome dan Edge, centang', 'In Chrome and Edge, tick')} <b>{t('Bagikan audio', 'Share audio')}</b>{' '}
            {t(
              'di jendela pilihan agar suara tab (atau seluruh sistem, di Windows) ikut terekam. Hentikan kapan saja dengan tombol merah di sini atau "Berhenti berbagi" milik browser.',
              'in the picker so the tab\'s audio (or the whole system\'s, on Windows) is recorded too. Stop anytime with the red button here or the browser\'s own "Stop sharing".',
            )}
          </p>
        </div>
      </div>

      {notice && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">{notice}</p>
      )}
      {error && <ErrorNote message={error} />}

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{t('Rekaman', 'Recordings')}</h2>
          <p className="text-xs text-muted-foreground">
            {persist
              ? t('Tersimpan di browser ini saja', 'Saved in this browser only')
              : t('Hilang saat halaman ditutup — unduh dulu', 'Lost when the page closes — download first')}
          </p>
        </div>
        {recordings.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t('Belum ada rekaman layar.', 'No screen recordings yet.')}
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
  const t = useT()
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
      const blob = await toMp4(recording.blob, setProgress, (c) => (cancel.current = c))
      downloadBlob(blob, `${file}.mp4`)
    } catch (e) {
      if (!isCanceled(e))
        setError(
          t(
            `Gagal mengubah ke MP4. Unduh format aslinya (.${ext}) sebagai gantinya.`,
            `Couldn't convert to MP4. Download the original format (.${ext}) instead.`,
          ),
        )
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
          aria-label={t('Nama rekaman', 'Recording name')}
          className="w-full rounded-md bg-transparent px-1 py-0.5 font-medium outline-none hover:bg-muted focus:bg-muted"
        />
        <p className="mt-1 px-1 font-mono text-xs text-muted-foreground">
          {formatDuration(recording.duration)} · {formatSize(recording.blob.size)}
          {recording.width ? ` · ${recording.width}×${recording.height}` : ''} · {ext.toUpperCase()}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadBlob(recording.blob, `${file}.${ext}`)}>
            <Download className="size-4" /> {t('Unduh', 'Download')} .{ext}
          </Button>
          {hasWebCodecs() && ext !== 'mp4' && (
            <Button size="sm" variant="outline" disabled={progress !== null} onClick={() => void saveMp4()}>
              {progress !== null ? `MP4 ${Math.round(progress * 100)}%` : t('Ubah ke MP4', 'Convert to MP4')}
            </Button>
          )}
          {progress !== null && (
            <Button size="sm" variant="ghost" onClick={() => cancel.current?.()}>
              {t('Batal', 'Cancel')}
            </Button>
          )}
          {confirming ? (
            <span className="ml-auto flex items-center gap-1.5 text-sm">
              {t('Hapus?', 'Delete?')}
              <Button size="sm" variant="destructive" onClick={onDelete}>
                {t('Hapus', 'Delete')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                {t('Batal', 'Cancel')}
              </Button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={t('Hapus rekaman', 'Delete recording')}
              title={t('Hapus rekaman', 'Delete recording')}
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
