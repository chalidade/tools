import { Suspense, useEffect } from 'react'
import { ChevronRight, Loader2, ShieldCheck } from 'lucide-react'
import { InstallCard } from '@/components/InstallCard'
import { ToolAbout } from '@/components/ToolAbout'
import { ToolBoundary } from '@/components/tool/ToolBoundary'
import { categoryText, toolText, type Tool } from '@/tools/registry'
import { useLang, useT } from '@/lib/i18n'
import { pageUrl } from '@/lib/route'
import { rememberTool } from '@/lib/recent'
import { cn } from '@/lib/utils'
import { absoluteUrl, applyHead, toolMeta } from '@/lib/seo'

function NoUploadBadge({ className }: { className?: string }) {
  const t = useT()
  return (
    <p className={cn('inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground', className)}>
      <ShieldCheck className="size-3.5 text-brand-2" />
      {t('File tidak di-upload', 'Nothing is uploaded')}
    </p>
  )
}

export function ToolView({ tool, embed = false }: { tool: Tool; embed?: boolean }) {
  const Component = tool.component
  const t = useT()
  const lang = useLang()
  const text = toolText(tool, lang)

  useEffect(() => {
    if (embed) {
      const previous = document.title
      document.title = `${text.title} — toowl`
      return () => {
        document.title = previous
      }
    }
    applyHead(toolMeta(tool, lang))
  }, [embed, tool, lang, text.title])

  // The home page offers the tools opened last (kept in this browser only).
  useEffect(() => {
    if (!embed) rememberTool(tool.slug)
  }, [embed, tool.slug])

  const loading = (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {t('Memuat tool…', 'Loading tool…')}
    </div>
  )

  // Inside someone else's iframe: just the tool, and a small credit.
  if (embed)
    return (
      <div className="bg-background p-3 sm:p-4">
        <ToolBoundary key={tool.slug}>
          <Suspense fallback={loading}>
            <Component key={tool.slug} />
          </Suspense>
        </ToolBoundary>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <a href={absoluteUrl(tool.slug, lang)} target="_blank" rel="noreferrer" className="hover:text-foreground">
            {text.title} · toowl — {t('berjalan di browsermu, tanpa upload', 'runs in your browser, no upload')} ↗
          </a>
        </p>
      </div>
    )

  const about = <p className="text-[15px] leading-snug text-muted-foreground text-pretty lg:mt-1.5 lg:text-base">{text.description}</p>

  return (
    <section key={tool.slug} className="page-in mx-auto max-w-5xl px-4 pt-3 pb-10 sm:px-6 lg:pt-8 lg:pb-14">
      {/* Laptop: where you are, then the tool's name. A phone has both in its app bar (Header). */}
      <div className="hidden lg:block">
        <nav aria-label={t('Lokasi halaman', 'Breadcrumb')} className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <a href={pageUrl('all', lang)} className="rounded transition-colors hover:text-foreground">
            {t('Semua tools', 'All tools')}
          </a>
          <ChevronRight className="size-3.5 opacity-60" />
          <a href={pageUrl('all', lang, `c=${tool.category}`)} className="truncate rounded transition-colors hover:text-foreground">
            {categoryText(tool.category, lang).title}
          </a>
        </nav>
        <header className="mt-5 flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-[0.875rem] bg-gradient-brand text-brand-ink">
            <tool.icon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h1 className="text-4xl leading-none font-semibold tracking-[-0.04em]">{text.title}</h1>
              <NoUploadBadge className="rounded-full border bg-card px-2.5 py-1" />
            </div>
            {about}
          </div>
        </header>
      </div>

      <div className="lg:mt-8">
        <ToolBoundary key={tool.slug}>
          <Suspense fallback={loading}>
            <Component key={tool.slug} />
          </Suspense>
        </ToolBoundary>
      </div>

      {/* Phone: the tool comes first; what it does and the privacy note follow it. */}
      <div className="mt-5 flex gap-3 rounded-2xl border bg-card p-4 lg:hidden">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-2" />
        <div>
          {about}
          <p className="mt-1.5 font-mono text-xs text-muted-foreground">{t('Diproses di HP-mu · tidak di-upload', 'Runs on your phone · nothing is uploaded')}</p>
        </div>
      </div>

      <InstallCard tool={tool} />
      <ToolAbout tool={tool} />
    </section>
  )
}
