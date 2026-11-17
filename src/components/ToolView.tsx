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
      <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
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

  return (
    <section key={tool.slug} className="page-in mx-auto max-w-5xl px-4 pt-4 pb-10 sm:px-6 sm:pt-8 sm:pb-14">
      <nav aria-label={t('Lokasi halaman', 'Breadcrumb')} className="flex items-center gap-1 text-sm text-muted-foreground">
        <a href={pageUrl('all', lang)} className="rounded transition-colors hover:text-foreground">
          {t('Semua tools', 'All tools')}
        </a>
        <ChevronRight className="size-3.5 opacity-60" />
        <a href={pageUrl('all', lang, `c=${tool.category}`)} className="truncate rounded transition-colors hover:text-foreground">
          {categoryText(tool.category, lang).title}
        </a>
      </nav>

      {/* Compact on a phone, so the tool itself starts within the first screen. */}
      <header className="mt-4 flex items-start gap-3.5 sm:mt-6 sm:gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white shadow-sm sm:size-12">
          <tool.icon className="size-5 sm:size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">{text.title}</h1>
            <NoUploadBadge className="hidden rounded-full border bg-card px-2.5 py-1 sm:inline-flex" />
          </div>
          <p className="mt-1 text-[15px] leading-snug text-muted-foreground text-pretty sm:text-base">{text.description}</p>
          <NoUploadBadge className="mt-2 sm:hidden" />
        </div>
      </header>

      <div className="mt-6 sm:mt-8">
        <ToolBoundary key={tool.slug}>
          <Suspense fallback={loading}>
            <Component key={tool.slug} />
          </Suspense>
        </ToolBoundary>
      </div>
      <InstallCard tool={tool} />
      <ToolAbout tool={tool} />
    </section>
  )
}
