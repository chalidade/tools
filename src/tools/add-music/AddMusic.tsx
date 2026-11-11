import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, Music, RotateCcw, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { ProgressCard } from '@/components/tool/SizeResult'
import { downloadBlob } from '@/lib/download'
import { formatDuration, formatSize, formatTime, hasWebCodecs, isCanceled, NoEncoderError, probeMedia, type MediaInfo } from '@/lib/media'
import { useT } from '@/lib/i18n'
import { addMusic, type AddMusicOptions } from './add-music'

interface Picked {
  file: File
  info: MediaInfo
  url: string
}

export default function AddMusic() {
  const t = useT()
  const [video, setVideo] = useState<Picked | null>(null)
  const [music, setMusic] = useState<Picked | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [opts, setOpts] = useState<AddMusicOptions>({
    musicVolume: 0.3,
    originalVolume: 1,
    musicStart: 0,
    loop: true,
    fade: true,
    duck: true,
  })
  const [job, setJob] = useState<{ progress: number; startedAt: number } | null>(null)
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  useEffect(() => () => void (video && URL.revokeObjectURL(video.url)), [video])
  useEffect(() => () => void (music && URL.revokeObjectURL(music.url)), [music])
  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result])

  const set = <K extends keyof AddMusicOptions>(k: K, v: AddMusicOptions[K]) => {
    setOpts((o) => ({ ...o, [k]: v }))
    setResult(null)
  }

  async function open(file: File, kind: 'video' | 'music') {
    setError(null)
    setResult(null)
    if (!hasWebCodecs()) {
      setError(
        t(
          'Browser ini belum mendukung WebCodecs. Pakai Chrome, Edge, Safari 16.4+, atau Firefox 130+.',
          "This browser doesn't support WebCodecs yet. Use Chrome, Edge, Safari 16.4+, or Firefox 130+.",
        ),
      )
      return
    }
    setOpening(file.name)
    try {
      const info = await probeMedia(file)
      if (kind === 'video' && !info.video) throw new Error('no video')
      if (kind === 'music' && !info.audio) throw new Error('no audio')
      const picked = { file, info, url: URL.createObjectURL(file) }
      if (kind === 'video') setVideo(picked)
      else {
        setMusic(picked)
        set('musicStart', 0)
      }
    } catch {
      setError(
        kind === 'video'
          ? t('Video tidak bisa dibaca. Didukung: MP4, MOV, WebM, MKV.', "Couldn't read the video. Supported: MP4, MOV, WebM, MKV.")
          : t('Musik tidak bisa dibaca. Didukung: MP3, M4A, WAV, OGG, FLAC.', "Couldn't read the music. Supported: MP3, M4A, WAV, OGG, FLAC."),
      )
    } finally {
      setOpening(null)
    }
  }

  async function run() {
    if (!video || !music) return
    setError(null)
    setResult(null)
    setJob({ progress: 0, startedAt: Date.now() })
    try {
      const blob = await addMusic(
        video.file,
        video.info,
        music.file,
        music.info,
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
              'Gagal menambahkan musik. File mungkin rusak atau formatnya belum didukung.',
              "Couldn't add the music. A file may be damaged or its format isn't supported yet.",
            ),
      )
    } finally {
      setJob(null)
      cancelRef.current = null
    }
  }

  if (!video) {
    return (
      <div className="space-y-6">
        <FileDrop
          accept="video/*,.mkv"
          label={t('Tarik video ke sini', 'Drop a video here')}
          busyLabel={opening ? `${t('Membuka', 'Opening')} ${opening}…` : undefined}
          onFiles={([f]) => void open(f, 'video')}
        />
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  const busy = job !== null
  const hasSound = !!video.info.audio
  const name = `${video.file.name.replace(/\.[^.]+$/, '')}-musik.mp4`
  const percent = (v: number) => `${Math.round(v * 100)}%`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{video.file.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatDuration(video.info.duration)} · {formatSize(video.file.size)}
            {!hasSound && ` · ${t('tanpa suara', 'no sound')}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void run()} disabled={busy || !music}>
            <Music />
            {t('Tambahkan musik', 'Add music')}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setVideo(null)
              setResult(null)
            }}
          >
            <RotateCcw />
            {t('Video lain', 'Another video')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          <video src={video.url} controls playsInline className="max-h-[45vh] w-full rounded-xl bg-black" />
        </div>

        <div className="space-y-5 rounded-2xl border bg-card p-5">
          {music ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium">
                  <Music className="mr-1.5 inline size-4 align-[-3px] text-muted-foreground" />
                  {music.file.name} <span className="text-muted-foreground">· {formatDuration(music.info.duration)}</span>
                </p>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setMusic(null)} aria-label={t('Ganti musik', 'Change music')}>
                  <X />
                </Button>
              </div>
              <audio src={music.url} controls className="w-full" />
            </div>
          ) : (
            <FileDrop
              accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac"
              label={t('Tarik musik ke sini', 'Drop music here')}
              busyLabel={opening ? `${t('Membuka', 'Opening')} ${opening}…` : undefined}
              onFiles={([f]) => void open(f, 'music')}
            />
          )}

          <Slider label={t('Volume musik', 'Music volume')} value={opts.musicVolume} text={percent(opts.musicVolume)} onChange={(v) => set('musicVolume', v)} />
          {hasSound && (
            <Slider
              label={t('Volume suara asli', 'Original sound volume')}
              value={opts.originalVolume}
              text={opts.originalVolume === 0 ? t('dibisukan', 'muted') : percent(opts.originalVolume)}
              onChange={(v) => set('originalVolume', v)}
            />
          )}
          {music && music.info.duration > 1 && (
            <Slider
              label={t('Musik mulai dari', 'Start the music at')}
              value={opts.musicStart}
              max={Math.floor(music.info.duration - 1)}
              step={0.5}
              text={formatTime(opts.musicStart)}
              onChange={(v) => set('musicStart', v)}
            />
          )}

          <div className="space-y-2 text-sm">
            <Check checked={opts.loop} onChange={(v) => set('loop', v)}>
              {t('Ulangi musik bila lebih pendek dari video', 'Loop the music if it is shorter than the video')}
            </Check>
            <Check checked={opts.fade} onChange={(v) => set('fade', v)}>
              {t('Fade in di awal, fade out di akhir', 'Fade in at the start, fade out at the end')}
            </Check>
            {hasSound && opts.originalVolume > 0 && (
              <Check checked={opts.duck} onChange={(v) => set('duck', v)}>
                {t('Kecilkan musik otomatis saat ada suara (orang bicara)', 'Lower the music automatically when there is sound (someone talking)')}
              </Check>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('Gambar video disalin apa adanya; hasilnya MP4.', 'The picture is copied as is; the output is MP4.')}
          </p>
        </div>
      </div>

      {job && (
        <ProgressCard
          label={t('Menambahkan musik…', 'Adding music…')}
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
          <video src={result.url} controls playsInline className="mx-auto max-h-[45vh] w-full rounded-xl bg-black" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t('Hasil', 'Result')} {formatSize(result.blob.size)}
            </p>
            <Button onClick={() => downloadBlob(result.blob, name)}>
              <Download />
              {t('Unduh', 'Download')} .mp4
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorNote message={error} />}
    </div>
  )
}

function Slider({
  label,
  value,
  text,
  onChange,
  max = 1,
  step = 0.05,
}: {
  label: string
  value: number
  text: string
  onChange: (v: number) => void
  max?: number
  step?: number
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex justify-between text-xs font-medium text-muted-foreground">
        {label}
        <span className="font-mono text-foreground">{text}</span>
      </span>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--brand-2)]"
      />
    </label>
  )
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-start gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4" />
      <span>{children}</span>
    </label>
  )
}
