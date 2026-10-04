import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, RotateCcw, Sparkles, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { MediaRange } from '@/components/tool/MediaRange'
import { Segmented } from '@/components/tool/Segmented'
import { ProgressCard } from '@/components/tool/SizeResult'
import { downloadBlob } from '@/lib/download'
import { formatDuration, formatSize, formatTime, hasWebCodecs, NoEncoderError, probeMedia, type MediaInfo } from '@/lib/media'
import { gifToMp4, isGif, readGifInfo, videoToGif, type GifInfo } from './gif'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'gif'; info: GifInfo }
  | { kind: 'video'; info: MediaInfo }
  | { kind: 'error'; message: string }

const BACKGROUND_OPTIONS: { value: string; label: string }[] = [
  { value: '#ffffff', label: 'Putih' },
  { value: '#000000', label: 'Hitam' },
]
const LOOP_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 3, label: '3×' },
  { value: 5, label: '5×' },
]
const FPS_OPTIONS: { value: number; label: string }[] = [
  { value: 8, label: '8 fps' },
  { value: 12, label: '12 fps' },
  { value: 15, label: '15 fps' },
  { value: 24, label: '24 fps' },
]
/** Above this many frames a GIF gets very large and slow to make. */
const FRAME_WARNING = 450

export default function GifMp4() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [background, setBackground] = useState('#ffffff')
  const [loops, setLoops] = useState(1)
  const [range, setRange] = useState({ start: 0, end: 0 })
  const [fps, setFps] = useState(12)
  const [width, setWidth] = useState(480)
  const [time, setTime] = useState(0)
  const [job, setJob] = useState<{ progress: number; startedAt: number } | null>(null)
  const [result, setResult] = useState<{ blob: Blob; url: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cancelled = useRef(false)

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result])

  async function open(next: File) {
    setError(null)
    setResult(null)
    if (!hasWebCodecs()) {
      setStatus({ kind: 'error', message: 'Browser ini belum mendukung WebCodecs. Pakai Chrome, Edge, Safari 16.4+, atau Firefox 130+.' })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading' })
    try {
      setUrl(URL.createObjectURL(next))
      if (isGif(next)) {
        const info = await readGifInfo(next)
        // Short GIFs default to looping up to ~3 s, the minimum many apps accept for a video.
        setLoops(info.duration >= 3 ? 1 : info.duration >= 1.5 ? 2 : info.duration >= 1 ? 3 : 5)
        setStatus({ kind: 'gif', info })
      } else {
        const info = await probeMedia(next)
        if (!info.video) throw new Error('no video')
        setRange({ start: 0, end: Math.min(info.duration, 5) })
        setWidth(Math.min(480, info.video.width))
        setTime(0)
        setStatus({ kind: 'video', info })
      }
    } catch {
      setStatus({ kind: 'error', message: 'File tidak bisa dibaca. Pilih GIF, atau video MP4/MOV/WebM/MKV.' })
    }
  }

  async function run(make: (onProgress: (p: number) => void) => Promise<Blob>, name: string) {
    setError(null)
    setResult(null)
    cancelled.current = false
    setJob({ progress: 0, startedAt: Date.now() })
    try {
      const blob = await make((progress) => setJob((j) => (j ? { ...j, progress } : j)))
      setResult({ blob, url: URL.createObjectURL(blob), name })
    } catch (e) {
      if (cancelled.current) return
      setError(
        e instanceof NoEncoderError
          ? 'Browser ini tidak bisa meng-encode video MP4. Coba Chrome atau Edge terbaru.'
          : 'Gagal mengonversi. File mungkin rusak.',
      )
    } finally {
      setJob(null)
    }
  }

  const base = file?.name.replace(/\.[^.]+$/, '') ?? 'hasil'
  const busy = job !== null

  const header = (detail: string, action: ReactNode) =>
    file && (
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {action}
          <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
            <RotateCcw />
            File lain
          </Button>
        </div>
      </div>
    )

  const progress = job && (
    <ProgressCard
      label="Mengonversi…"
      progress={job.progress}
      startedAt={job.startedAt}
      action={
        status.kind === 'video' ? (
          <Button variant="ghost" size="sm" onClick={() => (cancelled.current = true)}>
            <Square />
            Batalkan
          </Button>
        ) : undefined
      }
    />
  )

  const resultCard = result && (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="grid place-items-center rounded-xl bg-muted/60 p-2">
        {result.blob.type === 'image/gif' ? (
          <img src={result.url} alt="Hasil GIF" className="max-h-[50vh] max-w-full" />
        ) : (
          <video src={result.url} controls loop autoPlay muted playsInline className="max-h-[50vh] max-w-full rounded-lg" />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {formatSize(file?.size ?? 0)} → <span className="font-medium text-foreground">{formatSize(result.blob.size)}</span>
        </p>
        <Button onClick={() => downloadBlob(result.blob, result.name)}>
          <Download />
          Unduh {result.name.split('.').pop()!.toUpperCase()}
        </Button>
      </div>
    </div>
  )

  if (status.kind === 'gif' && file && url) {
    const { info } = status
    return (
      <div className="space-y-6">
        {header(
          `GIF ${info.width}×${info.height} · ${info.frames} frame · ${info.duration.toFixed(1)} dtk · ${formatSize(file.size)} → MP4`,
          <Button
            disabled={busy}
            onClick={() => void run((p) => gifToMp4(file, { background, loops }, p), `${base}.mp4`)}
          >
            <Sparkles />
            Ubah ke MP4
          </Button>,
        )}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid place-items-center rounded-2xl border bg-muted/60 p-4">
            <img src={url} alt={file.name} className="max-h-72 max-w-full" />
          </div>
          <div className="space-y-5 rounded-2xl border bg-card p-5">
            <Segmented label="Latar untuk bagian transparan" value={background} options={BACKGROUND_OPTIONS} onChange={setBackground} />
            <Segmented label="Ulangi animasi" value={loops} options={LOOP_OPTIONS} onChange={setLoops} />
            <p className="text-xs text-muted-foreground">
              Durasi video {(info.duration * loops).toFixed(1)} dtk. Video tidak berulang sendiri seperti GIF; WhatsApp dan
              Instagram juga sering menolak video di bawah ~3 detik.
            </p>
          </div>
        </div>
        {progress}
        {resultCard}
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  if (status.kind === 'video' && file && url) {
    const { info } = status
    const v = info.video!
    const frames = Math.round((range.end - range.start) * fps)
    const widths = [240, 320, 480, 640].filter((w) => w < v.width)
    const widthOptions = [...widths, Math.min(v.width, 800)].map((w) => ({ value: w, label: `${w} px` }))
    return (
      <div className="space-y-6">
        {header(
          `Video ${v.width}×${v.height} · ${formatDuration(info.duration)} · ${formatSize(file.size)} → GIF`,
          <Button
            disabled={busy || frames < 1}
            onClick={() =>
              void run((p) => videoToGif(file, { ...range, fps, width }, p, () => cancelled.current), `${base}.gif`)
            }
          >
            <Sparkles />
            Buat GIF
          </Button>,
        )}
        <div className="space-y-4 rounded-2xl border bg-card p-4">
          <video
            ref={videoRef}
            src={url}
            controls
            muted
            playsInline
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            className="mx-auto max-h-[45vh] w-full rounded-xl bg-black"
          />
          <MediaRange
            duration={info.duration}
            start={range.start}
            end={range.end}
            time={time}
            onSeek={(t) => {
              setTime(t)
              if (videoRef.current) videoRef.current.currentTime = t
            }}
            onChange={(start, end) => setRange({ start, end })}
          />
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
          <Segmented label="Kehalusan gerak" value={fps} options={FPS_OPTIONS} onChange={setFps} />
          <Segmented label="Lebar" value={width} options={widthOptions} onChange={setWidth} />
        </div>
        <p className={frames > FRAME_WARNING ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
          {frames} frame ({formatTime(range.end - range.start)}).{' '}
          {frames > FRAME_WARNING
            ? 'GIF sepanjang ini akan sangat besar — perpendek bagiannya atau turunkan fps/lebar.'
            : 'GIF jauh lebih besar dari video; bagian 2–6 detik di 480 px biasanya pas untuk chat.'}
        </p>
        {progress}
        {resultCard}
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept="image/gif,video/*,.mkv"
        label="Tarik GIF atau video ke sini"
        busyLabel={status.kind === 'reading' ? `Membuka ${file?.name}…` : undefined}
        onFiles={([f]) => void open(f)}
      />
      <p className="text-center text-xs text-muted-foreground">
        GIF → MP4 (jauh lebih kecil, bisa dikirim sebagai video), atau potongan video → GIF.
      </p>
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
