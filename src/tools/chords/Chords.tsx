import { useMemo, useRef, useState } from 'react'
import { Minus, Plus, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CopyButton } from '@/components/tool/CopyButton'
import { Segmented } from '@/components/tool/Segmented'
import { FLATS, SHARPS, pc, pluck, midiToFreq } from '@/lib/music'
import { useLang, useT } from '@/lib/i18n'
import {
  CHORD_TYPES,
  INSTRUMENTS,
  barreOf,
  firstChordRoot,
  transposeSheet,
  voicings,
  type Instrument,
  type Voicing,
} from './theory'

type Tab = 'dictionary' | 'transpose'

const SAMPLE = `Intro:  C   G   Am   F

C                 G
Pagi ini langit cerah sekali
Am                F
Kopi hangat menemani hari
C         G        Am      F
Langkah [C]kecil menuju mimpi`

export default function Chords() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('dictionary')
  return (
    <div className="space-y-6">
      <Segmented
        label={t('Mode', 'Mode')}
        value={tab}
        options={[
          { value: 'dictionary', label: t('Kamus chord', 'Chord dictionary') },
          { value: 'transpose', label: t('Transpose lagu', 'Transpose a song') },
        ]}
        onChange={setTab}
      />
      {tab === 'dictionary' ? <Dictionary /> : <Transpose />}
    </div>
  )
}

/* ---- Dictionary ---- */

