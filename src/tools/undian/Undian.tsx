import { useEffect, useRef, useState } from 'react'
import { Dices, RotateCcw, Share2 } from 'lucide-react'
import { Segmented } from '@/components/tool/Segmented'
import { CopyButton } from '@/components/tool/CopyButton'
import { locale, useT } from '@/lib/i18n'
import { currentRound, eligible, parseNames, pick, randomInt, uniqueNames, type DrawEntry, type Mode } from './draw'

const KEY = 'tools:undian:v1'

type Saved = { text: string; mode: Mode; history: DrawEntry[] }

function load(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (v && typeof v.text === 'string' && Array.isArray(v.history)) {
      return { text: v.text, mode: v.mode === 'arisan' ? 'arisan' : 'random', history: v.history }
    }
  } catch {
    // Storage blocked or corrupted: start empty.
  }
  return { text: '', mode: 'random', history: [] }
}

export default function Undian() {
  const t = useT()
  const [saved] = useState(load)
  const [text, setText] = useState(saved.text)
  const [mode, setMode] = useState<Mode>(saved.mode)
  const [history, setHistory] = useState<DrawEntry[]>(saved.history)
  const [shown, setShown] = useState<string | null>(null)
  const [rolling, setRolling] = useState(false)
  const timer = useRef<number>(0)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ text, mode, history }))
    } catch {
      // Storage blocked: the draw still works, it just is not remembered.
    }
  }, [text, mode, history])

  useEffect(() => () => window.clearInterval(timer.current), [])

  const names = uniqueNames(parseNames(text))
  const round = currentRound(names, history)
  const pool = eligible(names, history, mode, round)
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  function draw() {
    const winner = pick(pool)
    if (!winner || rolling) return
    const done = () => {
      setShown(winner)
      setRolling(false)
      setHistory((h) => [{ name: winner, at: Date.now(), round }, ...h])
    }
    if (reduce || pool.length === 1) return done()
    setRolling(true)
    let ticks = 0
    window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      setShown(pool[randomInt(pool.length)])
      if (++ticks >= 18) {
        window.clearInterval(timer.current)
        done()
      }
    }, 80)
  }

  const fmt = (e: DrawEntry) => new Date(e.at).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' })
  const last = history[0]
  const shareText = last
    ? mode === 'arisan'
      ? t(`Arisan putaran ${last.round}: ${last.name} dapat giliran.`, `Arisan round ${last.round}: ${last.name} wins this turn.`)
      : t(`Hasil undian: ${last.name}`, `Draw result: ${last.name}`)
    : ''

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText })
        return
      }
    } catch {
      return
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener')
  }

  const winnersThisRound = history.filter((h) => h.round === round).length

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Mode', 'Mode')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'random', label: t('Undian biasa', 'Plain draw') },
          { value: 'arisan', label: t('Arisan', 'Arisan') },
        ]}
      />

      <label className="block max-w-xl space-y-1 text-xs font-medium text-muted-foreground">
        {t('Daftar nama (satu per baris, atau pisahkan dengan koma)', 'Names (one per line, or comma-separated)')}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t('Ani\nBudi\nCitra', 'Ann\nBen\nCara')}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        {t(`${names.length} nama`, `${names.length} names`)}
        {mode === 'arisan' && names.length > 0 && ` · ${t(`putaran ${round}`, `round ${round}`)}: ${winnersThisRound}/${names.length}`}
      </p>

      <div className="rounded-xl border bg-muted/40 p-6 text-center" aria-live="polite">
        <p className={`min-h-10 text-3xl font-semibold ${rolling ? 'text-muted-foreground' : ''}`}>{shown ?? '—'}</p>
        <button
          type="button"
          onClick={draw}
          disabled={!pool.length || rolling}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Dices className="size-4" />
          {t('Acak sekarang', 'Draw now')}
        </button>
        {mode === 'arisan' && names.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t(`Belum dapat giliran: ${pool.length} orang`, `Still waiting for a turn: ${pool.length}`)}
          </p>
        )}
      </div>

      {last && !rolling && (
        <div className="flex flex-wrap gap-2">
          <CopyButton text={shareText} variant="outline" label={t('Salin hasil', 'Copy result')} />
          <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
            <Share2 className="size-4" />
            {t('Bagikan', 'Share')}
          </button>
        </div>
      )}

      {history.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{t('Riwayat', 'History')}</h2>
            <button
              type="button"
              onClick={() => {
                setHistory([])
                setShown(null)
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" /> {t('Hapus riwayat', 'Clear history')}
            </button>
          </div>
          <ul className="max-h-72 divide-y overflow-auto rounded-xl border text-sm">
            {history.map((h, i) => (
              <li key={h.at + '-' + i} className="flex justify-between gap-3 px-3 py-2">
                <span className="font-medium">{h.name}</span>
                <span className="text-xs text-muted-foreground">
                  {mode === 'arisan' ? `${t('putaran', 'round')} ${h.round} · ` : ''}
                  {fmt(h)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Nama diacak dengan crypto.getRandomValues, tanpa bias. Mode arisan tidak memilih orang yang sudah menang sampai semua dapat giliran, lalu putaran baru dimulai. Daftar dan riwayat hanya disimpan di perangkat ini.',
          'Names are drawn with crypto.getRandomValues, without bias. Arisan mode never picks someone who already won until everyone has had a turn, then a new round starts. The list and history stay on this device only.',
        )}
      </p>
    </div>
  )
}
