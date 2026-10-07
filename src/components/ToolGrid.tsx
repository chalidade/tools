import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORIES, TOOLS, categoryText, toolText, type CategoryId, type Tool } from '@/tools/registry'
import { searchTools } from '@/tools/search'
import { useLang, useT } from '@/lib/i18n'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

export function ToolGrid() {
  const t = useT()
  const lang = useLang()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const searchRef = useRef<HTMLInputElement>(null)

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

  const results = useMemo(() => {
    const found = searchTools(query)
    return category === 'all' ? found : found.filter((t) => t.category === category)
  }, [query, category])

  const searching = query.trim().length > 0
  const counts = useMemo(() => {
    const found = searchTools(query)
    return Object.fromEntries(CATEGORIES.map((c) => [c.id, found.filter((t) => t.category === c.id).length]))
  }, [query])

  return (
    <section id="tools" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Tools</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('Pilih yang kamu butuhkan', 'Pick what you need')}
          </h2>
        </div>

        <label className="group relative block w-full lg:max-w-sm">
          <span className="sr-only">{t('Cari tool', 'Search tools')}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('')
                e.currentTarget.blur()
              }
            }}
            placeholder={t(`Cari ${TOOLS.length} tools… (mp3, password, excel)`, `Search ${TOOLS.length} tools… (mp3, password, excel)`)}
            className="h-11 w-full rounded-xl border bg-card pr-10 pl-10 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus:border-brand-2/50 [&::-webkit-search-cancel-button]:hidden"
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
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={t('Kategori', 'Categories')}>
        <CategoryChip
          active={category === 'all'}
          onClick={() => setCategory('all')}
          label={t('Semua', 'All')}
          count={searchTools(query).length}
        />
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c.id}
            active={category === c.id}
            onClick={() => setCategory(c.id)}
            label={categoryText(c.id, lang).title}
            count={counts[c.id]}
          />
        ))}
      </div>

      {results.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed p-10 text-center">
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
        // A search or one category: one flat grid, best matches first.
        <motion.div
          key={`${query}|${category}`}
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {results.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </motion.div>
      ) : (
        // Everything, grouped by category.
        <div className="mt-10 space-y-14">
          {CATEGORIES.map((c) => {
            const tools = TOOLS.filter((t) => t.category === c.id)
            return (
              <div key={c.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-lg font-semibold tracking-tight">{categoryText(c.id, lang).title}</h3>
                  <p className="text-sm text-muted-foreground">{categoryText(c.id, lang).description}</p>
                </div>
                <motion.div
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-40px' }}
                  variants={stagger}
                  className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {tools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </motion.div>
              </div>
            )
          })}
        </div>
      )}
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
        'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-40',
        active
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      <span className={cn('font-mono text-[11px]', active ? 'opacity-70' : 'opacity-60')}>{count}</span>
    </button>
  )
}

function ToolCard({ tool }: { tool: Tool }) {
  const lang = useLang()
  const text = toolText(tool, lang)
  return (
    <motion.a
      variants={fadeUp}
      href={`#/${tool.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-2/10"
    >
      {/* Gradient hairline that lights up on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-brand p-px opacity-0 transition-opacity duration-300 [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)] group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-gradient-brand opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
      />

      <div className="flex items-start justify-between">
        <span className="grid size-11 place-items-center rounded-xl bg-gradient-brand text-white shadow-md shadow-brand-2/25">
          <tool.icon className="size-5" />
        </span>
        <div className="flex items-center gap-2">
          {tool.badge && (
            <span className="rounded-full border border-brand-2/30 bg-brand-2/10 px-2 py-0.5 text-[11px] font-medium text-brand-2">
              {tool.badge === 'Baru' && lang === 'en' ? 'New' : tool.badge}
            </span>
          )}
          <ArrowUpRight className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
        </div>
      </div>

      <h4 className="mt-6 text-lg font-semibold tracking-tight">{text.title}</h4>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{text.description}</p>

      <div className="mt-6 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
        {text.formats.split('→').map((part, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>→</span>}
            <span className="rounded-md border bg-muted px-1.5 py-0.5 text-foreground/80">{part.trim()}</span>
          </span>
        ))}
      </div>
    </motion.a>
  )
}
