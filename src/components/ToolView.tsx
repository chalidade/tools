import { Suspense, useEffect } from 'react'
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'
import { InstallCard } from '@/components/InstallCard'
import { ToolAbout } from '@/components/ToolAbout'
import { ToolBoundary } from '@/components/tool/ToolBoundary'
import { toolText, type Tool } from '@/tools/registry'
import { useLang, useT } from '@/lib/i18n'
import { pageUrl } from '@/lib/route'
import { cn } from '@/lib/utils'
import { absoluteUrl, applyHead, toolMeta } from '@/lib/seo'

function NoUploadBadge({ className }: { className: string }) {
  const t = useT()
  return (
    <p
      className={cn(
        'items-center gap-1.5 rounded-full border bg-card/70 px-3 py-1 text-xs whitespace-nowrap text-muted-foreground backdrop-blur',
        className,
      )}
    >
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
    <section className="relative isolate">
      <div aria-hidden className="bg-glow absolute inset-x-0 top-0 -z-10 h-80 opacity-60" />
      <div aria-hidden className="bg-grid absolute inset-x-0 top-0 -z-10 h-80" />

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
        <a
          href={pageUrl('', lang)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t('Kembali', 'Back')}
        </a>

        {/* On phones the tool comes first and its title block follows it, above the install card. */}
        <div className="mt-8 flex flex-col gap-10">
          <div className="order-2 flex items-start gap-4 sm:order-1">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-brand-2/25">
              <tool.icon className="size-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{text.title}</h1>
                {/* Beside the title on desktop; under the description on phones. */}
                <NoUploadBadge className="hidden sm:inline-flex" />
              </div>
              <p className="mt-1 text-muted-foreground">{text.description}</p>
              <NoUploadBadge className="mt-3 inline-flex sm:hidden" />
            </div>
          </div>

          <div className="order-1 sm:order-2">
            <ToolBoundary key={tool.slug}>
              <Suspense fallback={loading}>
                <Component key={tool.slug} />
              </Suspense>
            </ToolBoundary>
          </div>
        </div>
        <InstallCard tool={tool} />
        <ToolAbout tool={tool} />
      </div>
    </section>
  )
}
