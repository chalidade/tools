import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Search, X } from 'lucide-react'
import { pageUrl, routeQuery } from '@/lib/route'
import { cn } from '@/lib/utils'
import { CATEGORIES, TOOLS, categoryText, toolText, type CategoryId, type Tool } from '@/tools/registry'
import { searchTools } from '@/tools/search'
import { useLang, useT } from '@/lib/i18n'

const isCategory = (id: string | null): id is CategoryId => CATEGORIES.some((c) => c.id === id)

export function ToolGrid() {
  const t = useT()
  const lang = useLang()
  const [query, setQuery] = useState(() => routeQuery().get('q') ?? '')
  // ?c=<category> opens the list on one category (a tool page links here).
  const [category, setCategory] = useState<CategoryId | 'all'>(() => {
    const asked = routeQuery().get('c')
    return isCategory(asked) ? asked : 'all'
  })
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // "/" jumps to the search box from anywhere on the page, like most sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const found = useMemo(() => searchTools(query), [query])
  const results = useMemo(() => (category === 'all' ? found : found.filter((t) => t.category === category)), [found, category])
  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.id, found.filter((t) => t.category === c.id).length])), [found])
  const searching = query.trim().length > 0

  // The chips stay on screen on a phone; picking one while deep in the list
  // brings the new list's start back under them.
  function pick(next: CategoryId | 'all') {
    setCategory(next)
    const top = listRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0) window.scrollBy({ top: top - 120 })
  }

  return (
    <section id="tools" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-6 pb-12 sm:px-6 sm:pt-8 sm:pb-16">
      <label className="relative block sm:max-w-md">
        <span className="sr-only">{t('Cari tool', 'Search tools')}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchRef}
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setQuery('')
              e.currentTarget.blur()
            }
          }}
          placeholder={t(`Cari ${TOOLS.length} tools… (mp3, password, excel)`, `Search ${TOOLS.length} tools… (mp3, password, excel)`)}
          className="h-11 w-full rounded-xl border border-input bg-card pr-10 pl-10 text-base shadow-xs transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground focus:border-brand-2/60 focus:ring-4 focus:ring-brand-2/15 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {searching ? (
          <button
            type="button"
            aria-label={t('Hapus pencarian', 'Clear search')}
            onClick={() => {
              setQuery('')
              searchRef.current?.focus()
            }}
            className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground sm:block">
            /
          </kbd>
        )}
      </label>

      {/* On a phone the categories are one row that scrolls sideways and stays under the header. */}
      <div className="sticky top-14 z-30 -mx-4 mt-2 bg-background/90 py-2.5 backdrop-blur-lg sm:static sm:mx-0 sm:mt-4 sm:bg-transparent sm:py-0 sm:backdrop-blur-none">
        <div className="scroll-row flex gap-2 px-4 sm:flex-wrap sm:px-0" role="tablist" aria-label={t('Kategori', 'Categories')}>
          <CategoryChip active={category === 'all'} onClick={() => pick('all')} label={t('Semua', 'All')} count={found.length} />
          {CATEGORIES.map((c) => (
            <CategoryChip key={c.id} active={category === c.id} onClick={() => pick(c.id)} label={categoryText(c.id, lang).title} count={counts[c.id]} />
          ))}
        </div>
      </div>

      <div ref={listRef}>
        {results.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed p-10 text-center">
            <p className="font-medium">{t(`Tidak ada tool untuk “${query}”`, `No tools match “${query}”`)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('Coba kata lain — misalnya “kompres”, “word”, atau “gambar”.', 'Try another word — say “compress”, “word” or “image”.')}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setCategory('all')
              }}
              className="mt-4 text-sm font-medium text-brand-2 hover:underline"
            >
              {t('Lihat semua tools', 'See all tools')}
            </button>
          </div>
        ) : searching || category !== 'all' ? (
          // A search or one category: one flat grid, best matches first. Keyed
          // so a new selection rises in as a whole.
          <div key={`${category}:${searching}`} className="rise-in mt-4 sm:mt-8">
            {category !== 'all' && <p className="mb-4 text-sm text-muted-foreground">{categoryText(category, lang).description}</p>}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {results.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </div>
        ) : (
          // Everything, grouped by category.
          <div className="rise-in mt-6 space-y-10 sm:mt-10 sm:space-y-12">
            {CATEGORIES.map((c) => {
              const tools = TOOLS.filter((t) => t.category === c.id)
              return (
                <div key={c.id}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-lg font-semibold tracking-tight">{categoryText(c.id, lang).title}</h2>
                    <span className="font-mono text-xs text-muted-foreground">{tools.length}</span>
                    <p className="w-full text-sm text-muted-foreground sm:ml-auto sm:w-auto">{categoryText(c.id, lang).description}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                    {tools.map((tool) => (
                      <ToolCard key={tool.slug} tool={tool} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function CategoryChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={count === 0 && !active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors disabled:opacity-40',
        active
          ? 'border-transparent bg-primary font-medium text-primary-foreground'
          : 'bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
      )}
    >
      {label}
      <span className="font-mono text-[11px] opacity-60">{count}</span>
    </button>
  )
}

// One compact row per tool: the icon, the name, one or two lines on what it
// does, and (from tablet up) the formats — short, so a phone shows a
// screenful of them at once.
function ToolCard({ tool }: { tool: Tool }) {
  const lang = useLang()
  const text = toolText(tool, lang)
  return (
    <a
      href={pageUrl(tool.slug, lang)}
      className="group flex gap-3 rounded-xl border bg-card p-3 sm:gap-3.5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-foreground/20 hover:shadow-md active:translate-y-0 active:bg-accent/60 sm:p-4"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground/80 transition-colors duration-200 group-hover:bg-gradient-brand group-hover:text-white">
        <tool.icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium tracking-tight">{text.title}</h3>
          {tool.badge && (
            <span className="shrink-0 rounded-full bg-brand-2/10 px-1.5 py-px text-[10px] font-medium tracking-wide text-brand-2 uppercase">
              {tool.badge === 'Baru' && lang === 'en' ? 'New' : tool.badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">{text.description}</p>
        {/* Formats are a nice-to-have: a phone gets the shorter card. */}
        <p className="mt-2 hidden truncate font-mono text-[11px] text-muted-foreground/80 sm:block">{text.formats}</p>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
    </a>
  )
}
