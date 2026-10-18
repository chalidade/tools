import { useEffect, useState } from 'react'
import { Activity, Music2, RotateCcw, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { FileDrop } from '@/components/tool/FileDrop'
import { FLATS, SHARPS, pc } from '@/lib/music'
import { tr, useT } from '@/lib/i18n'
import { decodeToMono, type Analysis } from './analyze'

type Phase = { kind: 'idle' } | { kind: 'busy'; label: string } | { kind: 'done'; result: Analysis; file: File; url: string }

// Keys usually written with flats (F major, B♭, … and their relative minors).
const FLAT_MAJORS = new Set([5, 10, 3, 8, 1])
const FLAT_MINORS = new Set([2, 7, 0, 5, 10, 3])

const usesFlats = (tonic: number, minor: boolean) => (minor ? FLAT_MINORS : FLAT_MAJORS).has(tonic)
const noteIn = (n: number, flats: boolean) => (flats ? FLATS : SHARPS)[pc(n)]

function keyName(tonic: number, minor: boolean) {
  const name = noteIn(tonic, usesFlats(tonic, minor))
  return minor ? `${name} minor` : `${name} ${tr('mayor', 'major')}`
}
const keyShort = (tonic: number, minor: boolean) => noteIn(tonic, usesFlats(tonic, minor)) + (minor ? 'm' : '')

/** Camelot wheel code DJs mix by: 8A = A minor, 8B = C major. */
function camelot(tonic: number, minor: boolean) {
  const major = minor ? pc(tonic + 3) : tonic
  return `${((pc(major * 7) + 7) % 12) + 1}${minor ? 'A' : 'B'}`
}

/** The seven chords that belong to the key, I … vii°. */
function diatonic(tonic: number, minor: boolean) {
  const flats = usesFlats(tonic, minor)
  const steps = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]
  const kinds = minor ? ['m', 'dim', '', 'm', 'm', '', ''] : ['', 'm', 'm', '', '', 'm', 'dim']
  return steps.map((s, i) => noteIn(tonic + s, flats) + kinds[i])
}

function analyzeInWorker(samples: Float32Array): Promise<Analysis> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<Analysis>) => {
      resolve(e.data)
      worker.terminate()
    }
    worker.onerror = (e) => {
      reject(e)
      worker.terminate()
    }
    worker.postMessage(samples, [samples.buffer])
  })
}

