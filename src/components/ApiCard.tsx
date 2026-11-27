import { ExternalLink, Workflow } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { apifyActorUrl } from '@/lib/apify'
import type { Tool } from '@/tools/registry'

/**
 * "Need it in bulk?": points to this tool's paid Apify Actor (same engine on a
 * server, for APIs and automations). Shown only for tools with a published
 * Actor. The link carries toowl's Apify affiliate token.
 */
export function ApiCard({ tool }: { tool: Tool }) {
  const t = useT()
  const url = apifyActorUrl(tool.slug)
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="sponsored noopener"
      className="group mt-3 flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-brand-2 sm:px-5"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border bg-background transition-colors group-hover:bg-brand-fill group-hover:text-brand-ink">
        <Workflow className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold tracking-tight">
          {t('Butuh ribuan file sekaligus? Pakai API-nya', 'Need thousands of files? Use the API')}
        </span>
        <span className="block text-sm text-muted-foreground">
          {t(
            'Mesin yang sama sebagai Actor berbayar di Apify, untuk API, Zapier, Make, n8n, atau jadwal. Di sana file diproses di server Apify, bukan di perangkatmu.',
            'The same engine as a paid Actor on Apify, for APIs, Zapier, Make, n8n or schedules. There, files are processed on Apify’s servers, not on your device.',
          )}
        </span>
      </span>
      <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
    </a>
  )
}
