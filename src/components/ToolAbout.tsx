import { Check } from 'lucide-react'
import { aboutPoints, relatedHeading, relatedTools } from '@/lib/seo'
import { pageUrl } from '@/lib/route'
import { toolText, type Tool } from '@/tools/registry'
import { useLang, useT } from '@/lib/i18n'

/**
 * Under every tool: why it is safe to use and links to related tools. The
 * same text is in the page's static HTML (scripts/seo.mjs), so it is what a
 * search engine reads, and the links let it reach every tool page.
 */
export function ToolAbout({ tool }: { tool: Tool }) {
  const t = useT()
  const lang = useLang()
  const related = relatedTools(tool)

  return (
    <div className="mt-12 grid gap-8 border-t pt-10 sm:grid-cols-2">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('Kenapa aman dipakai', 'Why it is safe to use')}</h2>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          {aboutPoints(tool, lang).map((point) => (
            <li key={point} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      {related.length > 0 && (
        <nav aria-label={relatedHeading(tool, lang)}>
          <h2 className="text-lg font-semibold tracking-tight">{relatedHeading(tool, lang)}</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {related.map((other) => (
              <li key={other.slug}>
                <a
                  href={pageUrl(other.slug, lang)}
                  className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <other.icon className="size-4" />
                  {toolText(other, lang).title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
