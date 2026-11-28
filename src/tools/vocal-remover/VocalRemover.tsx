import { useEffect, useRef, useState } from 'react'
import { Download, Mic2, RotateCcw, Split, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { ProgressCard } from '@/components/tool/SizeResult'
import { downloadBlob } from '@/lib/download'
import { formatDuration, formatSize, formatTime, NoEncoderError } from '@/lib/media'
import { tr, useT } from '@/lib/i18n'
import { mp3Blob, wavBlob } from './encode'
import { RATE, type Source } from './separate'
import type { Backend, Reply, Request } from './worker'

type Stem = Source | 'instrumental'
type Mode = 'two' | 'four'
type Quality = 2 | 4
type Format = 'mp3' | 'wav'

const MAX_BYTES = 300 * 1024 * 1024

/** A phone, or a computer with little memory: shorter pieces, since the model needs about 2–3 GB and a phone's CPU is slow. */
function isSmallDevice() {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return window.matchMedia('(pointer: coarse)').matches || (mem !== undefined && mem < 4)
}

/** Longest piece processed at once, in seconds. */
function maxSeconds(mode: Mode) {
  if (isSmallDevice()) return mode === 'two' ? 120 : 60
  return mode === 'two' ? 600 : 360
}

const STEM_ORDER: Stem[] = ['instrumental', 'vocals', 'drums', 'bass', 'other']
const stemLabel = (s: Stem) =>
  ({
    instrumental: tr('Instrumental (tanpa vokal)', 'Instrumental (no vocals)'),
    vocals: tr('Vokal', 'Vocals'),
    drums: tr('Drum', 'Drums'),
    bass: 'Bass',
    other: tr('Lainnya (gitar, piano, synth…)', 'Other (guitar, keys, synths…)'),
  })[s]
const stemFile = (s: Stem) => ({ instrumental: 'instrumental', vocals: 'vokal', drums: 'drum', bass: 'bass', other: 'lainnya' })[s]

interface Song {
  file: File
  url: string
  buffer: AudioBuffer
}

interface Result {
  stems: { stem: Stem; wav: Blob; url: string }[]
  from: number
  to: number
}

async function decodeStereo(file: File) {
  // decodeAudioData resamples to the context's rate: the model's 44.1 kHz.
  return new OfflineAudioContext(2, 1, RATE).decodeAudioData(await file.arrayBuffer())
}

export default function VocalRemover() {
  const t = useT()
  const [song, setSong] = useState<Song | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('two')
  const [quality, setQuality] = useState<Quality>(2)
  const [format, setFormat] = useState<Format>('mp3')
  const [start, setStart] = useState(0)
  const [job, setJob] = useState<{ progress: number; startedAt: number; label: string } | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [saving, setSaving] = useState<Stem | null>(null)
  const [error, setError] = useState('')
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => () => void (song && URL.revokeObjectURL(song.url)), [song])
  useEffect(() => () => result?.stems.forEach((s) => URL.revokeObjectURL(s.url)), [result])
  useEffect(() => () => workerRef.current?.terminate(), [])

  async function open(file: File) {
    setError('')
    setResult(null)
    if (file.size > MAX_BYTES) return setError(t('File terlalu besar — maksimal 300 MB.', 'The file is too big — 300 MB at most.'))
    setOpening(file.name)
    try {
      const buffer = await decodeStereo(file)
      setStart(0)
      setSong({ file, url: URL.createObjectURL(file), buffer })
    } catch {
      setError(
        t(
          'Browser ini tidak bisa membaca file itu. Coba MP3, M4A, WAV, OGG, FLAC, atau video MP4.',
          "This browser can't read that file. Try MP3, M4A, WAV, OGG, FLAC or an MP4 video.",
        ),
      )
    } finally {
      setOpening(null)
    }
  }

  function run() {
    if (!song) return
    setError('')
    setResult(null)
    const { buffer } = song
    const limit = maxSeconds(mode)
    const from = Math.min(start, Math.max(0, buffer.duration - limit))
    const to = Math.min(buffer.duration, from + limit)
    const a = Math.floor(from * RATE)
    const b = Math.floor(to * RATE)
    const left = buffer.getChannelData(0).slice(a, b)
    const right = (buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0)).slice(a, b)

    // One worker per page visit: the model stays loaded between runs.
    const worker = (workerRef.current ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }))
    const startedAt = Date.now()
    setJob({ progress: 0, startedAt, label: t('Menyiapkan model AI…', 'Preparing the AI model…') })
    const engineLabel = (backend: Backend) =>
      backend === 'webgpu' ? t('Memisahkan dengan GPU…', 'Separating on the GPU…') : t('Memisahkan dengan CPU…', 'Separating on the CPU…')
    worker.onmessage = (e: MessageEvent<Reply>) => {
      const msg = e.data
      if (msg.type === 'loading') {
        const mb = msg.total ? ` ${Math.round(msg.loaded / 1e6)}/${Math.round(msg.total / 1e6)} MB` : ''
        setJob({ progress: 0, startedAt, label: t('Mengunduh model AI (sekali saja)…', 'Downloading the AI model (once)…') + mb })
      } else if (msg.type === 'progress') {
        setJob((j) => ({ progress: msg.done / msg.total, startedAt: msg.done === 0 ? Date.now() : (j?.startedAt ?? startedAt), label: engineLabel(msg.backend) }))
      } else if (msg.type === 'done') {
        const stems = STEM_ORDER.flatMap((stem) => {
          const pair = msg.stems[stem]
          if (!pair) return []
          const wav = wavBlob(pair, RATE)
          return [{ stem, wav, url: URL.createObjectURL(wav) }]
        })
        setResult({ stems, from, to })
        setJob(null)
      } else {
        console.error('vocal-remover:', msg.message)
        setJob(null)
        workerRef.current?.terminate()
        workerRef.current = null
        setError(
          /memory|alloc|OOM/i.test(msg.message)
            ? t('Memori perangkat tidak cukup. Coba bagian yang lebih pendek atau mode Vokal + Instrumental.', 'Not enough memory. Try a shorter part or the Vocals + Instrumental mode.')
            : t('Gagal memisahkan audio. Coba muat ulang halaman, lalu ulangi.', "Couldn't separate the audio. Reload the page and try again."),
        )
      }
    }
    worker.onerror = () => {
      setJob(null)
      workerRef.current?.terminate()
      workerRef.current = null
      setError(t('Model AI tidak bisa dimuat. Periksa koneksi, lalu coba lagi.', "The AI model couldn't load. Check your connection and try again."))
    }
    const msg: Request = {
      type: 'run',
      left,
      right,
      overlap: quality,
      sources: mode === 'two' ? ['vocals'] : ['vocals', 'drums', 'bass', 'other'],
    }
    worker.postMessage(msg, [left.buffer, right.buffer])
  }

  function cancel() {
    // Stopping the worker stops a segment mid-run; the model comes back from the cache next time.
    workerRef.current?.terminate()
    workerRef.current = null
    setJob(null)
  }

  async function save(stem: Stem, wav: Blob) {
    if (!song) return
    setError('')
    const base = `${song.file.name.replace(/\.[^.]+$/, '')}-${stemFile(stem)}`
    if (format === 'wav') return downloadBlob(wav, `${base}.wav`)
    setSaving(stem)
    try {
      downloadBlob(await mp3Blob(wav, RATE), `${base}.mp3`)
    } catch (e) {
      setError(
        e instanceof NoEncoderError
          ? t('Browser ini tidak bisa membuat MP3. Pilih WAV.', "This browser can't make MP3. Pick WAV.")
          : t('Gagal menyimpan MP3. Coba WAV.', "Couldn't save the MP3. Try WAV."),
      )
    } finally {
      setSaving(null)
    }
  }

  if (!song)
    return (
      <div className="space-y-6">
        <FileDrop
          accept="audio/*,video/*,.mp3,.m4a,.flac,.wav,.ogg"
          label={t('Tarik lagu ke sini', 'Drop a song here')}
          busyLabel={opening ? `${t('Membuka', 'Opening')} ${opening}…` : undefined}
          onFiles={([f]) => void open(f)}
        />
        {error && <ErrorNote message={error} />}
      </div>
    )

  const { buffer, file } = song
  const busy = job !== null
  const limit = maxSeconds(mode)
  const tooLong = buffer.duration > limit
  const lastStart = Math.max(0, Math.floor(buffer.duration - limit))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatDuration(buffer.duration)} · {formatSize(file.size)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={busy}>
            <Split />
            {t('Pisahkan', 'Separate')}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setSong(null)
              setResult(null)
            }}
          >
            <RotateCcw />
            {t('Lagu lain', 'Another song')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">{t('Lagu asli', 'Original')}</p>
          <audio src={song.url} controls className="w-full" />
        </div>
        <div className="space-y-5 rounded-2xl border bg-card p-5">
          <Segmented
            label={t('Pisahkan jadi', 'Split into')}
            value={mode}
            options={[
              { value: 'two', label: t('Vokal + Instrumental', 'Vocals + Instrumental') },
              { value: 'four', label: t('4 stem', '4 stems') },
            ]}
            onChange={setMode}
          />
          <Segmented
            label={t('Kualitas', 'Quality')}
            value={quality}
            options={[
              { value: 2, label: t('Cepat', 'Fast') },
              { value: 4, label: t('Teliti', 'Thorough') },
            ]}
            onChange={setQuality}
          />
          <Segmented
            label={t('Format unduhan', 'Download format')}
            value={format}
            options={[
              { value: 'mp3', label: 'MP3' },
              { value: 'wav', label: 'WAV' },
            ]}
            onChange={setFormat}
          />
          {tooLong && (
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-medium" htmlFor="vr-start">
                <span>{t('Mulai dari', 'Start at')}</span>
                <span className="font-mono text-muted-foreground">
                  {formatTime(Math.min(start, lastStart))} – {formatTime(Math.min(start, lastStart) + limit)}
                </span>
              </label>
              <input
                id="vr-start"
                type="range"
                min={0}
                max={lastStart}
                step={1}
                value={Math.min(start, lastStart)}
                disabled={busy}
                onChange={(e) => setStart(Number(e.target.value))}
                className="w-full accent-[var(--brand-2)]"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  `Di perangkat ini diproses paling lama ${formatDuration(limit)} sekali jalan, supaya memori cukup. Geser untuk memilih bagiannya.`,
                  `This device processes up to ${formatDuration(limit)} at a time so memory holds out. Slide to pick the part.`,
                )}
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t(
              'Model AI SCNet (±24 MB, diunduh sekali lalu tersimpan) berjalan di perangkatmu, tidak ada yang diunggah. Dengan GPU kira-kira secepat lagunya diputar; tanpa GPU bisa beberapa kali lebih lama.',
              'The SCNet AI model (±24 MB, downloaded once and cached) runs on your device; nothing is uploaded. With a GPU it takes about as long as the song; without one it can take several times longer.',
            )}
          </p>
        </div>
      </div>

      {job && (
        <ProgressCard
          label={job.label}
          progress={job.progress}
          startedAt={job.startedAt}
          action={
            <Button variant="ghost" size="sm" onClick={cancel}>
              <Square />
              {t('Batalkan', 'Cancel')}
            </Button>
          }
        />
      )}

      {result && (
        <div className="space-y-3">
          {result.to - result.from < buffer.duration - 0.5 && (
            <p className="text-sm text-muted-foreground">
              {t('Bagian', 'Part')} {formatTime(result.from)} – {formatTime(result.to)}
            </p>
          )}
          {result.stems.map(({ stem, wav, url }) => (
            <div key={stem} className="space-y-3 rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-medium">
                  {stem === 'vocals' && <Mic2 className="size-4" />}
                  {stemLabel(stem)}
                </p>
                <Button size="sm" variant="outline" disabled={saving !== null} onClick={() => void save(stem, wav)}>
                  <Download />
                  {saving === stem ? t('Menyimpan…', 'Saving…') : `.${format}`}
                </Button>
              </div>
              <audio src={url} controls className="w-full" />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            {t(
              'Hasil terbaik untuk lagu studio. Gema vokal, paduan suara, atau suara yang mirip vokal (seruling, synth) bisa tersisa sedikit.',
              'Works best on studio recordings. Vocal reverb, choirs, or voice-like sounds (flutes, synths) may leave a little behind.',
            )}
          </p>
        </div>
      )}

      {error && <ErrorNote message={error} />}
    </div>
  )
}
