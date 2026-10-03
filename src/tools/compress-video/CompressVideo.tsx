import { useEffect, useRef, useState } from 'react'
import { Download, RotateCcw, Sparkles, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { ProgressCard, SizeResult } from '@/components/tool/SizeResult'
import { downloadBlob } from '@/lib/download'
import { formatDuration, formatSize, hasWebCodecs, NoEncoderError, probeMedia, type MediaInfo } from '@/lib/media'
import { compressVideo, targetBitrate, targetSize, type Level, type Resolution } from './compress'

type Status =
  { kind: 'idle' } | { kind: 'reading' } | { kind: 'ready'; info: MediaInfo } | { kind: 'error'; message: string }

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: 'light', label: 'Ringan' },
  { value: 'medium', label: 'Sedang' },
  { value: 'strong', label: 'Kuat' },
]
const AUDIO_OPTIONS: { value: 'keep' | 'drop'; label: string }[] = [
  { value: 'keep', label: 'Pertahankan' },
  { value: 'drop', label: 'Hapus suara' },
]

export default function CompressVideo() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<Level>('medium')
  const [resolution, setResolution] = useState<Resolution>(720)
  const [keepAudio, setKeepAudio] = useState(true)
  const [job, setJob] = useState<{ progress: number; startedAt: number } | null>(null)
  const [result, setResult] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)
  const [urls, setUrls] = useState<{ source?: string; result?: string }>({})

  // Object URLs for the two <video> previews, released when replaced.
  useEffect(() => {
    const source = file ? URL.createObjectURL(file) : undefined
    setUrls((u) => ({ ...u, source }))
    return () => {
      if (source) URL.revokeObjectURL(source)
    }
  }, [file])
  useEffect(() => {
    const url = result ? URL.createObjectURL(result) : undefined
    setUrls((u) => ({ ...u, result: url }))
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [result])

  async function open(next: File) {
    setResult(null)
    setError(null)
    if (!hasWebCodecs()) {
      setStatus({
        kind: 'error',
        message:
          'Browser ini belum mendukung WebCodecs untuk mengolah video. Pakai Chrome, Edge, Safari 16.4+, atau Firefox 130+.',
      })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading' })
    try {
      const info = await probeMedia(next)
      if (!info.video) throw new Error('no video')
      // Default to 720p when the video is larger than that, otherwise keep its size.
      setResolution(Math.min(info.video.width, info.video.height) > 720 ? 720 : 0)
      setStatus({ kind: 'ready', info })
    } catch {
      setStatus({
        kind: 'error',
        message:
          'Video tidak bisa dibaca. Format yang didukung: MP4, MOV, WebM, MKV. Format lama seperti AVI atau WMV belum didukung.',
      })
    }
  }

  async function run(info: MediaInfo) {
    if (!file) return
    setResult(null)
    setError(null)
    setJob({ progress: 0, startedAt: Date.now() })
    try {
      const blob = await compressVideo(
        file,
        info,
        { level, resolution, keepAudio },
        (progress) => setJob((j) => (j ? { ...j, progress } : j)),
        (cancel) => (cancelRef.current = cancel),
      )
      setResult(blob)
    } catch (e) {
      if ((e as Error)?.name === 'ConversionCanceledError' || /cancel/i.test(String(e))) return
      setError(
        e instanceof NoEncoderError
          ? 'Browser ini tidak bisa meng-encode video di perangkat ini. Coba Chrome atau Edge versi terbaru.'
          : 'Gagal mengompres video. File mungkin rusak atau memakai format yang tidak didukung.',
      )
    } finally {
      setJob(null)
      cancelRef.current = null
    }
  }

  if (status.kind === 'ready' && file) {
    const { info } = status
    const v = info.video!
    const busy = job !== null
    const short = Math.min(v.width, v.height)
    const resolutionOptions: { value: Resolution; label: string }[] = [
      { value: 0, label: `Asli (${short}p)` },
      ...([1080, 720, 480] as const).filter((r) => r < short).map((r) => ({ value: r, label: `${r}p` })),
    ]
    const out = targetSize(v.width, v.height, resolution)
    // Rough size estimate: video bitrate + audio, over the duration.
    const audioBits =
      keepAudio && info.audio ? (level === 'strong' ? 96_000 : Math.min(info.audio.bitrate || 128_000, 192_000)) : 0
    const estimate = ((targetBitrate(info, level, resolution) + audioBits) * info.duration) / 8

    return (
      <div className="space-y-6">
        <div className="grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {urls.source && (
            <video src={urls.source} controls muted className="aspect-video w-full rounded-xl bg-black" />
          )}
          <div className="flex flex-col justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {[
                  ['Ukuran', formatSize(file.size)],
                  ['Durasi', formatDuration(info.duration)],
                  ['Resolusi', `${v.width}×${v.height}`],
                  ['Frame rate', `${Math.round(v.fps)} fps`],
                  ['Bitrate', v.bitrate ? `${(v.bitrate / 1e6).toFixed(1)} Mbps` : '—'],
                  ['Audio', info.audio ? `${info.audio.codec ?? '?'} · ${info.audio.channels} ch` : 'tidak ada'],
                ].map(([k, val]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-mono text-[13px]">{val}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <Button variant="ghost" className="self-start" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              Video lain
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
          <Segmented label="Kualitas" value={level} options={LEVEL_OPTIONS} disabled={busy} onChange={setLevel} />
          <Segmented
            label="Resolusi"
            value={resolution}
            options={resolutionOptions}
            disabled={busy}
            onChange={setResolution}
          />
          {info.audio && (
            <Segmented
              label="Audio"
              value={keepAudio ? 'keep' : 'drop'}
              options={AUDIO_OPTIONS}
              disabled={busy}
              onChange={(v) => setKeepAudio(v === 'keep')}
            />
          )}
          <div className="ml-auto flex items-center gap-4">
            <p className="text-right text-xs text-muted-foreground">
              Hasil {out.width}×{out.height}
              <br />
              perkiraan <span className="font-mono text-foreground">~{formatSize(Math.min(estimate, file.size))}</span>
            </p>
            <Button onClick={() => void run(info)} disabled={busy}>
              <Sparkles />
              Kompres
            </Button>
          </div>
        </div>

        {job && (
          <ProgressCard
            label="Mengompres video…"
            progress={job.progress}
            startedAt={job.startedAt}
            action={
              <Button variant="outline" size="sm" onClick={() => cancelRef.current?.()}>
                <Square />
                Batalkan
              </Button>
            }
          />
        )}

        {result && (
          <SizeResult before={file.size} after={result.size}>
            <p className="text-xs text-muted-foreground">
              {result.size < file.size
                ? `MP4 ${out.width}×${out.height}${keepAudio && info.audio ? '' : ', tanpa suara'} — bisa diputar di hampir semua perangkat.`
                : 'Video ini sudah sangat ringkas; hasilnya tidak lebih kecil. Coba kualitas Kuat atau resolusi lebih rendah.'}
            </p>
            {result.size < file.size && (
              <Button onClick={() => downloadBlob(result, file.name.replace(/\.[^.]+$/, '') + '-kompres.mp4')}>
                <Download />
                Unduh video
              </Button>
            )}
          </SizeResult>
        )}
        {result && urls.result && result.size < file.size && (
          <video src={urls.result} controls className="aspect-video w-full rounded-2xl bg-black" />
        )}

        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept="video/*,.mkv,.mov"
        label="Tarik video ke sini"
        busyLabel={status.kind === 'reading' ? `Membaca ${file?.name}…` : undefined}
        onFiles={([f]) => void open(f)}
      />
      <p className="text-center text-xs text-muted-foreground">
        MP4, MOV, WebM, MKV. Diproses dengan encoder video bawaan perangkatmu — tidak di-upload.
      </p>
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
