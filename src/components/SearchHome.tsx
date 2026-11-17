import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CornerDownLeft, Search, X } from 'lucide-react'
import { navigate, pageUrl } from '@/lib/route'
import { recentSlugs } from '@/lib/recent'
import { cn } from '@/lib/utils'
import { findTool, TOOLS, toolText, type Tool } from '@/tools/registry'
import { searchTools } from '@/tools/search'
import { useLang, useT } from '@/lib/i18n'

const POPULAR = ['compress-pdf', 'merge-pdf', 'pdf-to-word', 'compress-image', 'pas-foto', 'remove-background', 'qr-generator']
const MAX = 8

// The home page is one search box: open it on a phone, type, tap the tool.
// The full catalogue lives at /all/ (Header → "All tools"). Motion is plain
// CSS: the title folds away while typing so the results sit right under the
// box, and each new result rises in. On a laptop the arrow keys move through
// the results and Enter opens the marked one.
export function SearchHome() {
  const t = useT()
  const lang = useLang()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const searching = query.trim().length > 0
  const results = useMemo(() => (searching ? searchTools(query).slice(0, MAX) : []), [query, searching])
  const total = useMemo(() => (searching ? searchTools(query).length : 0), [query, searching])
  const [recent] = useState(() => recentSlugs().map(findTool).filter((tool): tool is Tool => !!tool))
  const popular = POPULAR.map(findTool).filter((tool): tool is Tool => !!tool && !recent.includes(tool))

  // "/" jumps to the search box from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <section
      className={cn(
        // While typing, the box moves up: a phone's keyboard leaves little room for results.
        'page-in mx-auto max-w-2xl px-4 pb-16 transition-[padding-top] duration-300 ease-out-soft sm:px-6 lg:max-w-3xl',
        searching ? 'pt-4 sm:pt-[6vh]' : 'pt-[7vh] sm:pt-[15vh]',
      )}
    >
      <div className={cn('fold', searching && 'is-folded')}>
        <div className="min-h-0 overflow-hidden text-center">
          <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-5xl lg:text-[3.5rem]">
            {t('Butuh tool', 'Which tool')} <span className="text-muted-foreground">{t('apa hari ini?', 'do you need?')}</span>
          </h1>
          <p className="mt-3 pb-7 text-[15px] text-muted-foreground text-pretty sm:text-base lg:mt-4 lg:pb-9 lg:text-lg">
            {t(`${TOOLS.length} tools gratis, jalan di browsermu, tanpa upload.`, `${TOOLS.length} free tools, running in your browser, nothing uploaded.`)}
          </p>
        </div>
      </div>

      <label className="relative block">
        <span className="sr-only">{t('Cari tool', 'Search tools')}</span>
        <Search className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground lg:left-5" />
        <input
          ref={inputRef}
          type="search"
          autoFocus
          enterKeyHint="go"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[active]) navigate(pageUrl(results[active].slug, lang))
            else if (e.key === 'Escape') setQuery('')
            else if (e.key === 'ArrowDown' && results.length) {
              e.preventDefault()
              setActive((i) => (i + 1) % results.length)
            } else if (e.key === 'ArrowUp' && results.length) {
              e.preventDefault()
              setActive((i) => (i - 1 + results.length) % results.length)
            }
          }}
          placeholder={t('Cari: kompres pdf, pas foto, mp3…', 'Search: compress pdf, photo, mp3…')}
          className="h-14 w-full rounded-2xl border border-input bg-card pr-12 pl-12 text-base shadow-sm transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground focus:border-brand-2/60 focus:ring-4 focus:ring-brand-2/15 lg:h-16 lg:pl-14 lg:text-lg [&::-webkit-search-cancel-button]:hidden"
        />
        {searching ? (
          <button
            type="button"
            aria-label={t('Hapus pencarian', 'Clear search')}
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="absolute top-1/2 right-2.5 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground lg:block">
            /
          </kbd>
        )}
      </label>

      {!searching ? (
        <div className="mt-7 space-y-6 lg:mt-9">
          {recent.length > 0 && <Shortcuts label={t('Terakhir dipakai', 'Recently used')} tools={recent} />}
          <Shortcuts label={t('Populer', 'Popular')} tools={popular} delay={recent.length} />
          <p className="text-center">
            <a
              href={pageUrl('all', lang)}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(`Lihat semua ${TOOLS.length} tools`, `Browse all ${TOOLS.length} tools`)}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="rise-in mt-4 rounded-2xl border border-dashed p-8 text-center">
          <p className="font-medium">{t(`Tidak ada tool untuk “${query}”`, `No tools match “${query}”`)}</p>
          <a href={pageUrl('all', lang)} className="mt-3 inline-block text-sm font-medium text-brand-2 hover:underline">
            {t('Lihat semua tools', 'See all tools')}
          </a>
        </div>
      ) : (
        <>
          <ul className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-sm">
            {results.map((tool, i) => (
              // Keyed by slug: a result that stays while typing does not replay its entrance.
              <li key={tool.slug} style={{ animationDelay: `${i * 30}ms` }} className="rise-in border-b last:border-b-0">
                <ResultRow tool={tool} active={i === active} onHover={() => setActive(i)} />
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
            <span className="hidden items-center gap-1.5 font-mono lg:flex">
              <kbd className="rounded border bg-muted px-1">↑</kbd>
              <kbd className="rounded border bg-muted px-1">↓</kbd>
              {t('pilih', 'to move')}
              <kbd className="ml-2 rounded border bg-muted px-1">↵</kbd>
              {t('buka', 'to open')}
            </span>
            {total > MAX ? (
              <a
                href={pageUrl('all', lang, `q=${encodeURIComponent(query)}`)}
                className="group ml-auto inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-foreground max-lg:mx-auto"
              >
                {t(`Lihat semua ${total} hasil`, `See all ${total} results`)}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            ) : (
              <span className="ml-auto font-mono max-lg:mx-auto">{t(`${total} hasil`, `${total} results`)}</span>
            )}
          </div>
        </>
      )}
    </section>
  )
}

