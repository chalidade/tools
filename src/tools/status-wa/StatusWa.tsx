import { useEffect, useRef, useState } from 'react'
import { Download, Package, RotateCcw, Scissors, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { ProgressCard } from '@/components/tool/SizeResult'
import { downloadBlob } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import { formatDuration, formatSize, hasWebCodecs, isCanceled, NoEncoderError, probeMedia, type MediaInfo } from '@/lib/media'
import { cutSegment, LIMITS, planSegments, type Limit } from './split'

interface Piece {
  blob: Blob
  url: string
  name: string
}

export default function StatusWa() {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [info, setInfo] = useState<MediaInfo | null>(null)
  const [reading, setReading] = useState(false)
  const [limit, setLimit] = useState<Limit>(30)
  const [pieces, setPieces] = useState<Piece[]>([])
  const [job, setJob] = useState<{ index: number; total: number; progress: number; startedAt: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)
  const canceled = useRef(false)
  const piecesRef = useRef<Piece[]>([])
  piecesRef.current = pieces

  useEffect(() => () => piecesRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  function clearPieces() {
    piecesRef.current.forEach((p) => URL.revokeObjectURL(p.url))
    setPieces([])
  }

  async function open(next: File) {
    setError(null)
    clearPieces()
    if (!hasWebCodecs()) {
      setError(
        t(
          'Browser ini belum mendukung WebCodecs. Pakai Chrome, Edge, Safari 16.4+, atau Firefox 130+.',
          "This browser doesn't support WebCodecs yet. Use Chrome, Edge, Safari 16.4+, or Firefox 130+.",
        ),
      )
      return
    }
    setReading(true)
    try {
      const probed = await probeMedia(next)
      if (!probed.video) throw new Error('no video')
      setFile(next)
      setInfo(probed)
    } catch {
      setError(t('File video tidak bisa dibaca. Coba MP4, MOV, atau WebM.', "Couldn't read the video. Try MP4, MOV, or WebM."))
    } finally {
      setReading(false)
    }
  }

  async function run() {
    if (!file || !info) return
    setError(null)
    clearPieces()
    canceled.current = false
    const plan = planSegments(info.duration, limit)
    const base = file.name.replace(/\.[^.]+$/, '')
    const made: Piece[] = []
    try {
      for (let i = 0; i < plan.length; i++) {
        if (canceled.current) break
        setJob({ index: i, total: plan.length, progress: 0, startedAt: Date.now() })
        const blob = await cutSegment(
          file,
          info,
          plan[i],
          (progress) => setJob((j) => (j ? { ...j, progress } : j)),
          (cancel) => (cancelRef.current = cancel),
        )
        made.push({ blob, url: URL.createObjectURL(blob), name: `${base}-${tr('status', 'status')}-${String(i + 1).padStart(2, '0')}.mp4` })
        setPieces([...made])
      }
    } catch (e) {
      if (!isCanceled(e))
        setError(
          e instanceof NoEncoderError
            ? t('Browser ini tidak punya encoder video. Coba Chrome atau Edge terbaru.', "This browser has no video encoder. Try the latest Chrome or Edge.")
            : t('Gagal memotong video. File mungkin rusak atau formatnya belum didukung.', "Couldn't split the video. It may be damaged or in an unsupported format."),
        )
    } finally {
      setJob(null)
      cancelRef.current = null
    }
  }

  async function downloadAll() {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const p of pieces) zip.file(p.name, p.blob)
    const base = file?.name.replace(/\.[^.]+$/, '') ?? 'video'
    downloadBlob(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), `${base}-status.zip`)
  }

  if (file && info) {
    const plan = planSegments(info.duration, limit)
    const busy = job !== null
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatDuration(info.duration)} · {formatSize(file.size)}
              {info.video && ` · ${info.video.width}×${info.video.height}`}
            </p>
          </div>
          <Button variant="ghost" disabled={busy} onClick={() => { setFile(null); setInfo(null); clearPieces() }}>
            <RotateCcw />
            {t('Video lain', 'Another video')}
          </Button>
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-4">
          <Segmented
            label={t('Durasi maksimal per Status', 'Max length per Status')}
            value={limit}
            disabled={busy}
            options={LIMITS.map((l) => ({ value: l, label: `${l} ${t('detik', 'sec')}` }))}
            onChange={(l) => { setLimit(l); clearPieces() }}
          />
          <p className="text-sm text-muted-foreground">
            {t(
              `Video dipecah jadi ${plan.length} bagian sama panjang (sekitar ${formatDuration(plan[0].end - plan[0].start)} per bagian), masing-masing dikompres supaya di bawah 16 MB.`,
              `The video is split into ${plan.length} equal parts (about ${formatDuration(plan[0].end - plan[0].start)} each), each compressed to stay under 16 MB.`,
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(
              'Batas durasi Status WhatsApp pernah berubah (15, 30, lalu 60 detik); pilih yang berlaku di aplikasimu. Kalau ragu, pakai 30 detik.',
              'WhatsApp’s Status length limit has changed over time (15, 30, then 60 seconds); pick what your app allows. If unsure, use 30 seconds.',
            )}
          </p>
          <Button onClick={() => void run()} disabled={busy}>
            <Scissors />
            {t('Pecah & kompres', 'Split & compress')}
          </Button>
        </div>

        {job && (
          <ProgressCard
            label={t(`Bagian ${job.index + 1} dari ${job.total}…`, `Part ${job.index + 1} of ${job.total}…`)}
            progress={job.progress}
            startedAt={job.startedAt}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  canceled.current = true
                  cancelRef.current?.()
                }}
              >
                <Square />
                {t('Batalkan', 'Cancel')}
              </Button>
            }
          />
        )}

        {pieces.length > 0 && (
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {t(`${pieces.length} bagian siap`, `${pieces.length} parts ready`)}
              </p>
              {!busy && pieces.length > 1 && (
                <Button onClick={() => void downloadAll()}>
                  <Package />
                  {t('Unduh semua (ZIP)', 'Download all (ZIP)')}
                </Button>
              )}
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {pieces.map((p, i) => (
                <li key={p.url} className="space-y-2 rounded-xl border p-3">
                  <video src={p.url} controls playsInline className="max-h-56 w-full rounded-lg bg-black" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {t('Bagian', 'Part')} {i + 1} · {formatSize(p.blob.size)}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => downloadBlob(p.blob, p.name)}>
                      <Download />
                      MP4
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {t(
                'Di HP, unggah bagian satu per satu sebagai Status, berurutan dari bagian 1.',
                'On your phone, post the parts as Status one by one, starting from part 1.',
              )}
            </p>
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
        label={t('Tarik video ke sini', 'Drop a video here')}
        busyLabel={reading ? t('Membaca video…', 'Reading video…') : undefined}
        onFiles={([f]) => void open(f)}
      />
      <p className="text-center text-xs text-muted-foreground">
        {t(
          'MP4, MOV, WebM, MKV. Diproses di perangkatmu; video tidak diunggah ke mana pun.',
          'MP4, MOV, WebM, MKV. Processed on your device; the video is never uploaded.',
        )}
      </p>
      {error && <ErrorNote message={error} />}
    </div>
  )
}
