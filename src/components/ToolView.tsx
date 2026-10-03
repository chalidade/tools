import { Suspense } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { Tool } from '@/tools/registry'

export function ToolView({ tool }: { tool: Tool }) {
  const Component = tool.component

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <a
        href="#/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Semua tools
      </a>
      <div className="mt-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <tool.icon className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tool.title}</h1>
          <p className="text-sm text-muted-foreground">{tool.description}</p>
        </div>
      </div>

      <div className="mt-8">
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Memuat tool…
            </div>
          }
        >
          <Component key={tool.slug} />
        </Suspense>
      </div>
    </section>
  )
}