export default function BpmKey() {
  const t = useT()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [error, setError] = useState('')
  /** ×½ / ×2 the user picked, for songs felt at another tempo. */
  const [factor, setFactor] = useState(1)

  const url = phase.kind === 'done' ? phase.url : ''
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  async function run(file: File) {
    setError('')
    setFactor(1)
    setPhase({ kind: 'busy', label: t('Membaca audio…', 'Reading the audio…') })
    try {
      let samples: Float32Array
      try {
        samples = await decodeToMono(file)
      } catch {
        throw new Error(
          tr(
            'Browser ini tidak bisa membaca file itu. Coba MP3, M4A, WAV, OGG, atau video MP4.',
            "This browser can't read that file. Try MP3, M4A, WAV, OGG or an MP4 video.",
          ),
        )
      }
      if (samples.length < 8 * 11025)
        throw new Error(tr('Audio terlalu pendek — minimal sekitar 8 detik.', 'The audio is too short — about 8 seconds at least.'))
      setPhase({ kind: 'busy', label: t('Menganalisis ketukan dan nada…', 'Analysing beat and pitch…') })
      const result = await analyzeInWorker(samples)
      setPhase({ kind: 'done', result, file, url: URL.createObjectURL(file) })
    } catch (e) {
      setPhase({ kind: 'idle' })
      setError(e instanceof Error && e.message ? e.message : tr('Analisis gagal.', 'The analysis failed.'))
    }
  }

  if (phase.kind !== 'done')
    return (
      <div className="space-y-4">
        <FileDrop
          accept="audio/*,video/mp4,video/webm,.mp3,.m4a,.wav,.ogg,.opus,.flac"
          label={t('Tarik file lagu ke sini', 'Drop a song here')}
          busyLabel={phase.kind === 'busy' ? phase.label : undefined}
          onFiles={([f]) => void run(f)}
        />
        {error && <ErrorNote message={error} />}
        <p className="text-sm text-muted-foreground">
          {t(
            'MP3, M4A, WAV, OGG, FLAC, atau video MP4. Lagu dianalisis di perangkatmu — tidak di-upload.',
            'MP3, M4A, WAV, OGG, FLAC or an MP4 video. The song is analysed on your device — never uploaded.',
          )}
        </p>
      </div>
    )

  const { result } = phase
  const bpm = result.bpm * factor
  const shown = Math.abs(bpm - Math.round(bpm)) < 0.15 ? String(Math.round(bpm)) : bpm.toFixed(1)
  const steady = result.bpmConfidence >= 0.25
  const { tonic, minor } = result.key
  const relative = minor ? { tonic: pc(tonic + 3), minor: false } : { tonic: pc(tonic - 3), minor: true }
  const others = result.keys.slice(1, 3)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <p className="min-w-0 truncate text-sm font-medium">{phase.file.name}</p>
        <Button variant="outline" size="sm" onClick={() => setPhase({ kind: 'idle' })}>
          <RotateCcw /> {t('Lagu lain', 'Another song')}
        </Button>
        <audio src={phase.url} controls className="w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border bg-card p-6 shadow-xs sm:p-8">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="size-4" /> {t('Tempo', 'Tempo')}
          </p>
          <p className="mt-3 text-6xl font-semibold tracking-tight tabular-nums">
            {result.bpm ? shown : '–'}
            <span className="ml-2 text-xl text-muted-foreground">BPM</span>
          </p>
          <p className={cn('mt-2 text-sm', steady ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400')}>
            {steady
              ? t('Ketukan terdengar jelas.', 'A clear, steady beat.')
              : t(
                  'Ketukannya kurang jelas (tempo bebas atau tanpa drum) — anggap perkiraan.',
                  'The beat is not very clear (free time or no drums) — treat it as a guess.',
                )}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('Terasa lebih lambat/cepat?', 'Feels slower/faster?')}</span>
            {[0.5, 1, 2].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFactor(f)}
                className={cn(
                  'rounded-full border px-3 py-1 font-mono text-xs transition-colors',
                  factor === f ? 'border-transparent bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f === 0.5 ? '½×' : `${f}×`} {Math.round(result.bpm * f)}
              </button>
            ))}
          </div>
          {result.bpm > 0 && (
            <a
              href={`#/metronome?bpm=${Math.round(bpm)}`}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand-2 hover:underline"
            >
              <Activity className="size-4" /> {t('Buka di Metronom', 'Open in Metronome')}
            </a>
          )}
        </section>

        <section className="rounded-3xl border bg-card p-6 shadow-xs sm:p-8">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Music2 className="size-4" /> {t('Kunci lagu', 'Key')}
          </p>
          <p className="mt-3 text-5xl font-semibold tracking-tight">{keyName(tonic, minor)}</p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            Camelot {camelot(tonic, minor)} · {t('relatif', 'relative')} {keyName(relative.tonic, relative.minor)}
          </p>
          {others.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t('Kemungkinan lain', 'Could also be')}: {others.map((k) => keyShort(k.tonic, k.minor)).join(', ')}
            </p>
          )}
          <div className="mt-5">
            <p className="text-xs text-muted-foreground">{t('Chord yang cocok di kunci ini', 'Chords that fit this key')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {diatonic(tonic, minor).map((c) => (
                <span key={c} className="rounded-lg border bg-background px-2.5 py-1 font-mono text-sm">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      <p className="text-sm text-muted-foreground">
        {t(
          'Tempo diambil dari 2 menit di tengah lagu; kunci dari seluruh lagu. Lagu yang berganti kunci atau tempo di tengah akan menunjukkan yang paling dominan.',
          'Tempo is read from two minutes in the middle of the song; the key from the whole song. A song that changes key or tempo midway shows the dominant one.',
        )}
      </p>
    </div>
  )
}
