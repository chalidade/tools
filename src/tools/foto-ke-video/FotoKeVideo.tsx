import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Download, Music, Pause, Play, RotateCcw, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { ProgressCard } from '@/components/tool/SizeResult'
import { downloadBlob } from '@/lib/download'
import { decodeImage, UnreadableImageError, type DecodedImage } from '@/lib/image'
import { tr, useT } from '@/lib/i18n'
import { formatSize, formatTime, hasWebCodecs, NoEncoderError } from '@/lib/media'
import { drawFrame, makeSlideshow, songLength } from './render'
import { SIZES, totalSeconds, type RatioId } from './timeline'

interface Photo {
  id: number
  name: string
  img: DecodedImage
  thumb: string
}

const MAX = 30

export default function FotoKeVideo() {
  const t = useT()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [seconds, setSeconds] = useState(3)
  const [fade, setFade] = useState(0.6)
  const [zoom, setZoom] = useState(0.08)
  const [ratio, setRatio] = useState<RatioId>('9:16')
  const [music, setMusic] = useState<{ file: File; length: number } | null>(null)
  const [musicStart, setMusicStart] = useState(0)
  const [loop, setLoop] = useState(true)
  const [pos, setPos] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ p: number; at: number } | null>(null)
  const [result, setResult] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nextId = useRef(1)
  const dragFrom = useRef<number | null>(null)
  const canceled = useRef(false)
  const photosRef = useRef<Photo[]>([])
  photosRef.current = photos

  const resultUrl = useMemo(() => (result ? URL.createObjectURL(result) : null), [result])
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl) }, [resultUrl])

  const opts = { seconds, fade, zoom }
  const total = totalSeconds(photos.length, opts)

  useEffect(
    () => () =>
      photosRef.current.forEach((p) => {
        p.img.close()
        URL.revokeObjectURL(p.thumb)
      }),
    [],
  )

  // Preview frame at `pos`, at half size to stay light.
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !photos.length) return
    const [w, h] = SIZES[ratio]
    c.width = w / 2
    c.height = h / 2
    const ctx = c.getContext('2d')!
    ctx.scale(0.5, 0.5)
    drawFrame(ctx, photos.map((p) => p.img), Math.min(pos, total), opts, w, h)
  })

  // Play the preview.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setPos((p) => (p + dt >= total ? 0 : p + dt))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, total])

  function changed() {
    setResult(null)
    setError(null)
  }

  async function add(files: File[]) {
    changed()
    setBusy(true)
    const added: Photo[] = []
    let failed = false
    for (const f of files.slice(0, MAX - photos.length)) {
      try {
        added.push({ id: nextId.current++, name: f.name, img: await decodeImage(f), thumb: URL.createObjectURL(f) })
      } catch (e) {
        if (e instanceof UnreadableImageError) failed = true
        else throw e
      }
    }
    setPhotos((p) => [...p, ...added])
    setBusy(false)
    if (failed) setError(t('Sebagian file bukan gambar yang bisa dibaca (JPG, PNG, WebP).', 'Some files were not readable images (JPG, PNG, WebP).'))
    else if (files.length > MAX - photos.length) setError(t(`Maksimal ${MAX} foto.`, `At most ${MAX} photos.`))
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= photos.length) return
    changed()
    setPhotos((p) => {
      const next = [...p]
      next.splice(to, 0, next.splice(from, 1)[0])
      return next
    })
  }

  function remove(i: number) {
    changed()
    const p = photos[i]
    p.img.close()
    URL.revokeObjectURL(p.thumb)
    setPhotos((all) => all.filter((_, k) => k !== i))
  }

  async function pickMusic(files: File[]) {
    changed()
    const length = await songLength(files[0])
    if (length === null) {
      setError(t('Lagu ini tidak bisa dibaca browser. Coba MP3, M4A, atau WAV.', 'The browser cannot read this song. Try MP3, M4A or WAV.'))
      return
    }
    setMusic({ file: files[0], length })
    setMusicStart(0)
  }

  async function make() {
    setError(null)
    setResult(null)
    setPlaying(false)
    canceled.current = false
    setBusy(true)
    setProgress({ p: 0, at: Date.now() })
    try {
      const blob = await makeSlideshow(
        {
          ...opts,
          photos: photos.map((p) => p.img),
          ratio,
          fps: 30,
          music: music ? { file: music.file, start: musicStart, loop } : null,
        },
        (p) => setProgress((s) => (s ? { ...s, p } : s)),
        () => canceled.current,
      )
      setResult(blob)
    } catch (e) {
      if (!canceled.current) {
        setError(
          e instanceof NoEncoderError
            ? tr('Browser ini tidak bisa membuat video MP4 (atau audio AAC). Coba Chrome atau Edge terbaru.', "This browser can't encode MP4 video (or AAC audio). Try the latest Chrome or Edge.")
            : tr('Gagal membuat video. Coba foto lebih sedikit atau rasio lain.', 'Could not make the video. Try fewer photos or another ratio.'),
        )
      }
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  if (!hasWebCodecs()) {
    return <ErrorNote message={t('Browser ini belum mendukung WebCodecs. Pakai Chrome, Edge, Safari 16.4+, atau Firefox 130+.', "This browser doesn't support WebCodecs yet. Use Chrome, Edge, Safari 16.4+, or Firefox 130+.")} />
  }

  const maxStart = music ? Math.max(0, Math.floor(music.length - 1)) : 0

  return (
    <div className="space-y-6">
      {photos.length < MAX && (
        <FileDrop
          multiple
          accept="image/*"
          label={photos.length ? t('Tambah foto', 'Add photos') : t('Tarik foto-fotomu ke sini', 'Drop your photos here')}
          busyLabel={busy && !progress ? t('Membuka foto…', 'Opening photos…') : undefined}
          onFiles={(f) => void add(f)}
        />
      )}
      {error && <ErrorNote message={error} />}

      {photos.length > 0 && (
        <>
          <ul className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <li
                key={p.id}
                draggable
                onDragStart={() => (dragFrom.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragFrom.current !== null) move(dragFrom.current, i)
                  dragFrom.current = null
                }}
                className="relative cursor-grab"
              >
                <img src={p.thumb} alt={p.name} className="size-20 rounded-lg border object-cover" draggable={false} />
                <span className="absolute left-1 top-1 rounded bg-background/80 px-1 font-mono text-[10px]">{i + 1}</span>
                <button type="button" aria-label={t('Hapus', 'Remove')} onClick={() => remove(i)} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background">
                  <X className="size-3" />
                </button>
                <div className="mt-1 flex justify-center gap-1">
                  <button type="button" aria-label={t('Geser maju', 'Move earlier')} disabled={i === 0} onClick={() => move(i, i - 1)} className="rounded p-0.5 text-muted-foreground disabled:opacity-30">
                    <ArrowLeft className="size-4" />
                  </button>
                  <button type="button" aria-label={t('Geser mundur', 'Move later')} disabled={i === photos.length - 1} onClick={() => move(i, i + 1)} className="rounded p-0.5 text-muted-foreground disabled:opacity-30">
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t('Seret foto untuk mengubah urutan.', 'Drag photos to change the order.')}</p>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              <div className="flex justify-center rounded-2xl border bg-muted/40 p-3">
                <canvas ref={canvasRef} className="max-h-[60vh] w-auto max-w-full rounded-lg shadow" aria-label={t('Pratinjau video', 'Video preview')} />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" aria-label={playing ? t('Jeda', 'Pause') : t('Putar pratinjau', 'Play preview')} onClick={() => setPlaying((v) => !v)}>
                  {playing ? <Pause /> : <Play />}
                </Button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.1, total)}
                  step={0.05}
                  value={Math.min(pos, total)}
                  onChange={(e) => {
                    setPlaying(false)
                    setPos(+e.target.value)
                  }}
                  className="w-full"
                  aria-label={t('Posisi pratinjau', 'Preview position')}
                />
                <span className="font-mono text-xs text-muted-foreground">{formatTime(Math.min(pos, total))} / {formatTime(total)}</span>
              </div>
            </div>

            <div className="space-y-4 self-start rounded-2xl border bg-card p-4">
              <Segmented
                label={t('Rasio', 'Ratio')}
                value={ratio}
                options={[
                  { value: '9:16', label: t('9:16 Status/Reels', '9:16 Reels/Status') },
                  { value: '1:1', label: '1:1' },
                  { value: '16:9', label: '16:9' },
                ]}
                onChange={(v) => {
                  changed()
                  setRatio(v)
                }}
              />
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Lama tiap foto', 'Time per photo')}: {seconds} {t('dtk', 's')}
                <input type="range" min={1} max={10} step={0.5} value={seconds} onChange={(e) => { changed(); setSeconds(+e.target.value) }} className="w-full" />
              </label>
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Transisi pudar', 'Fade')}: {fade === 0 ? t('mati', 'off') : `${fade} ${t('dtk', 's')}`}
                <input type="range" min={0} max={2} step={0.2} value={fade} onChange={(e) => { changed(); setFade(+e.target.value) }} className="w-full" />
              </label>
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Zoom pelan', 'Slow zoom')}: {Math.round(zoom * 100)}%
                <input type="range" min={0} max={0.25} step={0.01} value={zoom} onChange={(e) => { changed(); setZoom(+e.target.value) }} className="w-full" />
              </label>

              <div className="space-y-2 border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground">{t('Musik (opsional)', 'Music (optional)')}</p>
                {music ? (
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2"><Music className="size-4 shrink-0" /><span className="truncate">{music.file.name}</span>
                      <button type="button" aria-label={t('Hapus musik', 'Remove music')} onClick={() => { changed(); setMusic(null) }} className="ml-auto"><X className="size-4" /></button>
                    </p>
                    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                      {t('Mulai dari', 'Start at')}: {formatTime(musicStart)} / {formatTime(music.length)}
                      <input type="range" min={0} max={maxStart} value={musicStart} onChange={(e) => { changed(); setMusicStart(+e.target.value) }} className="w-full" />
                    </label>
                    <Segmented
                      label={t('Bila lagu lebih pendek', 'If the song is shorter')}
                      value={loop ? 'loop' : 'once'}
                      options={[{ value: 'loop', label: t('Ulang', 'Loop') }, { value: 'once', label: t('Diam', 'Silence') }]}
                      onChange={(v) => { changed(); setLoop(v === 'loop') }}
                    />
                  </div>
                ) : (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                    <Music className="size-4" />
                    {t('Pilih lagu', 'Choose a song')}
                    <input type="file" accept="audio/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pickMusic([f]) }} />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">{t('Lagu dipotong pas dengan panjang video dan dipudarkan di akhir.', 'The song is cut to the video length and fades out at the end.')}</p>
              </div>

              {progress ? (
                <ProgressCard
                  label={t('Membuat video…', 'Making the video…')}
                  progress={progress.p}
                  startedAt={progress.at}
                  action={<Button variant="ghost" size="sm" onClick={() => (canceled.current = true)}>{t('Batal', 'Cancel')}</Button>}
                />
              ) : (
                <Button className="w-full" disabled={busy || photos.length < 1} onClick={() => void make()}>
                  <Sparkles />
                  {t('Buat video', 'Make video')}
                </Button>
              )}
              {result && (
                <div className="space-y-2 rounded-xl border bg-muted/40 p-3">
                  <video src={resultUrl ?? undefined} controls className="max-h-64 w-full rounded-lg" />
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => downloadBlob(result, 'foto-ke-video.mp4')}>
                      <Download />
                      {t('Unduh MP4', 'Download MP4')} · {formatSize(result.size)}
                    </Button>
                    <Button variant="outline" size="icon" aria-label={t('Ulangi', 'Redo')} onClick={() => setResult(null)}><RotateCcw /></Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
