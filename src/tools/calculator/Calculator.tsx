import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Delete, History, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CopyButton } from '@/components/tool/CopyButton'
import { Segmented } from '@/components/tool/Segmented'
import { CalcError, evaluate, formatNumber, plainNumber, type AngleMode } from './engine'

type Mode = 'basic' | 'scientific'
interface Entry {
  expr: string
  result: number
}

const HISTORY_KEY = 'tools:calculator'
const MAX_HISTORY = 50

function loadHistory(): Entry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((e) => typeof e?.expr === 'string' && typeof e?.result === 'number') : []
  } catch {
    return []
  }
}

/** A key on the pad: what it shows, and what it puts into the expression. */
interface Key {
  label: ReactNode
  insert?: string
  action?: 'clear' | 'back' | 'equals' | 'paren' | 'negate'
  kind?: 'digit' | 'op' | 'fn' | 'accent'
  title?: string
}

const BASIC: Key[] = [
  { label: 'AC', action: 'clear', kind: 'fn', title: 'Hapus semua (Esc)' },
  { label: <Delete className="size-5" />, action: 'back', kind: 'fn', title: 'Hapus satu (Backspace)' },
  { label: '%', insert: '%', kind: 'fn' },
  { label: '÷', insert: '÷', kind: 'op' },
  { label: '7', insert: '7', kind: 'digit' },
  { label: '8', insert: '8', kind: 'digit' },
  { label: '9', insert: '9', kind: 'digit' },
  { label: '×', insert: '×', kind: 'op' },
  { label: '4', insert: '4', kind: 'digit' },
  { label: '5', insert: '5', kind: 'digit' },
  { label: '6', insert: '6', kind: 'digit' },
  { label: '−', insert: '−', kind: 'op' },
  { label: '1', insert: '1', kind: 'digit' },
  { label: '2', insert: '2', kind: 'digit' },
  { label: '3', insert: '3', kind: 'digit' },
  { label: '+', insert: '+', kind: 'op' },
  { label: '( )', action: 'paren', kind: 'fn', title: 'Kurung buka / tutup' },
  { label: '0', insert: '0', kind: 'digit' },
  { label: ',', insert: ',', kind: 'digit', title: 'Koma desimal' },
  { label: '=', action: 'equals', kind: 'accent', title: 'Hitung (Enter)' },
]

const SCIENTIFIC: Key[] = [
  { label: 'sin', insert: 'sin(' },
  { label: 'cos', insert: 'cos(' },
  { label: 'tan', insert: 'tan(' },
  { label: 'π', insert: 'π' },
  { label: 'e', insert: 'e' },
  { label: <>sin⁻¹</>, insert: 'asin(' },
  { label: <>cos⁻¹</>, insert: 'acos(' },
  { label: <>tan⁻¹</>, insert: 'atan(' },
  { label: 'ln', insert: 'ln(' },
  { label: 'log', insert: 'log(' },
  { label: <>x²</>, insert: '^2' },
  { label: <>xʸ</>, insert: '^' },
  { label: '√', insert: '√' },
  { label: '∛', insert: '∛' },
  { label: 'x!', insert: '!' },
  { label: '1/x', insert: '^(−1)' },
  { label: '|x|', insert: 'abs(' },
  { label: '±', action: 'negate', title: 'Ganti tanda' },
  { label: 'Ans', insert: 'Ans', title: 'Hasil terakhir' },
  { label: 'EE', insert: '×10^', title: '×10 pangkat' },
]

