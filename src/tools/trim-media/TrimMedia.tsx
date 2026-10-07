import { useEffect, useRef, useState } from 'react'
import { Download, Pause, Play, RotateCcw, Scissors, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Filmstrip, MediaRange, Waveform } from '@/components/tool/MediaRange'
import { ProgressCard } from '@/components/tool/SizeResult'
import { downloadBlob } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import {
  audioPeaks,
  convertMedia,
  ensureAudioEncoder,
  formatDuration,
  formatSize,
  formatTime,
  hasWebCodecs,
  isCanceled,
  NoEncoderError,
  probeMedia,
  sameContainer,
  videoThumbnails,
  type MediaInfo,
  type OutputChoice,
} from '@/lib/media'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'ready'; info: MediaInfo; out: OutputChoice }
  | { kind: 'error'; message: string }

export default function TrimMedia() {
  // Not `t`: seek() below takes a time in seconds named `t`.
  const tx = useT()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [range, setRange] = useState({ start: 0, end: 0 })
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [strip, setStrip] = useState<{ frames?: string[]; peaks?: number[] }>({})
  const [job, setJob] = useState<{ progress: number; startedAt: number } | null>(null)
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const cancelRef = useRef<(() => void) | null>(null)
  /** When set, playback stops here ("play the selection"). */
  const stopAt = useRef<number | null>(null)

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result])

  async function open(next: File) {
    setError(null)
    setResult(null)
    setStrip({})
    if (!hasWebCodecs()) {
      setStatus({
        kind: 'error',
        message: tx(
          'Browser ini belum mendukung WebCodecs. Pakai Chrome, Edge, Safari 16.4+, atau Firefox 130+.',
          "This browser doesn't support WebCodecs yet. Use Chrome, Edge, Safari 16.4+, or Firefox 130+.",
        ),
      })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading' })
    try {
      const [info, out] = await Promise.all([probeMedia(next), sameContainer(next)])
      setUrl(URL.createObjectURL(next))
      setRange({ start: 0, end: info.duration })
      setTime(0)
      setStatus({ kind: 'ready', info, out })
      // The timeline picture comes in after; the tool is usable meanwhile.
      if (info.video) void videoThumbnails(next, 12, 64).then((frames) => setStrip({ frames }))
      else void audioPeaks(next, 240).then((peaks) => setStrip({ peaks }))
    } catch {
      setStatus({
        kind: 'error',
        message: tx(
          'File tidak bisa dibaca. Didukung: MP4, MOV, WebM, MKV, MP3, M4A, WAV, OGG, FLAC, AAC.',
          "Couldn't read the file. Supported: MP4, MOV, WebM, MKV, MP3, M4A, WAV, OGG, FLAC, AAC.",
        ),
      })
    }
  }

  // Follow the playhead smoothly while playing, and stop at the end of the selection.
  useEffect(() => {
    if (!playing) return
    let id = 0
    const tick = () => {
      const el = mediaRef.current
      if (el) {
        setTime(el.currentTime)
        if (stopAt.current !== null && el.currentTime >= stopAt.current) {
          el.pause()
          stopAt.current = null
        }
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing])

  function seek(t: number) {
    setTime(t)
    if (mediaRef.current) mediaRef.current.currentTime = t
  }

  function playSelection() {
    const el = mediaRef.current
    if (!el) return
    if (playing) {
      el.pause()
      return
    }
    el.currentTime = range.start
    stopAt.current = range.end
    void el.play()
  }

  async function save(info: MediaInfo, out: OutputChoice) {
    if (!file) return
    setError(null)
    setResult(null)
    setJob({ progress: 0, startedAt: Date.now() })
    try {
      const whole = range.start <= 0.001 && range.end >= info.duration - 0.001
      // The audio at the cut points is re-encoded for an exact cut; browsers have no MP3
      // encoder and often no AAC one, so load the wasm ones for those.
      const codec = info.audio?.codec
      if (!whole && (codec === 'mp3' || codec === 'aac')) await ensureAudioEncoder(codec)
      const blob = await convertMedia({
        file,
        format: out.format,
        mimeType: out.mimeType,
        trim: whole ? undefined : range,
        onProgress: (progress) => setJob((j) => (j ? { ...j, progress } : j)),
        onStart: (cancel) => (cancelRef.current = cancel),
      })
      setResult({ blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      if (isCanceled(e)) return
      setError(
        e instanceof NoEncoderError
          ? tx(
              'Browser ini tidak bisa meng-encode ulang bagian potongan file ini. Coba Chrome atau Edge terbaru.',
              "This browser can't re-encode the cut points of this file. Try the latest Chrome or Edge.",
            )
          : tx(
              'Gagal memotong file. File mungkin rusak atau formatnya belum didukung.',
              "Couldn't trim the file. It may be damaged or in a format that isn't supported yet.",
            ),
      )
    } finally {
      setJob(null)
      cancelRef.current = null
    }
  }

  if (status.kind === 'ready' && file && url) {
    const { info, out } = status
    const busy = job !== null
    const isVideo = !!info.video
    const name = `${file.name.replace(/\.[^.]+$/, '')}${tr('-potong', '-trimmed')}.${out.ext}`

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatDuration(info.duration)} · {formatSize(file.size)}
              {info.video && ` · ${info.video.width}×${info.video.height}`} → {tx('disimpan sebagai', 'saved as')} .{out.ext}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save(info, out)} disabled={busy}>
              <Scissors />
              {tx('Potong', 'Trim')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {tx('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-4">
          {isVideo ? (
            <video
              ref={mediaRef}
              src={url}
              playsInline
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onSeeked={(e) => setTime(e.currentTarget.currentTime)}
              className="mx-auto max-h-[50vh] w-full rounded-xl bg-black"
            />
          ) : (
            <audio
              ref={mediaRef}
              src={url}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onSeeked={(e) => setTime(e.currentTarget.currentTime)}
              className="hidden"
            />
          )}

          <MediaRange
            duration={info.duration}
            start={range.start}
            end={range.end}
            time={time}
            onSeek={seek}
            onChange={(start, end) => setRange({ start, end })}
          >
            {strip.frames ? <Filmstrip frames={strip.frames} /> : strip.peaks ? <Waveform peaks={strip.peaks} /> : null}
          </MediaRange>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={playSelection}>
              {playing ? <Pause /> : <Play />}
              {playing ? tx('Jeda', 'Pause') : tx('Putar bagian ini', 'Play selection')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRange((r) => ({ ...r, start: Math.min(time, r.end - 0.1) }))}>
              {tx('Jadikan awal', 'Set as start')} ({formatTime(time)})
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRange((r) => ({ ...r, end: Math.max(time, r.start + 0.1) }))}>
              {tx('Jadikan akhir', 'Set as end')}
            </Button>
          </div>
        </div>

        {job && (
          <ProgressCard
            label={tx('Memotong…', 'Trimming…')}
            progress={job.progress}
            startedAt={job.startedAt}
            action={
              <Button variant="ghost" size="sm" onClick={() => cancelRef.current?.()}>
                <Square />
                {tx('Batalkan', 'Cancel')}
              </Button>
            }
          />
        )}

        {result && (
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            {isVideo ? (
              <video src={result.url} controls playsInline className="mx-auto max-h-[40vh] w-full rounded-xl bg-black" />
            ) : (
              <audio src={result.url} controls className="w-full" />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {tx('Hasil', 'Result')} {formatTime(range.end - range.start)} · {formatSize(result.blob.size)}
              </p>
              <Button onClick={() => downloadBlob(result.blob, name)}>
                <Download />
                {tx('Unduh', 'Download')} .{out.ext}
              </Button>
            </div>
          </div>
        )}

        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept="video/*,audio/*,.mkv,.flac,.m4a"
        label={tx('Tarik video atau audio ke sini', 'Drop a video or audio file here')}
        busyLabel={status.kind === 'reading' ? tx(`Membuka ${file?.name}…`, `Opening ${file?.name}…`) : undefined}
        onFiles={([f]) => void open(f)}
      />
      <p className="text-center text-xs text-muted-foreground">
        {tx(
          'MP4, MOV, WebM, MKV, MP3, M4A, WAV, OGG, FLAC. Hasil memakai format yang sama; bagian yang tidak terpotong disalin tanpa encode ulang, jadi kualitas tidak turun.',
          "MP4, MOV, WebM, MKV, MP3, M4A, WAV, OGG, FLAC. The result keeps the same format; the uncut parts are copied without re-encoding, so quality doesn't drop.",
        )}
      </p>
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
