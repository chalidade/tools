import { useEffect, useMemo, useState } from 'react'
import { Download, Film, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob, withExtension } from '@/lib/download'
import { tr, useT } from '@/lib/i18n'
import {
  formatTime,
  lastEnd,
  mergeCues,
  parseOffset,
  parseSubtitle,
  shiftCues,
  stretchCues,
  writeSubtitle,
  type Cue,
  type SubFormat,
} from './subtitle'

const FPS = [23.976, 24, 25, 29.97, 30]

function fmtSec(n: number) {
  return String(Math.round(n * 1000) / 1000)
}

export default function Subtitle() {
  const t = useT()
  const [name, setName] = useState('')
  const [base, setBase] = useState<Cue[]>([])
  const [error, setError] = useState('')
  const [format, setFormat] = useState<SubFormat>('srt')

  const [shift, setShift] = useState('0')
  const [fpsFrom, setFpsFrom] = useState(25)
  const [fpsTo, setFpsTo] = useState(23.976)
  const [stretch, setStretch] = useState(false)

  const [second, setSecond] = useState<Cue[] | null>(null)
  const [secondName, setSecondName] = useState('')
  const [gap, setGap] = useState('0')

  const [video, setVideo] = useState<{ url: string; name: string } | null>(null)

  const shiftBy = parseOffset(shift)
  const gapBy = parseOffset(gap)

  const result = useMemo(() => {
    let cues = base
    if (stretch && fpsFrom > 0 && fpsTo > 0) cues = stretchCues(cues, fpsFrom / fpsTo)
    if (shiftBy) cues = shiftCues(cues, shiftBy)
    if (second) cues = mergeCues(cues, second, gapBy ?? 0)
    return cues
  }, [base, stretch, fpsFrom, fpsTo, shiftBy, second, gapBy])

  // The preview track is the edited result, as WebVTT, so what plays is what gets saved.
  const trackUrl = useMemo(() => {
    if (!video || !result.length) return ''
    return URL.createObjectURL(new Blob([writeSubtitle(result, 'vtt')], { type: 'text/vtt' }))
  }, [video, result])
  useEffect(() => () => { if (trackUrl) URL.revokeObjectURL(trackUrl) }, [trackUrl])
  useEffect(() => () => { if (video) URL.revokeObjectURL(video.url) }, [video])

  async function readSub(file: File): Promise<Cue[] | null> {
    const cues = parseSubtitle(await file.text())
    if (!cues.length) {
      setError(tr('Tidak ada subtitle yang terbaca. Pastikan file SRT atau VTT.', 'No subtitles found. Make sure the file is SRT or VTT.'))
      return null
    }
    setError('')
    return cues
  }

  async function openMain(files: File[]) {
    const f = files[0]
    if (!f) return
    const cues = await readSub(f)
    if (!cues) return
    setBase(cues)
    setName(f.name)
    setFormat(/\.vtt$/i.test(f.name) ? 'vtt' : 'srt')
    setShift('0')
    setStretch(false)
    setSecond(null)
    setGap('0')
  }

  async function openSecond(files: File[]) {
    const f = files[0]
    if (!f) return
    const cues = await readSub(f)
    if (!cues) return
    setSecond(cues)
    setSecondName(f.name)
    // By default the second file follows right after the first.
    setGap(fmtSec(lastEnd(base)))
  }

  function save() {
    const blob = new Blob([writeSubtitle(result, format)], { type: format === 'srt' ? 'application/x-subrip' : 'text/vtt' })
    downloadBlob(blob, withExtension(name || 'subtitle', `.${format}`))
  }

  function reset() {
    setBase([])
    setName('')
    setSecond(null)
    setError('')
  }

  if (!base.length) {
    return (
      <div className="space-y-4">
        <FileDrop accept=".srt,.vtt,text/vtt" label={t('Tarik file .srt atau .vtt ke sini', 'Drop an .srt or .vtt file here')} onFiles={openMain} />
        {error && <ErrorNote message={error} />}
        <p className="text-xs text-muted-foreground">
          {t('File dibaca di perangkatmu, tidak diunggah ke mana pun.', 'The file is read on your device and never uploaded.')}
        </p>
      </div>
    )
  }

  const field = 'w-28 rounded-lg border bg-background px-3 py-1.5 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring'
  const select = 'rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/40 p-3 text-sm">
        <span className="min-w-0 truncate">
          <span className="font-medium">{name}</span> · {t(`${base.length} baris`, `${base.length} cues`)}
        </span>
        <Button variant="outline" size="sm" onClick={reset}>
          <Trash2 />
          {t('Ganti file', 'Change file')}
        </Button>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t('Geser waktu', 'Shift time')}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            inputMode="decimal"
            aria-label={t('Geser (detik)', 'Shift (seconds)')}
            className={field}
          />
          <span className="text-sm text-muted-foreground">{t('detik', 'seconds')}</span>
          {[-1, -0.5, 0.5, 1].map((d) => (
            <Button key={d} variant="outline" size="sm" onClick={() => setShift(fmtSec((shiftBy ?? 0) + d))}>
              {d > 0 ? '+' : ''}
              {d}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {shiftBy === null
            ? t('Isi angka seperti 2.5, -1.5, atau 0:01:30.', 'Enter a number like 2.5, -1.5, or 0:01:30.')
            : t('Positif = muncul lebih lambat, negatif = lebih cepat.', 'Positive = later, negative = earlier.')}
        </p>
      </section>

      <section className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={stretch} onChange={(e) => setStretch(e.target.checked)} className="size-4" />
          {t('Regangkan untuk beda frame rate', 'Stretch for a different frame rate')}
        </label>
        {stretch && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>{t('Subtitle untuk', 'Subtitle made for')}</span>
            <select value={fpsFrom} onChange={(e) => setFpsFrom(Number(e.target.value))} className={select} aria-label={t('Frame rate asal', 'From frame rate')}>
              {FPS.map((f) => <option key={f} value={f}>{f} fps</option>)}
            </select>
            <span>{t('video', 'video at')}</span>
            <select value={fpsTo} onChange={(e) => setFpsTo(Number(e.target.value))} className={select} aria-label={t('Frame rate tujuan', 'To frame rate')}>
              {FPS.map((f) => <option key={f} value={f}>{f} fps</option>)}
            </select>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t('Gabung dengan file lain', 'Merge with another file')}</h3>
        {second ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-0 truncate">{secondName} · {t(`${second.length} baris`, `${second.length} cues`)}</span>
            <span className="text-muted-foreground">{t('mulai di detik', 'starts at second')}</span>
            <input value={gap} onChange={(e) => setGap(e.target.value)} inputMode="decimal" aria-label={t('Awal file kedua (detik)', 'Second file start (seconds)')} className={field} />
            <Button variant="outline" size="sm" onClick={() => setSecond(null)}>
              <Trash2 />
              {t('Lepas', 'Remove')}
            </Button>
          </div>
        ) : (
          <FileDrop accept=".srt,.vtt,text/vtt" label={t('Tambah file .srt atau .vtt kedua', 'Add a second .srt or .vtt file')} onFiles={openSecond} />
        )}
        {second && gapBy === null && <ErrorNote message={t('Waktu mulai tidak terbaca.', 'Could not read the start time.')} />}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t('Pratinjau di atas videomu', 'Preview over your video')}</h3>
        {video ? (
          <div className="space-y-2">
            <video key={video.url} src={video.url} controls className="max-h-80 w-full rounded-xl bg-black">
              {trackUrl && <track key={trackUrl} kind="subtitles" src={trackUrl} default label="Subtitle" />}
            </video>
            <Button variant="outline" size="sm" onClick={() => setVideo(null)}>
              <Trash2 />
              {t('Tutup video', 'Close video')}
            </Button>
          </div>
        ) : (
          <FileDrop accept="video/*,audio/*" label={t('Tarik video untuk pratinjau (opsional)', 'Drop a video to preview (optional)')} onFiles={(f) => f[0] && setVideo({ url: URL.createObjectURL(f[0]), name: f[0].name })} />
        )}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Film className="size-3.5" />
          {t('Video hanya diputar di browser, tidak diunggah.', 'The video only plays in your browser and is never uploaded.')}
        </p>
      </section>

      <section className="space-y-3">
        <Segmented
          label={t('Simpan sebagai', 'Save as')}
          value={format}
          options={[{ value: 'srt', label: 'SRT' }, { value: 'vtt', label: 'VTT' }]}
          onChange={setFormat}
        />
        <div className="max-h-56 overflow-auto rounded-xl border text-sm">
          <ul className="divide-y">
            {result.slice(0, 50).map((c, i) => (
              <li key={i} className="flex gap-3 px-3 py-2">
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{formatTime(c.start, format).slice(0, 12)}</span>
                <span className="whitespace-pre-line">{c.text}</span>
              </li>
            ))}
          </ul>
          {result.length > 50 && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
              {t(`Menampilkan 50 dari ${result.length} baris.`, `Showing 50 of ${result.length} cues.`)}
            </p>
          )}
        </div>
        <Button onClick={save} disabled={!result.length || shiftBy === null || (!!second && gapBy === null)}>
          <Download />
          {t('Unduh', 'Download')} .{format}
        </Button>
      </section>
    </div>
  )
}
