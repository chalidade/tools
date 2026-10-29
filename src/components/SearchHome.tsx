import { useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Search, X } from 'lucide-react'
import { navigate, pageUrl } from '@/lib/route'
import { cn } from '@/lib/utils'
import { findTool, TOOLS, toolText, type Tool } from '@/tools/registry'
import { searchTools } from '@/tools/search'
import { useLang, useT } from '@/lib/i18n'

const POPULAR = ['compress-pdf', 'merge-pdf', 'pdf-to-word', 'compress-image', 'pas-foto', 'remove-background', 'qr-generator']
const MAX = 8

// The home page is one search box: open it on a phone, type, tap the tool.
// The full catalogue lives at /all/ (Header → "All tools"). Motion is plain
// CSS: the title blurs away while typing so the results sit right under the
// box, and each new result blurs in.
export function SearchHome() {
  const t = useT()
  const lang = useLang()
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0
  const results = useMemo(() => (searching ? searchTools(query) : []), [query, searching])
  const popular = POPULAR.map(findTool).filter((tool): tool is Tool => !!tool)

  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-glow" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-60" />

      <div className="mx-auto max-w-2xl px-5 pt-[8vh] pb-16 sm:px-6 sm:pt-[16vh] lg:max-w-3xl lg:pt-[18vh]">
        <div className={cn('collapse-blur', searching && 'is-collapsed')}>
          <div className="min-h-0 text-center">
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-7xl">
              {t('Butuh tool', 'Which tool')} <span className="text-gradient">{t('apa hari ini?', 'do you need?')}</span>
            </h1>
            <p className="mt-3 pb-8 text-muted-foreground text-pretty lg:mt-5 lg:pb-10 lg:text-lg">
              {t(`${TOOLS.length} tools gratis, jalan di browsermu, tanpa upload.`, `${TOOLS.length} free tools, running in your browser, nothing uploaded.`)}
            </p>
          </div>
        </div>

        <label className="group relative block">
          <span className="sr-only">{t('Cari tool', 'Search tools')}</span>
          {/* Soft brand glow that wakes up when the box has focus. */}
          <span aria-hidden className="absolute -inset-1 rounded-[1.4rem] lg:rounded-[1.65rem] bg-gradient-brand opacity-25 blur-xl transition-opacity duration-500 group-focus-within:opacity-60" />
          <Search className="pointer-events-none absolute top-1/2 left-5 z-10 size-5 -translate-y-1/2 lg:left-6 lg:size-6 text-muted-foreground" />
          <input
            type="search"
            autoFocus
            enterKeyHint="go"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) navigate(pageUrl(results[0].slug, lang))
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder={t('Cari: kompres pdf, pas foto, mp3…', 'Search: compress pdf, photo, mp3…')}
            className="relative h-15 w-full rounded-2xl border bg-card/90 pr-12 pl-13 text-base lg:h-18 lg:rounded-3xl lg:pl-15 lg:text-lg shadow-lg backdrop-blur-xl outline-none placeholder:text-muted-foreground focus:border-brand-2/50 [&::-webkit-search-cancel-button]:hidden"
          />
          {searching && (
            <button
              type="button"
              aria-label={t('Hapus pencarian', 'Clear search')}
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-3 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </label>

        {!searching ? (
          <div className="mt-6 flex flex-wrap justify-center gap-2 lg:mt-8 lg:gap-2.5">
            {popular.map((tool, i) => (
              <a
                key={tool.slug}
                href={pageUrl(tool.slug, lang)}
                style={{ animationDelay: `${i * 50}ms` }}
                className="blur-in inline-flex items-center gap-2 rounded-full border bg-card/70 py-1.5 pr-3.5 pl-2 text-sm lg:py-2 lg:pr-4 lg:pl-3 lg:text-base text-muted-foreground backdrop-blur transition-colors hover:border-brand-2/50 hover:text-foreground"
              >
                <tool.icon className="size-4 text-brand-2 lg:size-[18px]" />
                {toolText(tool, lang).title}
              </a>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="blur-in mt-6 rounded-2xl border border-dashed bg-card/60 p-8 text-center backdrop-blur">
            <p className="font-medium">{t(`Tidak ada tool untuk “${query}”`, `No tools match “${query}”`)}</p>
            <a href={pageUrl('all', lang)} className="mt-3 inline-block text-sm font-medium text-brand-2 hover:underline">
              {t('Lihat semua tools', 'See all tools')}
            </a>
          </div>
        ) : (
          <>
            <p className="mt-5 mb-2 px-1 font-mono text-xs text-muted-foreground">
              {t(`${results.length} hasil`, `${results.length} results`)}
              <span className="hidden sm:inline"> · {t('Enter buka yang pertama', 'Enter opens the first')}</span>
            </p>
            <ul className="overflow-hidden rounded-2xl border bg-card/80 shadow-lg backdrop-blur-xl">
              {results.slice(0, MAX).map((tool, i) => (
                // Keyed by slug: a result that stays while typing does not replay its entrance.
                <li key={tool.slug} style={{ animationDelay: `${i * 35}ms` }} className="blur-in border-b last:border-b-0">
                  <ResultRow tool={tool} first={i === 0} />
                </li>
              ))}
            </ul>
            {results.length > MAX && (
              <a
                href={pageUrl('all', lang, `q=${encodeURIComponent(query)}`)}
                className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t(`Lihat semua ${results.length} hasil`, `See all ${results.length} results`)}
                <ArrowRight className="size-4" />
              </a>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function ResultRow({ tool, first }: { tool: Tool; first: boolean }) {
  const lang = useLang()
  const text = toolText(tool, lang)
  return (
    <a
      href={pageUrl(tool.slug, lang)}
      className={cn('group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-accent/60 active:bg-accent', first && 'bg-accent/30')}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white">
        <tool.icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{text.title}</span>
        <span className="block truncate text-sm text-muted-foreground">{text.description}</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
    </a>
  )
}
