import { useEffect, useRef, useState } from 'react'
import { AudioLines, Download, RotateCcw, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { ProgressCard } from '@/components/tool/SizeResult'
import { downloadBlob } from '@/lib/download'
import { formatDuration, formatSize, hasWebCodecs, isCanceled, NoEncoderError, probeMedia, type AudioOut, type MediaInfo } from '@/lib/media'
import { useT } from '@/lib/i18n'
import { denoiseMedia, outputFor, type DenoiseOptions, type Engine } from './denoise'

type Status = { kind: 'idle' } | { kind: 'reading' } | { kind: 'ready'; info: MediaInfo } | { kind: 'error'; message: string }

const OUT_OPTIONS: { value: AudioOut; label: string }[] = [
  { value: 'mp3', label: 'MP3' },
  { value: 'm4a', label: 'M4A' },
  { value: 'wav', label: 'WAV' },
]

export default function Denoise() {
  const t = useT()
  const STRENGTH_OPTIONS: { value: number; label: string }[] = [
    { value: 0.6, label: t('Ringan', 'Light') },
    { value: 0.85, label: t('Sedang', 'Medium') },
    { value: 1, label: t('Penuh', 'Full') },
  ]
  const ENGINE_OPTIONS: { value: Engine; label: string }[] = [
    { value: 'deepfilter', label: t('Jernih (DeepFilterNet)', 'Clear (DeepFilterNet)') },
    { value: 'rnnoise', label: t('Cepat (RNNoise)', 'Fast (RNNoise)') },
  ]
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [opts, setOpts] = useState<DenoiseOptions>({ engine: 'deepfilter', strength: 1, audioOut: 'mp3' })
  const [job, setJob] = useState<{ progress: number; startedAt: number } | null>(null)
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result])

  async function open(next: File) {
    setError(null)
    setResult(null)
    if (!hasWebCodecs()) {
      setStatus({
        kind: 'error',
        message: t(
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
      if (!info.audio) {
        setStatus({ kind: 'error', message: t('File ini tidak punya suara.', 'This file has no audio.') })
        return
      }
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
      const blob = await denoiseMedia(
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
          ? t('Browser ini tidak bisa meng-encode hasilnya. Coba Chrome atau Edge terbaru.', "This browser can't encode the result. Try the latest Chrome or Edge.")
          : t(
              'Gagal membersihkan suara. File mungkin rusak atau formatnya belum didukung.',
              "Couldn't clean the audio. The file may be damaged or its format isn't supported yet.",
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
    const name = `${file.name.replace(/\.[^.]+$/, '')}-bersih.${out.ext}`
    const player = (src: string) =>
      isVideo ? (
        <video src={src} controls playsInline className="max-h-[45vh] w-full rounded-xl bg-black" />
      ) : (
        <audio src={src} controls className="w-full" />
      )

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatDuration(info.duration)} · {formatSize(file.size)} · {t('hasil', 'output')} .{out.ext}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void run(info)} disabled={busy}>
              <AudioLines />
              {t('Bersihkan suara', 'Clean audio')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setStatus({ kind: 'idle' })}>
              <RotateCcw />
              {t('File lain', 'Another file')}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2 rounded-2xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{t('Sebelum', 'Before')}</p>
            {player(url)}
          </div>

          <div className="space-y-5 rounded-2xl border bg-card p-5">
            <div className="space-y-2">
              <Segmented label={t('Mesin', 'Engine')} value={opts.engine} options={ENGINE_OPTIONS} onChange={(v) => setOpts((o) => ({ ...o, engine: v }))} />
              <p className="text-xs text-muted-foreground">
                {opts.engine === 'deepfilter'
                  ? t(
                      'Suara lebih jernih dan tidak mendem. Unduh model ±13 MB sekali saja (lalu tersimpan), proses lebih lama, berat di HP lama.',
                      'Clearer, not muffled. A one-time ±13 MB model download (then cached), slower, heavy on older phones.',
                    )
                  : t('Ringan (110 KB) dan cepat, tapi suara bisa sedikit mendem.', 'Light (110 KB) and fast, but voices can sound slightly muffled.')}
              </p>
            </div>
            <Segmented
              label={t('Kekuatan', 'Strength')}
              value={opts.strength}
              options={STRENGTH_OPTIONS}
              onChange={(v) => setOpts((o) => ({ ...o, strength: v }))}
            />
            {!isVideo && (
              <Segmented label={t('Format hasil', 'Output format')} value={opts.audioOut} options={OUT_OPTIONS} onChange={(v) => setOpts((o) => ({ ...o, audioOut: v }))} />
            )}
            <p className="text-xs text-muted-foreground">
              {t(
                'Paling ampuh untuk suara orang bicara: dengung, desis, kipas, AC, dan bising jalan diredam. Musik dan suara selain ucapan ikut teredam, jadi untuk lagu pilih Ringan atau jangan dipakai.',
                'Works best on speech: hum, hiss, fans, AC, and street noise are suppressed. Music and non-speech sounds get suppressed too, so pick Light for songs or skip it.',
              )}
              {isVideo &&
                ' ' +
                  t(
                    'Gambar video disalin apa adanya; hanya suaranya yang diproses. Hasilnya MP4.',
                    'The picture is copied as is; only the audio is processed. The output is MP4.',
                  )}
            </p>
          </div>
        </div>

        {job && (
          <ProgressCard
            label={t('Membersihkan suara…', 'Cleaning audio…')}
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
            <p className="text-xs font-medium text-muted-foreground">{t('Sesudah', 'After')}</p>
            {player(result.url)}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {t('Hasil', 'Result')} {formatSize(result.blob.size)}
              </p>
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
