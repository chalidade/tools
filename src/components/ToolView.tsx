import { Suspense, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, ShieldCheck } from 'lucide-react'
import { InstallCard } from '@/components/InstallCard'
import { ToolAbout } from '@/components/ToolAbout'
import { ToolBoundary } from '@/components/tool/ToolBoundary'
import { categoryText, toolText, type Tool } from '@/tools/registry'
import { useLang, useT } from '@/lib/i18n'
import { isNativeApp } from '@/lib/native'
import { isPlayApp } from '@/lib/platform'
import { pageUrl, routeQuery } from '@/lib/route'
import { applyAccent, checkLicense, licenseEnabled, parseAccent } from '@/lib/license'
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

/**
 * An embed with a valid license key (?key=…) drops the credit line and may use
 * its own accent color (?accent=7c3aed). 'checking' hides the credit while the
 * store answers, so a licensed embed never flashes it.
 */
function useEmbedLicense(embed: boolean) {
  const [key] = useState(() => (embed && licenseEnabled() ? (routeQuery().get('key') ?? '') : ''))
  const [state, setState] = useState<'none' | 'checking' | 'valid'>(key ? 'checking' : 'none')
  useEffect(() => {
    if (!key) return
    let live = true
    checkLicense(key).then((r) => {
      if (!live) return
      setState(r.valid ? 'valid' : 'none')
      const accent = parseAccent(routeQuery().get('accent'))
      if (r.valid && accent) applyAccent(accent)
    })
    return () => {
      live = false
    }
  }, [key])
  return state
}

export function ToolView({ tool, embed = false }: { tool: Tool; embed?: boolean }) {
  const Component = tool.component
  const t = useT()
  const lang = useLang()
  const text = toolText(tool, lang)
  const license = useEmbedLicense(embed)

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
        {license === 'none' && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <a href={absoluteUrl(tool.slug, lang)} target="_blank" rel="noreferrer" className="hover:text-foreground">
              {text.title} · toowl — {t('berjalan di browsermu, tanpa upload', 'runs in your browser, no upload')} ↗
            </a>
          </p>
        )}
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

      {/*
        Everything that is not the tool sits behind one quiet line: what it does,
        why it is safe, questions, related tools and the embed code. It stays in
        the page (a closed <details>), so search engines still read it.
      */}
      <details className="group/about mt-8 lg:mt-10">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl py-2 text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          {/* A laptop already says this next to the title. */}
          <span className="inline-flex min-w-0 items-center gap-2 font-mono text-xs lg:invisible">
            <ShieldCheck className="size-4 shrink-0 text-brand-2" />
            <span className="truncate">{t('Diproses di perangkatmu', 'Runs on your device')}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm">
            {t('Tentang tool ini', 'About this tool')}
            <ChevronDown className="size-4 transition-transform group-open/about:rotate-180" />
          </span>
        </summary>
        <div className="rise-in pt-3">
          <div className="lg:hidden">{about}</div>
          <ToolAbout tool={tool} />
          {/* Embed code is for site owners on the web, not for people using the store apps. */}
          {!isNativeApp() && !isPlayApp() && <InstallCard tool={tool} />}
        </div>
      </details>
    </section>
  )
}
