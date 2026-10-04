import { useEffect, useRef, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, Download, Loader2, RotateCcw, Square, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { IconButton } from '@/components/tool/IconButton'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { formatDuration, formatSize, formatTime, hasWebCodecs, probeMedia, type MediaInfo } from '@/lib/media'
import { captureFrames, frameName, plannedTimes, zipFrames, type Frame, type FrameFormat } from './frames'

type Status = { kind: 'idle' } | { kind: 'reading' } | { kind: 'ready'; info: MediaInfo } | { kind: 'error'; message: string }

const FORMAT_OPTIONS: { value: FrameFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
]
const MODE_OPTIONS: { value: 'every' | 'count'; label: string }[] = [
  { value: 'every', label: 'Setiap N detik' },
  { value: 'count', label: 'Jumlah frame' },
]
const MAX_FRAMES = 300

export default function ExtractFrames() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [format, setFormat] = useState<FrameFormat>('png')
  const [mode, setMode] = useState<'every' | 'count'>('count')
  const [value, setValue] = useState(10)
  const [frames, setFrames] = useState<Frame[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [zipping, setZipping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cancelled = useRef(false)
  const framesRef = useRef<Frame[]>([])
  framesRef.current = frames

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  // Release every frame preview when leaving the tool.
  useEffect(() => () => framesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), [])

  function clearFrames() {
    frames.forEach((f) => URL.revokeObjectURL(f.url))
    setFrames([])
  }

  async function open(next: File) {
    setError(null)
    clearFrames()
    if (!hasWebCodecs()) {
      setStatus({ kind: 'error', message: 'Browser ini belum mendukung WebCodecs. Pakai Chrome, Edge, Safari 16.4+, atau Firefox 130+.' })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading' })
    try {
      const info = await probeMedia(next)
      if (!info.video) throw new Error('no video')
      setUrl(URL.createObjectURL(next))
      setStatus({ kind: 'ready', info })
    } catch {
      setStatus({ kind: 'error', message: 'Video tidak bisa dibaca. Didukung: MP4, MOV, WebM, MKV.' })
    }
  }

  async function capture(times: number[]) {
    if (!file || !times.length) return
    setError(null)
    cancelled.current = false
    setProgress({ done: 0, total: times.length })
    try {
      await captureFrames(
        file,
        times,
        format,
        (frame) => setFrames((prev) => [...prev, frame].sort((a, b) => a.time - b.time)),
        (done, total) => setProgress({ done, total }),
        () => cancelled.current,
      )
    } catch {
      setError('Gagal mengambil frame. Video mungkin rusak.')
    } finally {
      setProgress(null)
    }
  }

  function step(by: number, fps: number) {
    const el = videoRef.current
    if (!el) return
    el.pause()
    el.currentTime = Math.min(el.duration, Math.max(0, el.currentTime + by / (fps || 30)))
  }

  async function downloadAll() {
    if (!file) return
    setZipping(true)
    try {
      downloadBlob(await zipFrames(frames, file.name.replace(/\.[^.]+$/, '')), `${file.name.replace(/\.[^.]+$/, '')}-frame.zip`)
    } finally {
      setZipping(false)
    }
  }

  if (status.kind === 'ready' && file && url) {
    const { info } = status
    const v = info.video!
    const busy = progress !== null
    const planned = plannedTimes(info.duration, mode, value).length
    const base = file.name.replace(/\.[^.]+$/, '')

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {v.width}×{v.height} · {Math.round(v.fps)} fps · {formatDuration(info.duration)} · {formatSize(file.size)}
            </p>
          </div>
          <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
            <RotateCcw />
            Video lain
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <video ref={videoRef} src={url} controls muted playsInline className="max-h-[50vh] w-full rounded-xl bg-black" />
            <div className="flex flex-wrap items-center gap-2">
              <IconButton label="Frame sebelumnya" onClick={() => step(-1, v.fps)}>
                <ChevronLeft />
              </IconButton>
              <IconButton label="Frame berikutnya" onClick={() => step(1, v.fps)}>
                <ChevronRight />
              </IconButton>
              <Button
                disabled={busy}
                onClick={() => void capture([videoRef.current?.currentTime ?? 0])}
              >
                <Camera />
                Ambil frame ini
              </Button>
              <p className="text-xs text-muted-foreground">Jeda di adegan yang diinginkan, lalu ambil. Resolusi asli {v.width}×{v.height}.</p>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border bg-card p-5">
            <Segmented label="Format gambar" value={format} options={FORMAT_OPTIONS} disabled={busy} onChange={setFormat} />
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Ambil otomatis</p>
              <Segmented label="Cara" value={mode} options={MODE_OPTIONS} disabled={busy} onChange={(m) => {
                setMode(m)
                setValue(m === 'every' ? 1 : 10)
              }} />
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">{mode === 'every' ? 'Jarak (detik)' : 'Jumlah frame'}</span>
                <input
                  type="number"
                  min={mode === 'every' ? 0.1 : 1}
                  step={mode === 'every' ? 0.5 : 1}
                  value={value}
                  disabled={busy}
                  onChange={(e) => setValue(Math.max(mode === 'every' ? 0.1 : 1, Number(e.target.value) || 1))}
                  className="h-10 w-28 rounded-xl border bg-background px-3 font-mono text-sm outline-none focus:border-brand-2/60"
                />
              </label>
              <Button
                variant="outline"
                disabled={busy || planned > MAX_FRAMES}
                onClick={() => void capture(plannedTimes(info.duration, mode, value))}
              >
                <Camera />
                Ambil {planned} frame
              </Button>
              {planned > MAX_FRAMES && (
                <p className="text-xs text-destructive">Maksimal {MAX_FRAMES} frame sekali ambil — perbesar jaraknya.</p>
              )}
            </div>
          </div>
        </div>

        {progress && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-sm">
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Mengambil frame {progress.done}/{progress.total}…
            </span>
            <Button variant="ghost" size="sm" onClick={() => (cancelled.current = true)}>
              <Square />
              Hentikan
            </Button>
          </div>
        )}

        {frames.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {frames.length} frame · {formatSize(frames.reduce((n, f) => n + f.blob.size, 0))}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => void downloadAll()} disabled={zipping || busy}>
                  {zipping ? <Loader2 className="animate-spin" /> : <Download />}
                  Unduh semua (.zip)
                </Button>
                <Button variant="ghost" disabled={busy} onClick={clearFrames}>
                  <Trash2 />
                  Hapus semua
                </Button>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {frames.map((f) => (
                <li key={f.id} className="overflow-hidden rounded-xl border bg-card">
                  <button
                    type="button"
                    title="Lompat ke waktu ini"
                    onClick={() => videoRef.current && (videoRef.current.currentTime = f.time)}
                    className="block w-full bg-black"
                  >
                    <img src={f.url} alt={`Frame ${formatTime(f.time)}`} className="aspect-video w-full object-contain" />
                  </button>
                  <div className="flex items-center justify-between gap-1 px-2 py-1">
                    <span className="font-mono text-xs text-muted-foreground">{formatTime(f.time)}</span>
                    <div className="flex">
                      <IconButton label="Unduh" onClick={() => downloadBlob(f.blob, frameName(base, f))}>
                        <Download />
                      </IconButton>
                      <IconButton
                        label="Buang"
                        onClick={() => {
                          URL.revokeObjectURL(f.url)
                          setFrames((prev) => prev.filter((x) => x.id !== f.id))
                        }}
                      >
                        <X />
                      </IconButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept="video/*,.mkv"
        label="Tarik video ke sini"
        busyLabel={status.kind === 'reading' ? `Membuka ${file?.name}…` : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
