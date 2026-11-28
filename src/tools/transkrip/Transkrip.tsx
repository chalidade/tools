import { useEffect, useRef, useState } from 'react'
import { Captions, Download, FileText, RotateCcw, Square, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { ProgressCard } from '@/components/tool/SizeResult'
import { downloadBlob, withExtension } from '@/lib/download'
import { audioMono, formatDuration, formatSize, probeMedia, UnsupportedMediaError, type MediaInfo } from '@/lib/media'
import { deliverIncoming } from '@/lib/native'
import { navigate, pageUrl } from '@/lib/route'
import { getLang, useT } from '@/lib/i18n'
import { clock, MODEL_BYTES, toSubtitle, toText } from './transcript'
import type { Reply, Request } from './worker'
import type { Segment } from './whisper'

type Lang = 'id' | 'en' | 'auto'

type Job =
  | { step: 'audio'; progress: number; startedAt: number }
  | { step: 'download'; progress: number; startedAt: number }
  | { step: 'loading'; progress: number; startedAt: number }
  | { step: 'transcribe'; progress: number; startedAt: number }

const RATE = 16000
const MAX_BYTES = 2 * 1024 * 1024 * 1024

export default function Transkrip() {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [info, setInfo] = useState<MediaInfo | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [lang, setLang] = useState<Lang>('id')
  const [detected, setDetected] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const [stamps, setStamps] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const canceledRef = useRef(false)
  const mediaRef = useRef<HTMLMediaElement | null>(null)

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  useEffect(() => () => workerRef.current?.terminate(), [])

  const LANGS: { value: Lang; label: string }[] = [
    { value: 'id', label: 'Indonesia' },
    { value: 'en', label: 'English' },
    { value: 'auto', label: t('Deteksi', 'Detect') },
  ]

  function reset() {
    cancel()
    setFile(null)
    setInfo(null)
    setUrl(null)
    setSegments(null)
    setError(null)
    setDetected(null)
  }

  async function open(next: File) {
    reset()
    if (next.size > MAX_BYTES) {
      setError(t('File terlalu besar (maksimal 2 GB).', 'The file is too large (2 GB max).'))
      return
    }
    setOpening(true)
    try {
      // Probing fails for some voice notes (e.g. WhatsApp .opus on Safari); they can still be decoded by the browser.
      const probed = await probeMedia(next).catch(() => null)
      if (probed && !probed.audio) {
        setError(t('File ini tidak punya suara.', 'This file has no audio.'))
        return
      }
      setFile(next)
      setInfo(probed)
      setUrl(URL.createObjectURL(next))
    } finally {
      setOpening(false)
    }
  }

  function cancel() {
    canceledRef.current = true
    workerRef.current?.terminate()
    workerRef.current = null
    setJob(null)
  }

  async function run() {
    if (!file) return
    canceledRef.current = false
    setError(null)
    setSegments(null)
    setDetected(null)
    setJob({ step: 'audio', progress: 0, startedAt: Date.now() })
    let audio: Float32Array
    try {
      audio = await audioMono(file, RATE, (p) => setJob((j) => (j?.step === 'audio' ? { ...j, progress: p } : j)))
    } catch (e) {
      if (canceledRef.current) return
      setJob(null)
      setError(
        e instanceof UnsupportedMediaError
          ? t(
              'Suara di file ini tidak bisa dibaca browser. Coba ubah dulu ke MP3 atau M4A dengan tool Kompres Audio.',
              "This browser can't read the audio in this file. Convert it to MP3 or M4A first with the Compress Audio tool.",
            )
          : t('Gagal membaca suara dari file ini.', "Couldn't read the audio from this file."),
      )
      return
    }
    if (canceledRef.current) return
    if (audio.length < RATE * 0.3) {
      setJob(null)
      setError(t('Suaranya terlalu pendek untuk ditranskrip.', 'The audio is too short to transcribe.'))
      return
    }

    const worker = (workerRef.current ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }))
    let transcribeStart = 0
    worker.onmessage = (e: MessageEvent<Reply>) => {
      const m = e.data
      if (m.type === 'download') setJob((j) => (j ? { ...j, step: 'download', progress: m.loaded / m.total } : j))
      else if (m.type === 'loading') setJob((j) => (j ? { ...j, step: 'loading', progress: 1 } : j))
      else if (m.type === 'language') setDetected(m.code)
      else if (m.type === 'progress') {
        if (!transcribeStart) transcribeStart = Date.now()
        setSegments(m.segments)
        setJob({ step: 'transcribe', progress: m.done, startedAt: transcribeStart })
      } else if (m.type === 'done') {
        setSegments(m.segments)
        setJob(null)
        if (!m.segments.length) setError(t('Tidak ada ucapan yang terdengar di file ini.', 'No speech was heard in this file.'))
      } else if (m.type === 'error') {
        setJob(null)
        workerRef.current?.terminate()
        workerRef.current = null
        setError(
          /fetch|HTTP|network/i.test(m.message)
            ? t('Model gagal diunduh. Periksa koneksi internet lalu coba lagi.', "Couldn't download the model. Check your connection and try again.")
            : /memory|allocation/i.test(m.message)
              ? t('Memori perangkat tidak cukup. Coba file yang lebih pendek atau tutup tab lain.', 'Not enough memory. Try a shorter file or close other tabs.')
              : t('Transkrip gagal. Coba lagi atau pakai file lain.', 'Transcription failed. Try again or use another file.'),
        )
      }
    }
    worker.onerror = () => {
      setJob(null)
      workerRef.current = null
      setError(t('Transkrip gagal dijalankan di browser ini.', "Transcription couldn't run in this browser."))
    }
    setJob({ step: 'download', progress: 0, startedAt: Date.now() })
    const msg: Request = { type: 'run', audio, language: lang }
    worker.postMessage(msg, [audio.buffer])
  }

  function edit(i: number, text: string) {
    setSegments((s) => (s ? s.map((x, j) => (j === i ? { ...x, text } : x)) : s))
  }

  function seek(sec: number) {
    const m = mediaRef.current
    if (!m) return
    m.currentTime = sec
    void m.play().catch(() => {})
  }

  function openInSubtitle() {
    if (!segments || !file) return
    const srt = toSubtitle(segments, 'srt')
    deliverIncoming('subtitle', new File([srt], withExtension(file.name, '.srt'), { type: 'application/x-subrip' }))
    navigate(pageUrl('subtitle', getLang()))
  }

  if (!file) {
    return (
      <div className="space-y-6">
        <FileDrop
          accept="audio/*,video/*,.opus,.ogg,.m4a,.mkv,.flac,.amr"
          label={t('Tarik rekaman, voice note, atau video ke sini', 'Drop a recording, voice note, or video here')}
          busyLabel={opening ? t('Membuka file…', 'Opening the file…') : undefined}
          onFiles={([f]) => void open(f)}
        />
        <p className="text-xs text-muted-foreground">
          {t(
            `Suara diubah jadi teks oleh AI (Whisper) yang berjalan di perangkatmu. Pertama kali dipakai, model ±${Math.round(MODEL_BYTES / 1e6)} MB diunduh sekali lalu tersimpan; file-mu tidak pernah dikirim ke server.`,
            `Speech is turned into text by an AI model (Whisper) running on your device. The first time, a ±${Math.round(MODEL_BYTES / 1e6)} MB model is downloaded once and kept; your file is never sent to a server.`,
          )}
        </p>
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  const busy = job !== null
  const isVideo = !!info?.video
  const label =
    job?.step === 'audio'
      ? t('Mengambil suara dari file…', 'Reading the audio…')
      : job?.step === 'download'
        ? t(`Mengunduh model AI (${formatSize(MODEL_BYTES)}, sekali saja)…`, `Downloading the AI model (${formatSize(MODEL_BYTES)}, once)…`)
        : job?.step === 'loading'
          ? t('Menyiapkan model…', 'Preparing the model…')
          : t('Mendengarkan dan menulis…', 'Listening and writing…')
  const txt = segments ? toText(segments, stamps) : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {info ? `${formatDuration(info.duration)} · ` : ''}
            {formatSize(file.size)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void run()} disabled={busy}>
            <Wand2 />
            {segments ? t('Transkrip ulang', 'Transcribe again') : t('Mulai transkrip', 'Transcribe')}
          </Button>
          <Button variant="ghost" onClick={reset}>
            <RotateCcw />
            {t('File lain', 'Another file')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          {url &&
            (isVideo ? (
              <video ref={(el) => void (mediaRef.current = el)} src={url} controls playsInline className="max-h-[45vh] w-full rounded-xl bg-black" />
            ) : (
              <audio ref={(el) => void (mediaRef.current = el)} src={url} controls className="w-full" />
            ))}
        </div>
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <Segmented label={t('Bahasa yang diucapkan', 'Spoken language')} value={lang} options={LANGS} onChange={setLang} disabled={busy} />
          <p className="text-xs text-muted-foreground">
            {t(
              'Paling bagus untuk satu orang bicara jelas: rapat, kuliah, wawancara, voice note, atau konten video. Musik keras dan banyak orang bicara bersamaan menurunkan ketepatan, jadi periksa dan rapikan hasilnya. Satu menit suara butuh ±30 detik sampai beberapa menit, tergantung perangkat.',
              'Works best on one clear speaker: meetings, lectures, interviews, voice notes, or video content. Loud music and overlapping voices lower accuracy, so check and tidy the result. One minute of audio takes ±30 seconds to a few minutes, depending on the device.',
            )}
          </p>
          {detected && (
            <p className="font-mono text-xs text-muted-foreground">
              {t('Bahasa terdeteksi', 'Detected language')}: {detected === 'other' ? t('lainnya', 'other') : detected.toUpperCase()}
            </p>
          )}
        </div>
      </div>

      {job && (
        <ProgressCard
          label={label}
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

      {error && <ErrorNote message={error} />}

      {segments && segments.length > 0 && (
        <div className="space-y-4 rounded-2xl border bg-card p-4">
          {!busy && (
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={txt} variant="outline" label={t('Salin teks', 'Copy text')} />
              <Button variant="outline" onClick={() => downloadBlob(new Blob([txt], { type: 'text/plain;charset=utf-8' }), withExtension(file.name, '.txt'))}>
                <FileText />
                TXT
              </Button>
              <Button variant="outline" onClick={() => downloadBlob(new Blob([toSubtitle(segments, 'srt')], { type: 'application/x-subrip' }), withExtension(file.name, '.srt'))}>
                <Download />
                SRT
              </Button>
              <Button variant="outline" onClick={() => downloadBlob(new Blob([toSubtitle(segments, 'vtt')], { type: 'text/vtt' }), withExtension(file.name, '.vtt'))}>
                <Download />
                VTT
              </Button>
              <Button variant="ghost" onClick={openInSubtitle}>
                <Captions />
                {t('Atur di tool Subtitle', 'Adjust in Subtitle tool')}
              </Button>
              <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={stamps} onChange={(e) => setStamps(e.target.checked)} />
                {t('Cap waktu di TXT', 'Timestamps in TXT')}
              </label>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {busy
              ? t('Teks muncul sambil berjalan…', 'Text appears as it goes…')
              : t('Klik waktu untuk memutar bagian itu. Teks bisa langsung diedit sebelum disalin atau diunduh.', 'Click a time to play that part. Edit the text right here before copying or downloading.')}
          </p>
          <ol className="space-y-1">
            {segments.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => seek(s.start)}
                  className="mt-1.5 shrink-0 font-mono text-xs text-brand-2 hover:underline"
                  title={t('Putar dari sini', 'Play from here')}
                >
                  {clock(s.start)}
                </button>
                <textarea
                  value={s.text}
                  readOnly={busy}
                  onChange={(e) => edit(i, e.target.value)}
                  rows={Math.max(1, Math.ceil(s.text.length / 95))}
                  className="w-full resize-none rounded-md border [field-sizing:content] border-transparent bg-transparent px-2 py-1 text-sm leading-relaxed hover:border-border focus:border-ring focus:outline-none"
                />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
