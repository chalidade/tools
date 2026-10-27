import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useT } from '@/lib/i18n'

const KEY = 'tasbih:v1'

interface Round {
  at: number
  count: number
  target: number
}
interface Saved {
  count: number
  target: number
  total: number
  history: Round[]
}

const load = (): Saved => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && typeof s.count === 'number') return { count: s.count, target: s.target ?? 33, total: s.total ?? 0, history: Array.isArray(s.history) ? s.history : [] }
  } catch {
    /* storage blocked or empty */
  }
  return { count: 0, target: 33, total: 0, history: [] }
}

export default function Tasbih() {
  const t = useT()
  const [init] = useState(load)
  const [count, setCount] = useState(init.count)
  const [target, setTarget] = useState(init.target)
  const [total, setTotal] = useState(init.total)
  const [history, setHistory] = useState<Round[]>(init.history)
  const [custom, setCustom] = useState('')
  const [vibrate, setVibrate] = useState(true)
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef<number>(0)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ count, target, total, history }))
    } catch {
      /* storage blocked */
    }
  }, [count, target, total, history])

  const buzz = useCallback(
    (pattern: number | number[]) => {
      if (vibrate && typeof navigator.vibrate === 'function') navigator.vibrate(pattern)
    },
    [vibrate],
  )

  const tap = useCallback(() => {
    const next = count + 1
    setTotal((x) => x + 1)
    if (target > 0 && next >= target) {
      setHistory((h) => [{ at: Date.now(), count: next, target }, ...h].slice(0, 30))
      setCount(0)
      setFlash(true)
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlash(false), 900)
      buzz([120, 60, 120])
    } else {
      setCount(next)
      buzz(15)
    }
  }, [count, target, buzz])

  const undo = useCallback(() => {
    if (count > 0) {
      setCount((c) => c - 1)
      setTotal((x) => Math.max(0, x - 1))
    }
  }, [count])

  const reset = () => {
    if (count > 0) setHistory((h) => [{ at: Date.now(), count, target }, ...h].slice(0, 30))
    setCount(0)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.tagName === 'BUTTON')) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        tap()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tap, undo])

  const preset = target === 33 || target === 99 || target === 0 ? String(target) : 'custom'
  const pct = target > 0 ? Math.min(100, (count / target) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Target', 'Target')}
          value={preset}
          onChange={(v) => {
            if (v === 'custom') {
              const n = Math.floor(Number(custom))
              setTarget(n > 0 ? n : 100)
            } else setTarget(Number(v))
            setCount(0)
          }}
          options={[
            { value: '33', label: '33' },
            { value: '99', label: '99' },
            { value: '0', label: t('Bebas', 'Free') },
            { value: 'custom', label: t('Lainnya', 'Custom') },
          ]}
        />
        {preset === 'custom' && (
          <input
            inputMode="numeric"
            aria-label={t('Target sendiri', 'Custom target')}
            value={custom || String(target)}
            onChange={(e) => {
              setCustom(e.target.value)
              const n = Math.floor(Number(e.target.value))
              if (n > 0) setTarget(n)
            }}
            className="w-24 rounded-xl border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={vibrate} onChange={(e) => setVibrate(e.target.checked)} />
          {t('Getar', 'Vibrate')}
        </label>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={tap}
          aria-label={t('Hitung', 'Count')}
          className={`flex h-64 w-64 select-none flex-col items-center justify-center rounded-full border-4 transition-colors active:scale-95 sm:h-72 sm:w-72 ${flash ? 'border-green-500 bg-green-500/10' : 'border-primary/60 bg-muted/40 hover:bg-muted'}`}
          style={{ touchAction: 'manipulation' }}
        >
          <span className="text-7xl font-semibold tabular-nums">{count}</span>
          <span className="mt-1 text-sm text-muted-foreground">{target > 0 ? `/ ${target}` : t('tanpa target', 'no target')}</span>
        </button>
        {target > 0 && (
          <div className="h-2 w-64 overflow-hidden rounded-full bg-muted sm:w-72" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {flash ? t('Target tercapai!', 'Target reached!') : t(`Total sepanjang waktu: ${total.toLocaleString(locale())}`, `All-time total: ${total.toLocaleString(locale())}`)}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={undo} disabled={count === 0}>
            <Undo2 className="size-4" /> {t('Batal satu', 'Undo')}
          </Button>
          <Button variant="outline" onClick={reset} disabled={count === 0}>
            <RotateCcw className="size-4" /> {t('Ulang', 'Reset')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('Pintasan: Spasi / Enter menambah, Backspace membatalkan satu.', 'Shortcuts: Space / Enter to count, Backspace to undo.')}</p>
      </div>

      {history.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('Riwayat', 'History')}</h2>
            <Button variant="ghost" size="sm" onClick={() => setHistory([])}>
              {t('Hapus riwayat', 'Clear history')}
            </Button>
          </div>
          <ul className="divide-y rounded-xl border text-sm">
            {history.map((h) => (
              <li key={h.at} className="flex items-center justify-between px-4 py-2">
                <span className="tabular-nums">
                  {h.count}
                  {h.target > 0 && h.count < h.target ? ` / ${h.target}` : ''}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-muted-foreground">{t('Hitungan dan riwayat tersimpan di perangkat ini saja.', 'Your count and history are stored on this device only.')}</p>
    </div>
  )
}