export default function Calculator() {
  const [expr, setExpr] = useState('')
  const [mode, setMode] = useState<Mode>('basic')
  const [angle, setAngle] = useState<AngleMode>('deg')
  const [history, setHistory] = useState<Entry[]>(loadHistory)
  const [shown, setShown] = useState<{ expr: string; result: number } | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const ans = history[0]?.result ?? 0

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
    } catch {
      // Private mode: history just won't persist.
    }
  }, [history])

  // The result as you type, like a phone calculator; nothing while it's incomplete.
  const preview = useMemo(() => {
    if (!expr.trim()) return null
    try {
      const v = evaluate(expr, { angle, ans })
      return /^[\d.,\s]+$/.test(expr.trim()) ? null : v
    } catch {
      return null
    }
  }, [expr, angle, ans])

  /** Puts text at the cursor (or over the selection) and keeps focus in the field. */
  function insert(text: string) {
    const el = inputRef.current
    // After "=", typing a digit starts fresh; an operator continues from the result.
    let base = expr
    let start = el?.selectionStart ?? base.length
    let end = el?.selectionEnd ?? base.length
    if (shown && expr === shown.expr) {
      base = /^[\d,(π√∛a-z]/i.test(text) ? '' : plainNumber(shown.result)
      start = end = base.length
    }
    const next = base.slice(0, start) + text + base.slice(end)
    setExpr(next)
    setShown(null)
    setError('')
    requestAnimationFrame(() => {
      el?.focus()
      const at = start + text.length
      el?.setSelectionRange(at, at)
    })
  }

  function equals() {
    if (!expr.trim()) return
    try {
      const result = evaluate(expr, { angle, ans })
      setHistory((h) => [{ expr, result }, ...h].slice(0, MAX_HISTORY))
      setShown({ expr, result })
      setError('')
    } catch (e) {
      setError(e instanceof CalcError ? e.message : 'Ekspresi tidak valid')
    }
  }

  function press(key: Key) {
    if (key.insert) return insert(key.insert)
    switch (key.action) {
      case 'clear':
        setExpr('')
        setShown(null)
        setError('')
        inputRef.current?.focus()
        return
      case 'back': {
        const el = inputRef.current
        const start = el?.selectionStart ?? expr.length
        const end = el?.selectionEnd ?? expr.length
        if (start === end && start === 0) return
        const from = start === end ? start - 1 : start
        setExpr(expr.slice(0, from) + expr.slice(end))
        setShown(null)
        setError('')
        requestAnimationFrame(() => {
          el?.focus()
          el?.setSelectionRange(from, from)
        })
        return
      }
      case 'paren': {
        // Open unless there's an unclosed bracket and the last thing is a value.
        const open = (expr.match(/\(/g) ?? []).length - (expr.match(/\)/g) ?? []).length
        return insert(open > 0 && /[\d)πe!%]$/.test(expr) ? ')' : '(')
      }
      case 'negate':
        setExpr(expr.startsWith('−(') && expr.endsWith(')') ? expr.slice(2, -1) : `−(${expr || '0'})`)
        setShown(null)
        return
      case 'equals':
        return equals()
    }
  }

  const resultText = shown ? formatNumber(shown.result) : preview !== null ? formatNumber(preview) : ''

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
        <div className="rounded-3xl border bg-card p-4 shadow-xs sm:p-5">
          {/* Display */}
          <div className="rounded-2xl bg-muted/60 px-4 pt-3 pb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono">{mode === 'scientific' ? angle.toUpperCase() : ' '}</span>
              {resultText && <CopyButton text={plainNumber(shown?.result ?? preview ?? 0)} label="Salin hasil" />}
            </div>
            <input
              ref={inputRef}
              value={expr}
              autoFocus
              inputMode="decimal"
              spellCheck={false}
              aria-label="Ekspresi"
              placeholder="0"
              onChange={(e) => {
                // Pasted or typed * and / show as × and ÷, like the keys.
                setExpr(e.target.value.replace(/\*/g, '×').replace(/\//g, '÷'))
                setShown(null)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || (e.key === '=' && !e.shiftKey)) {
                  e.preventDefault()
                  equals()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  press({ label: '', action: 'clear' })
                } else if (e.key === '*') {
                  e.preventDefault()
                  insert('×')
                } else if (e.key === '/') {
                  e.preventDefault()
                  insert('÷')
                } else if (e.key === '-') {
                  e.preventDefault()
                  insert('−')
                } else if (shown && expr === shown.expr && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                  // Typing after "=": route through insert() so it continues or starts fresh.
                  e.preventDefault()
                  insert(e.key === '.' ? ',' : e.key)
                }
              }}
              className={cn(
                'mt-1 w-full bg-transparent text-right font-mono tracking-tight outline-none placeholder:text-muted-foreground/50',
                shown ? 'text-lg text-muted-foreground' : 'text-3xl sm:text-4xl',
              )}
            />
            <p
              aria-live="polite"
              className={cn(
                'mt-1 min-h-9 truncate text-right font-mono tabular-nums',
                shown ? 'text-4xl font-semibold sm:text-5xl' : 'text-xl text-muted-foreground',
                error && 'text-base text-destructive',
              )}
            >
              {error || (resultText ? (shown ? resultText : `= ${resultText}`) : '')}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <Segmented
              label="Mode"
              value={mode}
              options={[
                { value: 'basic', label: 'Biasa' },
                { value: 'scientific', label: 'Ilmiah' },
              ]}
              onChange={setMode}
            />
            {mode === 'scientific' && (
              <Segmented
                label="Sudut"
                value={angle}
                options={[
                  { value: 'deg', label: 'Derajat' },
                  { value: 'rad', label: 'Radian' },
                ]}
                onChange={setAngle}
              />
            )}
          </div>

          {mode === 'scientific' && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {SCIENTIFIC.map((k, i) => (
                <Pad key={i} k={k} onPress={press} small />
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {BASIC.map((k, i) => (
              <Pad key={i} k={k} onPress={press} />
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Bisa diketik langsung: angka, + − × ÷ ^ ( ) % !, Enter untuk menghitung, Esc untuk menghapus. Koma atau titik
          sama-sama desimal. 200 + 10% = 220.
        </p>
      </div>

      {/* History */}
      <aside className="rounded-3xl border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <History className="size-4" /> Riwayat
          </h2>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setHistory([])}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Trash2 className="size-3.5" /> Bersihkan
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Hasil hitungan muncul di sini. Klik untuk memakainya lagi.</p>
        ) : (
          <ul className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto">
            {history.map((h, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    setExpr(h.expr)
                    setShown(null)
                    setError('')
                    inputRef.current?.focus()
                  }}
                  title="Pakai lagi ekspresi ini"
                  className="w-full rounded-xl px-3 py-2 text-right transition-colors hover:bg-accent"
                >
                  <span className="block truncate font-mono text-xs text-muted-foreground">{h.expr}</span>
                  <span className="block truncate font-mono text-base font-medium tabular-nums">
                    = {formatNumber(h.result)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}

function Pad({ k, onPress, small }: { k: Key; onPress: (k: Key) => void; small?: boolean }) {
  return (
    <button
      type="button"
      title={k.title}
      // Keep focus in the input so the cursor position survives a tap.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPress(k)}
      className={cn(
        'grid place-items-center rounded-2xl font-medium transition-all select-none active:scale-95',
        small ? 'h-10 text-sm' : 'h-14 text-xl',
        k.kind === 'digit' && 'bg-background shadow-xs hover:bg-accent',
        k.kind === 'op' && 'bg-brand-2/15 text-brand-2 hover:bg-brand-2/25',
        k.kind === 'fn' && 'bg-muted text-foreground hover:bg-accent',
        k.kind === 'accent' && 'bg-gradient-brand text-white shadow-md shadow-brand-2/25 hover:opacity-90',
        !k.kind && 'bg-muted/70 text-foreground hover:bg-accent',
      )}
    >
      {k.label}
    </button>
  )
}
