import { Suspense, useEffect } from 'react'
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'
import { InstallCard } from '@/components/InstallCard'
import type { Tool } from '@/tools/registry'

export function ToolView({ tool, embed = false }: { tool: Tool; embed?: boolean }) {
  const Component = tool.component

  useEffect(() => {
    const previous = document.title
    document.title = `${tool.title} — Tools`
    return () => {
      document.title = previous
    }
  }, [tool.title])

  const loading = (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Memuat tool…
    </div>
  )

  // Inside someone else's iframe: just the tool, and a small credit.
  if (embed)
    return (
      <div className="bg-background p-3 sm:p-4">
        <Suspense fallback={loading}>
          <Component key={tool.slug} />
        </Suspense>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <a href={`https://chalidade.github.io/tools/#/${tool.slug}`} target="_blank" rel="noreferrer" className="hover:text-foreground">
            {tool.title} · Tools — berjalan di browsermu, tanpa upload ↗
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
          href="#/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Semua tools
        </a>

        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-brand-2/25">
              <tool.icon className="size-6" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tool.title}</h1>
              <p className="mt-1 text-muted-foreground">{tool.description}</p>
            </div>
          </div>
          <p className="inline-flex items-center gap-1.5 self-start rounded-full border bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur sm:self-auto">
            <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            File tidak di-upload
          </p>
        </div>

        <div className="mt-10">
          <Suspense fallback={loading}>
            <Component key={tool.slug} />
          </Suspense>
        </div>
        <InstallCard tool={tool} />
      </div>
    </section>
  )
}
