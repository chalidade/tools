import { useEffect, useRef, useState } from 'react'
import { Download, RotateCcw, Sparkles, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { ProgressCard, SizeResult } from '@/components/tool/SizeResult'
import { downloadBlob } from '@/lib/download'
import { formatDuration, formatSize, hasWebCodecs, probeMedia, type MediaInfo } from '@/lib/media'
import { availableFormats, compressAudio, FORMATS, type AudioFormat } from './compress'

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'ready'; info: MediaInfo; formats: AudioFormat[] }
  | { kind: 'error'; message: string }

const BITRATE_OPTIONS: { value: number; label: string }[] = [
  { value: 64_000, label: '64 kbps' },
  { value: 96_000, label: '96 kbps' },
  { value: 128_000, label: '128 kbps' },
  { value: 192_000, label: '192 kbps' },
]
const CHANNEL_OPTIONS: { value: 'stereo' | 'mono'; label: string }[] = [
  { value: 'stereo', label: 'Stereo' },
  { value: 'mono', label: 'Mono' },
]
const BITRATE_HINT: Record<number, string> = {
  64000: 'Cukup untuk suara/podcast, apalagi dalam mono.',
  96000: 'Musik masih enak di HP dan earphone.',
  128000: 'Standar musik — sulit dibedakan dari aslinya.',
  192000: 'Kualitas tinggi, ukuran lebih besar.',
}

export default function CompressAudio() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<AudioFormat>('mp3')
  const [bitrate, setBitrate] = useState(96_000)
  const [mono, setMono] = useState(false)
  const [job, setJob] = useState<{ progress: number; startedAt: number } | null>(null)
  const [result, setResult] = useState<{ blob: Blob; format: AudioFormat } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)
  const [resultUrl, setResultUrl] = useState<string>()

  useEffect(() => {
    const url = result ? URL.createObjectURL(result.blob) : undefined
    setResultUrl(url)
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
          'Browser ini belum mendukung WebCodecs untuk mengolah audio. Pakai Chrome, Edge, Safari 16.4+, atau Firefox 130+.',
      })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading' })
    try {
      const [info, formats] = await Promise.all([probeMedia(next), availableFormats()])
      if (!info.audio) {
        setStatus({ kind: 'error', message: 'File ini tidak berisi suara.' })
        return
      }
      if (!formats.includes(format)) setFormat(formats[0])
      // Do not offer a "compression" that raises the bitrate: start just below the source.
      const src = info.audio.bitrate
      if (src) setBitrate(BITRATE_OPTIONS.filter((o) => o.value < src * 0.95).at(-1)?.value ?? 64_000)
      setStatus({ kind: 'ready', info, formats })
    } catch {
      setStatus({
        kind: 'error',
        message:
          'File tidak bisa dibaca. Format yang didukung: MP3, M4A/AAC, WAV, OGG, Opus, FLAC, serta video MP4/MOV/WebM.',
      })
    }
  }

  async function run() {
    if (!file) return
    setResult(null)
    setError(null)
    setJob({ progress: 0, startedAt: Date.now() })
    try {
      const blob = await compressAudio(
        file,
        { format, bitrate, mono },
        (progress) => setJob((j) => (j ? { ...j, progress } : j)),
        (cancel) => (cancelRef.current = cancel),
      )
      setResult({ blob, format })
    } catch (e) {
      if (/cancel/i.test(String(e))) return
      setError('Gagal mengompres audio. File mungkin rusak atau memakai format yang tidak didukung.')
    } finally {
      setJob(null)
      cancelRef.current = null
    }
  }

  if (status.kind === 'ready' && file) {
    const { info, formats } = status
    const a = info.audio!
    const busy = job !== null
    const estimate = (bitrate * info.duration) / 8
    const isVideo = !!info.video

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="font-mono text-[13px] text-muted-foreground">
              {formatSize(file.size)} · {formatDuration(info.duration)} · {a.codec ?? '?'} ·{' '}
              {a.bitrate ? `${Math.round(a.bitrate / 1000)} kbps` : '—'} ·{' '}
              {a.channels === 1 ? 'mono' : `${a.channels} ch`} · {(a.sampleRate / 1000).toFixed(1)} kHz
            </p>
            {isVideo && <p className="mt-1 text-xs text-muted-foreground">File video — hanya suaranya yang diambil.</p>}
          </div>
          <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
            <RotateCcw />
            File lain
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
          <Segmented
            label="Format"
            value={format}
            options={formats.map((f) => ({ value: f, label: FORMATS[f].label }))}
            disabled={busy}
            onChange={setFormat}
          />
          <Segmented label="Bitrate" value={bitrate} options={BITRATE_OPTIONS} disabled={busy} onChange={setBitrate} />
          <Segmented
            label="Kanal"
            value={mono ? 'mono' : 'stereo'}
            options={CHANNEL_OPTIONS}
            disabled={busy}
            onChange={(v) => setMono(v === 'mono')}
          />
          <div className="ml-auto flex items-center gap-4">
            <p className="text-right text-xs text-muted-foreground">
              {BITRATE_HINT[bitrate]}
              <br />
              perkiraan <span className="font-mono text-foreground">~{formatSize(estimate)}</span>
            </p>
            <Button onClick={() => void run()} disabled={busy}>
              <Sparkles />
              Kompres
            </Button>
          </div>
        </div>

        {job && (
          <ProgressCard
            label="Mengompres audio…"
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
          <SizeResult before={file.size} after={result.blob.size}>
            {resultUrl && <audio src={resultUrl} controls className="w-full sm:max-w-sm" />}
            <Button
              onClick={() =>
                downloadBlob(result.blob, file.name.replace(/\.[^.]+$/, '') + '-kompres.' + FORMATS[result.format].ext)
              }
            >
              <Download />
              Unduh {FORMATS[result.format].ext.toUpperCase()}
            </Button>
          </SizeResult>
        )}

        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FileDrop
        accept="audio/*,video/*,.m4a,.opus,.flac,.mkv"
        label="Tarik file audio (atau video) ke sini"
        busyLabel={status.kind === 'reading' ? `Membaca ${file?.name}…` : undefined}
        onFiles={([f]) => void open(f)}
      />
      <p className="text-center text-xs text-muted-foreground">
        MP3, M4A, WAV, OGG, Opus, FLAC — atau video, untuk mengambil suaranya saja.
      </p>
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
