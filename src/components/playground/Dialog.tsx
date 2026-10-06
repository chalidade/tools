import { useEffect, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tool } from '@/tools/registry'
import { dialogFor } from './dialog'

const CHARS_PER_TICK = 2
const TICK_MS = 18

/**
 * RPG-style conversation with a tool's character. Owns the keyboard while
 * open (the world ignores keys meanwhile): E / Enter / Space finishes the line
 * or goes on, arrows pick an answer on the last page, Esc walks away.
 */
export function Dialog({
  tool,
  color,
  onOpen,
  onClose,
}: {
  tool: Tool
  color: string
  onOpen: () => void
  onClose: () => void
}) {
  const pages = dialogFor(tool)
  const [page, setPage] = useState(0)
  const [shown, setShown] = useState(0)
  const [choice, setChoice] = useState<0 | 1>(0)

  const text = pages[page]
  const typed = shown >= text.length
  const last = page === pages.length - 1
  const asking = last && typed

  // Typewriter.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(text.length)
      return
    }
    setShown(0)
    const id = setInterval(() => {
      setShown((n) => {
        if (n + CHARS_PER_TICK >= text.length) clearInterval(id)
        return Math.min(text.length, n + CHARS_PER_TICK)
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [text])

  const advance = () => {
    if (!typed) setShown(text.length)
    else if (!last) setPage((p) => p + 1)
    else if (choice === 0) onOpen()
    else onClose()
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code === 'Escape') onClose()
      else if (e.code === 'KeyE' || e.key === 'Enter' || e.code === 'Space') {
        if (!e.repeat) advance()
      } else if (/^(Arrow(Left|Right|Up|Down)|Key[WASD])$/.test(e.code)) {
        if (asking) setChoice((c) => (c ? 0 : 1))
      } else return
      e.preventDefault()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  })

  return (
    <div
      role="dialog"
      aria-label={`Percakapan dengan ${tool.title}`}
      onClick={(e) => {
        e.stopPropagation()
        if (!asking) advance()
      }}
      className="pointer-events-auto relative w-full max-w-2xl cursor-pointer rounded-2xl border bg-card/95 p-4 shadow-2xl shadow-brand-2/15 backdrop-blur-xl sm:p-5"
    >
      <button
        type="button"
        aria-label="Tutup percakapan"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-3 right-3 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      <div className="flex gap-4">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-md sm:size-14"
          style={{ backgroundColor: color }}
        >
          <tool.icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1 pr-6">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold tracking-tight">{tool.title}</span>
            <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {tool.formats}
            </span>
          </div>
          {/* The full line sits invisibly underneath, so the box never grows while typing. */}
          <p className="mt-1.5 grid text-sm leading-relaxed sm:text-[15px]">
            <span className="invisible col-start-1 row-start-1">{text}</span>
            <span className="col-start-1 row-start-1">
              {text.slice(0, shown)}
              {!typed && <span className="ml-0.5 inline-block h-[1em] w-1.5 animate-pulse bg-foreground/60 align-[-2px]" />}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="flex gap-1.5">
          {pages.map((_, i) => (
            <span
              key={i}
              className={cn('h-1.5 rounded-full transition-all', i === page ? 'w-5 bg-gradient-brand' : 'w-1.5 bg-border')}
            />
          ))}
        </span>

        {asking ? (
          <span className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpen()
              }}
              onMouseEnter={() => setChoice(0)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-shadow',
                choice === 0 && 'ring-2 ring-brand-2 ring-offset-2 ring-offset-card',
              )}
            >
              Buka {tool.title}
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              onMouseEnter={() => setChoice(1)}
              className={cn(
                'inline-flex h-9 items-center rounded-xl border bg-card px-4 text-sm font-medium transition-shadow',
                choice === 1 && 'ring-2 ring-brand-2 ring-offset-2 ring-offset-card',
              )}
            >
              Nanti saja
            </button>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            <span className="hidden pointer-fine:inline">
              <kbd className="rounded border border-b-2 bg-muted px-1 font-mono text-[10px]">E</kbd> lanjut ·{' '}
              <kbd className="rounded border border-b-2 bg-muted px-1 font-mono text-[10px]">Esc</kbd> tutup
            </span>
            <span className="pointer-fine:hidden">Ketuk untuk lanjut</span>
          </span>
        )}
      </div>
    </div>
  )
}
