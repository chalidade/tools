import { useEffect, useRef, useState } from 'react'
import { Download, Gauge, RotateCcw, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { ProgressCard } from '@/components/tool/SizeResult'
import { downloadBlob } from '@/lib/download'
import {
  formatDuration,
  formatSize,
  hasWebCodecs,
  isCanceled,
  NoEncoderError,
  probeMedia,
  type AudioOut,
  type MediaInfo,
} from '@/lib/media'
import { locale, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { changeSpeed, outputFor, type SpeedOptions } from './speed'

type Status = { kind: 'idle' } | { kind: 'reading' } | { kind: 'ready'; info: MediaInfo } | { kind: 'error'; message: string }

const PRESETS = [0.25, 0.5, 0.75, 1.25, 1.5, 2, 3, 4]
/** "0,25×" in Indonesian, "0.25×" in English — the decimal mark follows the language. */
const times = (speed: number) => `${Number(speed.toFixed(2)).toLocaleString(locale())}×`
const OUT_OPTIONS: { value: AudioOut; label: string }[] = [
  { value: 'mp3', label: 'MP3' },
  { value: 'm4a', label: 'M4A' },
  { value: 'wav', label: 'WAV' },
]

export default function ChangeSpeed() {
  const t = useT()
  const PITCH_OPTIONS: { value: 'keep' | 'shift'; label: string }[] = [
    { value: 'keep', label: t('Tetap (suara normal)', 'Keep (normal voice)') },
    { value: 'shift', label: t('Ikut berubah', 'Change with speed') },
  ]
  const AUDIO_OPTIONS: { value: 'keep' | 'drop'; label: string }[] = [
    { value: 'keep', label: t('Pertahankan', 'Keep') },
    { value: 'drop', label: t('Hapus suara', 'Remove audio') },
  ]
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [opts, setOpts] = useState<SpeedOptions>({ speed: 2, keepPitch: true, keepAudio: true, audioOut: 'mp3' })
  const [job, setJob] = useState<{ progress: number; startedAt: number } | null>(null)
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)
  const previewRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result])

  // Let the source player preview the speed (the browser keeps the pitch too).
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    el.playbackRate = Math.min(4, Math.max(0.25, opts.speed))
    el.preservesPitch = opts.keepPitch
  }, [opts.speed, opts.keepPitch, url])

  async function open(next: File) {
    setError(null)
    setResult(null)
    if (!hasWebCodecs()) {
      setStatus({ kind: 'error', message: t(
          'Browser ini belum mendukung WebCodecs. Pakai Chrome, Edge, Safari 16.4+, atau Firefox 130+.',
          "This browser doesn't support WebCodecs yet. Use Chrome, Edge, Safari 16.4+, or Firefox 130+.",
        ),
      })
      return
    }
    setFile(next)
    setStatus({ kind: 'reading' })
    try {
      const info = await probeMedia(next)
      setUrl(URL.createObjectURL(next))
      setStatus({ kind: 'ready', info })
    } catch {
      setStatus({
        kind: 'error',
        message: t(
          'File tidak bisa dibaca. Didukung: MP4, MOV, WebM, MKV, MP3, M4A, WAV, OGG, FLAC.',
          "Couldn't read the file. Supported: MP4, MOV, WebM, MKV, MP3, M4A, WAV, OGG, FLAC.",
        ),
      })
    }
  }

  async function run(info: MediaInfo) {
    if (!file) return
    setError(null)
    setResult(null)
    setJob({ progress: 0, startedAt: Date.now() })
    try {
      const blob = await changeSpeed(
        file,
        info,
        opts,
        (progress) => setJob((j) => (j ? { ...j, progress } : j)),
        (cancel) => (cancelRef.current = cancel),
      )
      setResult({ blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      if (isCanceled(e)) return
      setError(
        e instanceof NoEncoderError
          ? t(
              'Browser ini tidak bisa meng-encode hasilnya. Coba Chrome atau Edge terbaru.',
              "This browser can't encode the result. Try the latest Chrome or Edge.",
            )
          : t(
              'Gagal mengubah kecepatan. File mungkin rusak atau formatnya belum didukung.',
              "Couldn't change the speed. The file may be damaged or its format isn't supported yet.",
            ),
      )
    } finally {
      setJob(null)
      cancelRef.current = null
    }
  }

  if (status.kind === 'ready' && file && url) {
    const { info } = status
    const busy = job !== null
    const isVideo = !!info.video
    const out = outputFor(info, opts)
    const valid = opts.speed >= 0.25 && opts.speed <= 4 && opts.speed !== 1
    const name = `${file.name.replace(/\.[^.]+$/, '')}-${Number(opts.speed.toFixed(2))}x.${out.ext}`
    const set = <K extends keyof SpeedOptions>(k: K, v: SpeedOptions[K]) => setOpts((o) => ({ ...o, [k]: v }))

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatDuration(info.duration)} → <span className="font-medium text-foreground">{formatDuration(info.duration / opts.speed)}</span>{' '}
              · {formatSize(file.size)} · {t('hasil', 'output')} .{out.ext}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void run(info)} disabled={busy || !valid}>
              <Gauge />
              {t('Ubah ke', 'Change to')} {times(opts.speed)}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2 rounded-2xl border bg-card p-4">
            {isVideo ? (
              <video ref={previewRef} src={url} controls playsInline className="max-h-[45vh] w-full rounded-xl bg-black" />
            ) : (
              <audio ref={previewRef} src={url} controls className="w-full" />
            )}
            <p className="text-xs text-muted-foreground">
              {t('Pratinjau sudah diputar di', 'The preview already plays at')} {times(opts.speed)}.
            </p>
          </div>

          <div className="space-y-5 rounded-2xl border bg-card p-5">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('Kecepatan', 'Speed')}</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={opts.speed === s}
                    onClick={() => set('speed', s)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 font-mono text-sm',
                      opts.speed === s ? 'border-brand-2/60 bg-brand-2/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {times(s)}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.05}
                value={opts.speed}
                aria-label={t('Kecepatan', 'Speed')}
                onChange={(e) => set('speed', Number(e.target.value))}
                className="w-full accent-[var(--brand-2)]"
              />
              <p className="text-xs text-muted-foreground">
                {times(opts.speed)} ·{' '}
                {opts.speed < 1
                  ? t('diperlambat', 'slowed down')
                  : opts.speed > 1
                    ? t('dipercepat', 'sped up')
                    : t('kecepatan asli', 'original speed')}{' '}
                ({times(0.25)} {t('sampai', 'to')} {times(4)})
              </p>
            </div>

            {info.audio && (
              <>
                {isVideo && (
                  <Segmented
                    label={t('Suara', 'Audio')}
                    value={opts.keepAudio ? 'keep' : 'drop'}
                    options={AUDIO_OPTIONS}
                    onChange={(v) => set('keepAudio', v === 'keep')}
                  />
                )}
                {(opts.keepAudio || !isVideo) && (
                  <Segmented
                    label={t('Nada suara', 'Pitch')}
                    value={opts.keepPitch ? 'keep' : 'shift'}
                    options={PITCH_OPTIONS}
                    onChange={(v) => set('keepPitch', v === 'keep')}
                  />
                )}
              </>
            )}
            {!isVideo && <Segmented label={t('Format hasil', 'Output format')} value={opts.audioOut} options={OUT_OPTIONS} onChange={(v) => set('audioOut', v)} />}
            {isVideo && (
              <p className="text-xs text-muted-foreground">
                {t(
                  'Video di-encode ulang ke MP4 (H.264 bila browser mendukung). Saat dipercepat, frame rate tetap',
                  'The video is re-encoded to MP4 (H.264 if your browser supports it). When sped up, the frame rate stays at',
                )}{' '}
                {Math.round(info.video!.fps)} fps;{' '}
                {t(
                  'saat diperlambat, gerakannya jadi lebih patah-patah karena tidak ada frame baru yang dibuat.',
                  'when slowed down, motion gets choppier because no new frames are created.',
                )}
              </p>
            )}
          </div>
        </div>

        {job && (
          <ProgressCard
            label={t('Memproses…', 'Processing…')}
            progress={job.progress}
            startedAt={job.startedAt}
            action={
              <Button variant="ghost" size="sm" onClick={() => cancelRef.current?.()}>
                <Square />
                {t('Batalkan', 'Cancel')}
              </Button>
            }
          />
        )}

        {result && (
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            {isVideo ? (
              <video src={result.url} controls playsInline className="mx-auto max-h-[45vh] w-full rounded-xl bg-black" />
            ) : (
              <audio src={result.url} controls className="w-full" />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t('Hasil', 'Result')} {formatSize(result.blob.size)}</p>
              <Button onClick={() => downloadBlob(result.blob, name)}>
                <Download />
                {t('Unduh', 'Download')} .{out.ext}
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
        label={t('Tarik video atau audio ke sini', 'Drop a video or audio file here')}
        busyLabel={status.kind === 'reading' ? `${t('Membuka', 'Opening')} ${file?.name}…` : undefined}
        onFiles={([f]) => void open(f)}
      />
      {status.kind === 'error' && <ErrorNote message={status.message} />}
    </div>
  )
}