/** A labelled row of tool chips: the popular ones, or the ones opened last. */
function Shortcuts({ label, tools, delay = 0 }: { label: string; tools: Tool[]; delay?: number }) {
  const lang = useLang()
  if (tools.length === 0) return null
  return (
    <div>
      <p className="text-center font-mono text-[11px] tracking-widest text-muted-foreground/80 uppercase">{label}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {tools.map((tool, i) => (
          <a
            key={tool.slug}
            href={pageUrl(tool.slug, lang)}
            style={{ animationDelay: `${(i + delay) * 35}ms` }}
            className="rise-in group inline-flex h-9 items-center gap-2 rounded-full border bg-card pr-3.5 pl-3 text-sm text-foreground/80 transition-colors hover:border-brand-2/50 hover:text-foreground active:bg-accent lg:h-10 lg:pr-4 lg:text-[15px]"
          >
            <tool.icon className="size-4 text-muted-foreground transition-colors group-hover:text-brand-2" />
            {toolText(tool, lang).title}
          </a>
        ))}
      </div>
    </div>
  )
}

function ResultRow({ tool, active, onHover }: { tool: Tool; active: boolean; onHover: () => void }) {
  const lang = useLang()
  const text = toolText(tool, lang)
  return (
    <a
      href={pageUrl(tool.slug, lang)}
      onMouseMove={onHover}
      className={cn('flex items-center gap-3.5 px-3.5 py-3 active:bg-accent', active && 'bg-accent/70')}
    >
      <span
        className={cn(
          // No transition here: the marked row follows the arrow keys at once.
          'grid size-10 shrink-0 place-items-center rounded-xl',
          active ? 'bg-gradient-brand text-white' : 'bg-muted text-foreground/80',
        )}
      >
        <tool.icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{text.title}</span>
        <span className="block truncate text-sm text-muted-foreground">{text.description}</span>
      </span>
      <CornerDownLeft className={cn('hidden size-4 shrink-0 text-muted-foreground lg:block', !active && 'opacity-0')} />
    </a>
  )
}
