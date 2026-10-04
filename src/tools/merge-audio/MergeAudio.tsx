import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Combine, Download, Music, Plus, Square, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { IconButton } from '@/components/tool/IconButton'
import { Segmented } from '@/components/tool/Segmented'
import { ProgressCard } from '@/components/tool/SizeResult'
import { downloadBlob } from '@/lib/download'
import { AUDIO_OUTPUTS, formatDuration, formatSize, hasWebCodecs, isCanceled, NoEncoderError, probeMedia, type AudioOut } from '@/lib/media'
import { mergeAudio, type AudioItem } from './merge'

const ACCEPT = 'audio/*,video/*,.mkv,.flac,.m4a'
const OUT_OPTIONS: { value: AudioOut; label: string }[] = [
  { value: 'mp3', label: 'MP3' },
  { value: 'm4a', label: 'M4A' },
  { value: 'wav', label: 'WAV' },
]
const GAP_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Tanpa' },
  { value: 0.5, label: '0,5 dtk' },
  { value: 1, label: '1 dtk' },
  { value: 2, label: '2 dtk' },
]

export default function MergeAudio() {
  const [items, setItems] = useState<AudioItem[]>([])
  const [loading, setLoading] = useState(0)
  const [out, setOut] = useState<AudioOut>('mp3')
  const [gap, setGap] = useState(0)
  const [job, setJob] = useState<{ progress: number; startedAt: number } | null>(null)
  const [result, setResult] = useState<{ blob: Blob; url: string; duration: number; ext: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)
  const addRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result])

  async function add(files: File[]) {
    setError(null)
    if (!hasWebCodecs()) {
      setError('Browser ini belum mendukung WebCodecs. Pakai Chrome, Edge, Safari 16.4+, atau Firefox 130+.')
      return
    }
    setLoading((n) => n + files.length)
    const skipped: string[] = []
    for (const file of files) {
      try {
        const info = await probeMedia(file)
        if (!info.audio) throw new Error('no audio')
        setItems((prev) => [...prev, { id: crypto.randomUUID(), file, info }])
      } catch {
        skipped.push(file.name)
      } finally {
        setLoading((n) => n - 1)
      }
    }
    if (skipped.length) setError(`${skipped.join(', ')} dilewati: tidak ada suara yang bisa dibaca.`)
  }

  function move(id: string, by: number) {
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === id)
      const to = from + by
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [m] = next.splice(from, 1)
      next.splice(to, 0, m)
      return next
    })
  }

  async function run() {
    setError(null)
    setResult(null)
    setJob({ progress: 0, startedAt: Date.now() })
    try {
      const { blob, duration } = await mergeAudio(
        items,
        { out, gap },
        (progress) => setJob((j) => (j ? { ...j, progress } : j)),
        (cancel) => (cancelRef.current = cancel),
      )
      setResult({ blob, url: URL.createObjectURL(blob), duration, ext: AUDIO_OUTPUTS[out].ext })
    } catch (e) {
      if (isCanceled(e)) return
      setError(
        e instanceof NoEncoderError
          ? 'Browser ini tidak bisa meng-encode format itu. Coba WAV, atau Chrome/Edge terbaru.'
          : 'Gagal menggabungkan. Salah satu file mungkin rusak.',
      )
    } finally {
      setJob(null)
      cancelRef.current = null
    }
  }

  const busy = job !== null
  const total = items.reduce((n, i) => n + i.info.duration, 0) + gap * Math.max(0, items.length - 1)

  if (!items.length) {
    return (
      <div className="space-y-6">
        <FileDrop
          accept={ACCEPT}
          multiple
          label="Tarik beberapa file audio ke sini"
          busyLabel={loading ? `Membaca ${loading} file…` : undefined}
          onFiles={(f) => void add(f)}
        />
        <p className="text-center text-xs text-muted-foreground">
          MP3, M4A, WAV, OGG, FLAC, atau suara dari video — boleh campur format.
        </p>
        {error && <ErrorNote message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">
            {items.length} file · {formatDuration(total)}
          </p>
          <p className="text-sm text-muted-foreground">
            {loading ? `Membaca ${loading} file lagi…` : items.length < 2 ? 'Tambahkan minimal satu file lagi.' : 'Diputar berurutan dari atas.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void run()} disabled={busy || loading > 0 || items.length < 2}>
            <Combine />
            Gabung
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => addRef.current?.click()}>
            <Plus />
            Tambah
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setItems([])}>
            <Trash2 />
            Hapus semua
          </Button>
          <input
            ref={addRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (picked.length) void add(picked)
            }}
          />
        </div>
      </div>

      <ol className="divide-y overflow-hidden rounded-2xl border bg-card">
        {items.map((item, i) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-gradient-brand font-mono text-xs font-medium text-white">
              {i + 1}
            </span>
            <Music className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(item.info.duration)} · {item.info.audio!.codec ?? '?'} · {item.info.audio!.sampleRate / 1000} kHz ·{' '}
                {item.info.audio!.channels === 1 ? 'mono' : 'stereo'}
              </p>
            </div>
            <div className="flex">
              <IconButton label="Naik" disabled={busy || i === 0} onClick={() => move(item.id, -1)}>
                <ChevronUp />
              </IconButton>
              <IconButton label="Turun" disabled={busy || i === items.length - 1} onClick={() => move(item.id, 1)}>
                <ChevronDown />
              </IconButton>
              <IconButton label="Hapus" disabled={busy} onClick={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}>
                <X />
              </IconButton>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-2xl border bg-card p-4">
        <Segmented label="Format hasil" value={out} options={OUT_OPTIONS} disabled={busy} onChange={setOut} />
        <Segmented label="Jeda antar file" value={gap} options={GAP_OPTIONS} disabled={busy} onChange={setGap} />
      </div>

      {job && (
        <ProgressCard
          label="Menggabungkan…"
          progress={job.progress}
          startedAt={job.startedAt}
          action={
            <Button variant="ghost" size="sm" onClick={() => cancelRef.current?.()}>
              <Square />
              Batalkan
            </Button>
          }
        />
      )}

      {result && (
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <audio src={result.url} controls className="w-full" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {formatDuration(result.duration)} · {formatSize(result.blob.size)}
            </p>
            <Button onClick={() => downloadBlob(result.blob, `gabungan.${result.ext}`)}>
              <Download />
              Unduh .{result.ext}
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorNote message={error} />}
    </div>
  )
}
