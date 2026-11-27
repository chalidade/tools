import { Code2, ExternalLink, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '@/lib/i18n'
import { apifyActorUrl } from '@/lib/apify'
import type { Tool } from '@/tools/registry'

/**
 * Two slim rows right under the tool, outside "About this tool", so they are
 * seen without opening anything: embed this tool on your site (opens the
 * Install card below) and, for tools with a published Apify Actor, the paid API.
 */
export function ToolExtras({ tool, onEmbed }: { tool: Tool; onEmbed: () => void }) {
  const t = useT()
  const api = apifyActorUrl(tool.slug)
  return (
    <div className={api ? 'mt-6 grid gap-2 sm:grid-cols-2 lg:mt-8' : 'mt-6 lg:mt-8'}>
      <Row
        as="button"
        onClick={onEmbed}
        icon={<Code2 className="size-4" />}
        title={t('Pasang tool ini di situsmu', 'Put this tool on your site')}
        note={t('Gratis lewat iframe, atau tanpa kredit dengan lisensi', 'Free with an iframe, or without the credit with a license')}
      />
      {api && (
        <Row
          as="a"
          href={api}
          icon={<Workflow className="size-4" />}
          title={t('Butuh ribuan file? Pakai API-nya', 'Thousands of files? Use the API')}
          note={t('Actor berbayar di Apify, diproses di server Apify', 'Paid Actor on Apify, processed on Apify’s servers')}
          external
        />
      )}
    </div>
  )
}

function Row({
  as,
  href,
  onClick,
  icon,
  title,
  note,
  external,
}: {
  as: 'a' | 'button'
  href?: string
  onClick?: () => void
  icon: ReactNode
  title: string
  note: string
  external?: boolean
}) {
  const body = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border bg-background transition-colors group-hover:bg-brand-fill group-hover:text-brand-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
        <span className="block text-xs text-pretty text-muted-foreground">{note}</span>
      </span>
      {external && <ExternalLink className="size-4 shrink-0 text-muted-foreground" />}
    </>
  )
  const cls =
    'group flex w-full min-w-0 items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition-colors hover:border-brand-2'
  return as === 'a' ? (
    <a href={href} target="_blank" rel="sponsored noopener" className={cls}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  )
}
