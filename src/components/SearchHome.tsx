import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ChevronRight, CornerDownLeft, LayoutGrid, Search, X } from 'lucide-react'
import { navigate, pageUrl } from '@/lib/route'
import { recentSlugs } from '@/lib/recent'
import { cn } from '@/lib/utils'
import { CATEGORIES, findTool, TOOLS, categoryText, toolText, type CategoryId, type Tool } from '@/tools/registry'
import { searchTools } from '@/tools/search'
import { useLang, useT } from '@/lib/i18n'

const POPULAR = ['compress-pdf', 'merge-pdf', 'pdf-to-word', 'compress-image', 'pas-foto', 'remove-background', 'qr-generator']
const MAX = 8

const label = 'font-mono text-[11px] tracking-widest text-muted-foreground uppercase'
const chip =
  'inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground'

/**
 * Where the on-screen keyboard ends, as `--kb` on <html>, so the phone's
 * search bar can sit right above it. Android resizes the page for the
 * keyboard (`interactive-widget=resizes-content` in index.html) and this
 * stays 0; iOS only shrinks the visual viewport, which is what is measured.
 */
function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--kb', `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`)
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      root.style.removeProperty('--kb')
    }
  }, [])
}

// The home page is a command palette. On a laptop it is a panel in the middle
// of the page: type, move with the arrow keys, Enter opens. On a phone the
// same input is a bar fixed to the bottom of the screen, under the thumb,
// with the tools opened last, the popular ones and the categories above it.
// The full catalogue lives at /all/. Motion is plain CSS.
export function SearchHome() {
  const t = useT()
  const lang = useLang()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  useKeyboardInset()

  const searching = query.trim().length > 0
  const found = useMemo(() => (searching ? searchTools(query) : []), [query, searching])
  const matches = category === 'all' ? found : found.filter((tool) => tool.category === category)
  const results = matches.slice(0, MAX)
  // Categories that have a match, biggest first: the phone's filter chips.
  const filters = useMemo(
    () =>
      CATEGORIES.map((c) => ({ id: c.id, count: found.filter((tool) => tool.category === c.id).length }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count),
    [found],
  )

  const [recent] = useState(() => recentSlugs().map(findTool).filter((tool): tool is Tool => !!tool))
  const popular = POPULAR.map(findTool).filter((tool): tool is Tool => !!tool && !recent.includes(tool))
  // The laptop palette before any typing: a short list the arrow keys walk.
  const idleRecent = recent.slice(0, 3)
  const idlePopular = popular.slice(0, 6 - idleRecent.length)
  const rows = searching ? results : [...idleRecent, ...idlePopular]

  // A laptop starts with the caret in the box; a phone must not open its keyboard on load.
  useEffect(() => {
    if (matchMedia('(min-width: 1024px) and (pointer: fine)').matches) inputRef.current?.focus()
  }, [])

  // "/" or Ctrl/⌘-K jumps to the search box from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const clear = () => {
    setQuery('')
    setCategory('all')
    setActive(0)
    inputRef.current?.focus()
  }

  return (
    <section className="page-in relative isolate">
      <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 -z-10 hidden lg:block" />

      <div className="mx-auto max-w-[44rem] px-4 pt-2 pb-36 lg:px-6 lg:pt-[8vh] lg:pb-20">
        <div className={cn('fold lg:grid-rows-[1fr]! lg:opacity-100!', searching && 'is-folded')}>
          <div className="min-h-0 overflow-hidden">
            <h1 className="pb-1 text-[2.375rem] leading-[1.02] font-semibold tracking-[-0.045em] lg:pb-9 lg:text-center lg:text-6xl">
              {t('Butuh tool', 'Which tool')} <br className="lg:hidden" />
              <span className="text-muted-foreground/70">{t('apa hari ini?', 'do you need?')}</span>
            </h1>
          </div>
        </div>

        <div className="lg:overflow-hidden lg:rounded-[1.25rem] lg:border lg:bg-popover lg:shadow-2xl lg:shadow-black/40 lg:ring-[6px] lg:ring-foreground/[0.03]">
          {/* The input: the top of the palette on a laptop, a bar above the keyboard on a phone. */}
          <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-[var(--kb,0px)] max-lg:z-30 max-lg:bg-linear-to-t max-lg:from-background max-lg:from-70% max-lg:to-transparent max-lg:px-3.5 max-lg:pt-7 max-lg:pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            {searching && filters.length > 1 && (
              <div className="scroll-row -mx-3.5 mb-2.5 flex gap-1.5 px-3.5 lg:hidden" role="tablist" aria-label={t('Kategori', 'Categories')}>
                <FilterChip active={category === 'all'} onClick={() => setCategory('all')} label={t('Semua', 'All')} count={found.length} />
                {filters.map((c) => (
                  <FilterChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)} label={categoryText(c.id, lang).title} count={c.count} />
                ))}
              </div>
            )}
            <div className="relative flex h-14 items-center rounded-[1.125rem] border border-input bg-popover shadow-xl shadow-black/30 transition-[border-color] focus-within:border-brand-2/60 lg:h-16 lg:rounded-none lg:border-0 lg:border-b lg:border-border lg:bg-transparent lg:shadow-none">
              <Search className="pointer-events-none absolute left-4 size-5 text-muted-foreground lg:left-5" />
              <input
                ref={inputRef}
                type="search"
                aria-label={t('Cari tool', 'Search tools')}
                enterKeyHint="go"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setCategory('all')
                  setActive(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && rows[active]) navigate(pageUrl(rows[active].slug, lang))
                  else if (e.key === 'Escape') clear()
                  else if (e.key === 'ArrowDown' && rows.length) {
                    e.preventDefault()
                    setActive((i) => (i + 1) % rows.length)
                  } else if (e.key === 'ArrowUp' && rows.length) {
                    e.preventDefault()
                    setActive((i) => (i - 1 + rows.length) % rows.length)
                  }
                }}
                placeholder={t(`Cari ${TOOLS.length} tools…`, `Search ${TOOLS.length} tools…`)}
                className="h-full min-w-0 flex-1 bg-transparent pr-3 pl-12 text-base caret-brand-2 outline-none placeholder:text-muted-foreground lg:pl-14 lg:text-lg [&::-webkit-search-cancel-button]:hidden"
              />
              {searching ? (
                <button
                  type="button"
                  aria-label={t('Hapus pencarian', 'Clear search')}
                  onClick={clear}
                  className="mr-2 grid size-10 shrink-0 place-items-center rounded-[0.8125rem] bg-secondary text-muted-foreground hover:text-foreground lg:mr-3 lg:size-9 lg:rounded-lg lg:bg-transparent lg:hover:bg-accent"
                >
                  <X className="size-[18px]" />
                </button>
              ) : (
                <>
                  <a
                    href={pageUrl('all', lang)}
                    aria-label={t('Semua tools', 'All tools')}
                    className="mr-2 grid size-10 shrink-0 place-items-center rounded-[0.8125rem] bg-gradient-brand text-brand-ink transition-transform active:scale-95 lg:hidden"
                  >
                    <LayoutGrid className="size-[18px]" />
                  </a>
                  <kbd className="mr-5 hidden rounded-md border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground lg:block">⌘K</kbd>
                </>
              )}
            </div>
          </div>

          {searching ? (
            <div className="lg:p-2">
              <p className={cn(label, 'pt-1 pb-2 lg:px-3 lg:pt-2')}>
                {t(`${matches.length} hasil untuk “${query.trim()}”`, `${matches.length} results for “${query.trim()}”`)}
              </p>
              {results.length === 0 ? (
                <div className="rise-in rounded-2xl border border-dashed p-8 text-center lg:m-1">
                  <p className="font-medium">{t('Tidak ada tool yang cocok', 'No tools match')}</p>
                  <a href={pageUrl('all', lang)} className="mt-2 inline-block text-sm font-medium text-brand-2 hover:underline">
                    {t('Lihat semua tools', 'See all tools')}
                  </a>
                </div>
              ) : (
                <ul>
                  {results.map((tool, i) => (
                    // Keyed by slug: a result that stays while typing does not replay its entrance.
                    <li key={tool.slug} style={{ animationDelay: `${i * 25}ms` }} className="rise-in">
                      <Row tool={tool} active={i === active} onHover={() => setActive(i)} mark={query} />
                    </li>
                  ))}
                </ul>
              )}
              {matches.length > MAX && (
                <a
                  href={pageUrl('all', lang, `q=${encodeURIComponent(query)}`)}
                  className="group mt-2 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(`Lihat semua ${matches.length} hasil`, `See all ${matches.length} results`)}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              )}
            </div>
          ) : (
            <>
              {/* Laptop: one short list inside the palette. */}
              <div className="hidden p-2 lg:block">
                {idleRecent.length > 0 && <p className={cn(label, 'px-3 pt-2 pb-2')}>{t('Terakhir dipakai', 'Recently used')}</p>}
                <ul>
                  {idleRecent.map((tool, i) => (
                    <li key={tool.slug}>
                      <Row tool={tool} active={i === active} onHover={() => setActive(i)} />
                    </li>
                  ))}
                </ul>
                <p className={cn(label, 'px-3 pt-3 pb-2')}>{t('Populer', 'Popular')}</p>
                <ul>
                  {idlePopular.map((tool, i) => (
                    <li key={tool.slug}>
                      <Row tool={tool} active={i + idleRecent.length === active} onHover={() => setActive(i + idleRecent.length)} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Phone: big tiles for the tools opened last (or the most popular), then lists. */}
              <div className="lg:hidden">
                <Heading left={recent.length > 0 ? t('Terakhir dipakai', 'Recently used') : t('Populer', 'Popular')} />
                <div className="grid grid-cols-2 gap-2">
                  {(recent.length > 0 ? recent : popular).slice(0, 4).map((tool, i) => (
                    <a
                      key={tool.slug}
                      href={pageUrl(tool.slug, lang)}
                      style={{ animationDelay: `${i * 40}ms` }}
                      className="rise-in flex h-[5.75rem] flex-col justify-between rounded-2xl border bg-card p-3.5 text-[15px] font-medium tracking-tight transition-transform active:scale-[0.97] active:bg-accent"
                    >
                      <tool.icon className="size-5 text-brand-2" />
                      <span className="truncate">{toolText(tool, lang).title}</span>
                    </a>
                  ))}
                </div>

                {(recent.length > 0 ? popular : popular.slice(4)).length > 0 && (
                  <>
                    <Heading left={recent.length > 0 ? t('Populer', 'Popular') : t('Juga sering dicari', 'Also popular')} />
                    <ul>
                      {(recent.length > 0 ? popular.slice(0, 4) : popular.slice(4)).map((tool) => (
                        <li key={tool.slug} className="border-b">
                          <a href={pageUrl(tool.slug, lang)} className="flex items-center gap-3 py-2.5 font-medium tracking-tight active:opacity-70">
                            <span className="grid size-9 place-items-center rounded-[0.625rem] border bg-card text-muted-foreground">
                              <tool.icon className="size-[18px]" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{toolText(tool, lang).title}</span>
                            <ChevronRight className="size-[18px] text-muted-foreground/60" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <Heading left={t('Kategori', 'Categories')} right={t(`${TOOLS.length} tools`, `${TOOLS.length} tools`)} />
                <ul>
                  {CATEGORIES.map((c) => (
                    <li key={c.id} className="border-b">
                      <a href={pageUrl('all', lang, `c=${c.id}`)} className="flex items-center gap-3 py-3 font-medium tracking-tight active:opacity-70">
                        <span className="min-w-0 flex-1 truncate">{categoryText(c.id, lang).title}</span>
                        <span className="font-mono text-xs text-muted-foreground">{TOOLS.filter((tool) => tool.category === c.id).length}</span>
                        <ChevronRight className="size-[18px] text-muted-foreground/60" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <div className="hidden items-center gap-4 border-t px-5 py-3 font-mono text-xs text-muted-foreground lg:flex">
            <span className="flex items-center gap-1.5">
              <Key>↑</Key>
              <Key>↓</Key>
              {t('pilih', 'move')}
            </span>
            <span className="flex items-center gap-1.5">
              <Key>↵</Key>
              {t('buka', 'open')}
            </span>
            <span className="flex items-center gap-1.5">
              <Key>esc</Key>
              {t('hapus', 'clear')}
            </span>
            <span className="ml-auto">{t(`${TOOLS.length} tools · tanpa upload`, `${TOOLS.length} tools · nothing uploaded`)}</span>
          </div>
        </div>

        {/* Laptop: the categories, as a way in for someone who would rather browse. */}
        <div className="mt-6 hidden flex-wrap justify-center gap-1.5 lg:flex">
          {CATEGORIES.map((c) => (
            <a key={c.id} href={pageUrl('all', lang, `c=${c.id}`)} className={chip}>
              {categoryText(c.id, lang).title}
              <span className="font-mono text-[10px] opacity-70">{TOOLS.filter((tool) => tool.category === c.id).length}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function Heading({ left, right }: { left: string; right?: string }) {
  return (
    <p className={cn(label, 'flex justify-between pt-6 pb-2.5')}>
      <span>{left}</span>
      {right && <span>{right}</span>}
    </p>
  )
}

function Key({ children }: { children: ReactNode }) {
  return <kbd className="rounded-[5px] border px-1.5 py-px font-mono text-[11px]">{children}</kbd>
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(chip, 'shadow-lg shadow-black/20', active && 'border-transparent bg-gradient-brand font-medium text-brand-ink hover:text-brand-ink')}
    >
      {label}
      <span className="font-mono text-[10px] opacity-70">{count}</span>
    </button>
  )
}

/** The words of the query, picked out in the accent colour inside a title. */
function Marked({ text, query }: { text: string; query: string }) {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return text
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig')
  return text.split(pattern).map((part, i) =>
    i % 2 ? (
      <span key={i} className="text-brand-2">
        {part}
      </span>
    ) : (
      part
    ),
  )
}

function Row({ tool, active, onHover, mark = '' }: { tool: Tool; active: boolean; onHover: () => void; mark?: string }) {
  const lang = useLang()
  const text = toolText(tool, lang)
  return (
    <a
      href={pageUrl(tool.slug, lang)}
      onMouseMove={onHover}
      // No transition: the marked row follows the arrow keys at once.
      className={cn(
        'flex items-center gap-3.5 rounded-[0.875rem] px-3 py-2.5 max-lg:-mx-3 active:bg-accent',
        active && 'bg-brand-2/[0.07] ring-1 ring-brand-2/20 ring-inset',
      )}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-[0.6875rem] border lg:size-9',
          active ? 'border-transparent bg-gradient-brand text-brand-ink' : 'bg-card text-muted-foreground',
        )}
      >
        <tool.icon className="size-5 lg:size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium tracking-tight">
          <Marked text={text.title} query={mark} />
        </span>
        <span className="block truncate text-[13px] text-muted-foreground">{text.description}</span>
      </span>
      <kbd className={cn('rounded-[5px] border px-1.5 py-px text-muted-foreground', !active && 'invisible')}>
        <CornerDownLeft className="size-3" />
      </kbd>
    </a>
  )
}
