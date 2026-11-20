import { Check } from 'lucide-react'
import { aboutPoints, faqHeading, relatedHeading, relatedTools, toolFaq } from '@/lib/seo'
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
  const faq = toolFaq(tool, lang)

  return (
    <div className="mt-6 grid gap-8 border-t pt-6 sm:grid-cols-2 lg:mt-2">
      {faq.length > 0 && (
        <section className="sm:col-span-2">
          <h2 className="font-semibold tracking-tight">{faqHeading(lang)}</h2>
          <dl className="mt-3 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            {faq.map((item) => (
              <div key={item.q}>
                <dt className="font-medium text-foreground">{item.q}</dt>
                <dd className="mt-1 text-muted-foreground">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <div>
        <h2 className="font-semibold tracking-tight">{t('Kenapa aman dipakai', 'Why it is safe to use')}</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {aboutPoints(tool, lang).map((point) => (
            <li key={point} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-brand-2" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      {related.length > 0 && (
        <nav aria-label={relatedHeading(tool, lang)}>
          <h2 className="font-semibold tracking-tight">{relatedHeading(tool, lang)}</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {related.map((other) => (
              <li key={other.slug}>
                <a
                  href={pageUrl(other.slug, lang)}
                  className="group inline-flex h-9 items-center gap-2 rounded-full border bg-card pr-3.5 pl-3 text-foreground/80 transition-colors hover:border-brand-2/50 hover:text-foreground active:bg-accent"
                >
                  <other.icon className="size-4 text-muted-foreground transition-colors group-hover:text-brand-2" />
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