function Dictionary() {
  const t = useT()
  const lang = useLang()
  const [instId, setInstId] = useState<Instrument['id']>('guitar')
  const [root, setRoot] = useState(0)
  const [suffix, setSuffix] = useState('')
  const ctxRef = useRef<AudioContext | null>(null)

  const inst = INSTRUMENTS.find((i) => i.id === instId)!
  const type = CHORD_TYPES.find((c) => c.suffix === suffix)!
  const shapes = useMemo(() => voicings(inst, root, type), [inst, root, type])
  const name = (flats: boolean) => (flats ? FLATS : SHARPS)[root] + suffix
  // Spell the tones the way the chord's own key does: Cm is C–E♭–G, not C–D♯–G.
  const minorish = type.intervals.includes(3)
  const flatSpelling = (minorish ? [2, 7, 0, 5, 10, 3] : [5, 10, 3, 8, 1]).includes(root)
  const notes = type.intervals.map((i) => (flatSpelling ? FLATS : SHARPS)[pc(root + i)]).join(' – ')

  const strum = (v: Voicing) => {
    const ctx = (ctxRef.current ??= new AudioContext())
    void ctx.resume()
    const t0 = ctx.currentTime + 0.02
    let k = 0
    v.forEach((f, i) => {
      if (f < 0) return
      const src = ctx.createBufferSource()
      src.buffer = pluck(ctx, midiToFreq(inst.strings[i] + f))
      src.connect(ctx.destination)
      src.start(t0 + k++ * 0.035)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-6">
        <Segmented
          label={t('Instrumen', 'Instrument')}
          value={instId}
          options={INSTRUMENTS.map((i) => ({ value: i.id, label: lang === 'en' ? i.label[1] : i.label[0] }))}
          onChange={setInstId}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('Kunci dasar', 'Root')}</p>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
          {SHARPS.map((n, i) => (
            <button
              key={n}
              type="button"
              onClick={() => setRoot(i)}
              className={cn(
                'h-10 rounded-xl border text-sm font-medium transition-colors',
                root === i ? 'border-transparent bg-primary text-primary-foreground' : 'bg-card hover:border-foreground/30',
              )}
            >
              {n === FLATS[i] ? n : `${n}/${FLATS[i]}`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('Jenis chord', 'Chord type')}</p>
        <div className="flex flex-wrap gap-1.5">
          {CHORD_TYPES.map((c) => (
            <button
              key={c.suffix}
              type="button"
              onClick={() => setSuffix(c.suffix)}
              title={lang === 'en' ? c.label[1] : c.label[0]}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                suffix === c.suffix
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {c.suffix || (lang === 'en' ? 'maj' : 'mayor')}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-5 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-4xl font-semibold tracking-tight">
            {name(false)}
            {SHARPS[root] !== FLATS[root] && <span className="ml-2 text-2xl text-muted-foreground">/ {name(true)}</span>}
          </h2>
          <p className="font-mono text-sm text-muted-foreground">{notes}</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('Ketuk diagram untuk mendengar bunyinya.', 'Tap a diagram to hear it.')}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {shapes.map((v) => (
            <button
              key={v.join(',')}
              type="button"
              onClick={() => strum(v)}
              aria-label={`${name(false)}: ${v.map((f) => (f < 0 ? 'x' : f)).join(' ')}`}
              className="group rounded-2xl border bg-background p-3 transition-colors hover:border-brand-2/50"
            >
              <Diagram v={v} />
              <span className="mt-1 flex items-center justify-center gap-1 font-mono text-[10px] whitespace-nowrap text-muted-foreground">
                {v.map((f) => (f < 0 ? 'x' : f)).join(' ')}
                <Volume2 className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Diagram({ v }: { v: Voicing }) {
  const n = v.length
  const fretted = v.filter((f) => f > 0)
  const top = fretted.length && Math.max(...fretted) > 5 ? Math.min(...fretted) : 1
  const frets = 5
  const W = 100
  const H = 120
  const left = 22
  const right = W - 10
  const y0 = 22
  const gap = (right - left) / (n - 1)
  const row = (H - y0 - 6) / frets
  const x = (i: number) => left + i * gap
  const barre = barreOf(v)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-28 text-foreground" aria-hidden>
      {top === 1 ? (
        <rect x={left} y={y0 - 3} width={right - left} height={3} className="fill-current" />
      ) : (
        <text x={left - 8} y={y0 + row * 0.65} textAnchor="end" className="fill-muted-foreground text-[9px]">
          {top}
        </text>
      )}
      {Array.from({ length: frets + 1 }, (_, k) => (
        <line key={k} x1={left} x2={right} y1={y0 + k * row} y2={y0 + k * row} className="stroke-border" strokeWidth={1} />
      ))}
      {v.map((_, i) => (
        <line key={i} x1={x(i)} x2={x(i)} y1={y0} y2={y0 + frets * row} className="stroke-muted-foreground/60" strokeWidth={1} />
      ))}
      {v.map((f, i) =>
        f < 0 ? (
          <text key={i} x={x(i)} y={y0 - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
            ×
          </text>
        ) : f === 0 ? (
          <circle key={i} cx={x(i)} cy={y0 - 11} r={3.2} className="fill-none stroke-muted-foreground" strokeWidth={1.2} />
        ) : null,
      )}
      {barre && (
        <rect
          x={x(barre.from) - 5}
          y={y0 + (barre.fret - top + 0.5) * row - 5}
          width={x(barre.to) - x(barre.from) + 10}
          height={10}
          rx={5}
          className="fill-current"
        />
      )}
      {v.map((f, i) =>
        f > 0 && !(barre && f === barre.fret) ? (
          <circle key={i} cx={x(i)} cy={y0 + (f - top + 0.5) * row} r={5} className="fill-current" />
        ) : null,
      )}
    </svg>
  )
}

/* ---- Transpose ---- */

function Transpose() {
  const t = useT()
  const [text, setText] = useState(SAMPLE)
  const [steps, setSteps] = useState(0)
  const [flats, setFlats] = useState(false)

  const out = useMemo(() => transposeSheet(text, steps, flats), [text, steps, flats])
  const from = firstChordRoot(text)
  const names = flats ? FLATS : SHARPS
  const shift = (d: number) => setSteps((s) => ((s + d + 17) % 12) - 5) // keep within −5 … +6

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-6">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t('Geser nada', 'Shift by')}</p>
          <div className="flex h-10 items-center gap-1 rounded-xl border bg-card px-1">
            <button
              type="button"
              aria-label={t('Turunkan', 'Down')}
              onClick={() => shift(-1)}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-16 text-center font-mono text-sm tabular-nums">
              {steps > 0 ? `+${steps}` : steps}
            </span>
            <button
              type="button"
              aria-label={t('Naikkan', 'Up')}
              onClick={() => shift(1)}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
        <Segmented
          label={t('Penulisan', 'Spelling')}
          value={flats ? 1 : 0}
          options={[
            { value: 0, label: '♯ (C#)' },
            { value: 1, label: '♭ (Db)' },
          ]}
          onChange={(v) => setFlats(v === 1)}
        />
        {from !== null && (
          <p className="pb-2 text-sm text-muted-foreground">
            {t('Kunci', 'Key')}: <span className="font-medium text-foreground">{names[from]}</span> →{' '}
            <span className="font-medium text-foreground">{names[pc(from + steps)]}</span>
            {steps > 0 && (
              <span className="block sm:inline">
                {' '}
                · {t(`atau bentuk asli + capo di fret ${steps}`, `or the original shapes with a capo on fret ${steps}`)}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-xs font-medium text-muted-foreground">
            {t('Tempel chord / lirik di sini', 'Paste chords / lyrics here')}
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            rows={14}
            className="w-full resize-y rounded-2xl border bg-card p-4 font-mono text-sm leading-relaxed outline-none focus:border-brand-2/50"
          />
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('Hasil', 'Result')}</span>
            <CopyButton text={out} />
          </div>
          <pre className="min-h-[calc(14*1.625em+2rem)] overflow-x-auto rounded-2xl border bg-background p-4 font-mono text-sm leading-relaxed whitespace-pre">
            {out}
          </pre>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {t(
          'Baris yang isinya hanya chord diubah dengan jarak tetap sejajar liriknya; chord dalam [kurung siku] di tengah lirik juga ikut berubah.',
          'Lines made only of chords are shifted with their spacing kept aligned to the lyrics; chords in [square brackets] inside lyrics change too.',
        )}
      </p>
    </div>
  )
}
