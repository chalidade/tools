import { useState } from 'react'
import { ChevronDown, Code2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CopyButton } from '@/components/tool/CopyButton'
import { toolText, type Tool } from '@/tools/registry'
import { useLang, useT } from '@/lib/i18n'

const SITE = 'https://chalidade.github.io/tools/'
const REPO = 'https://github.com/chalidade/tools'

type Tab = 'script' | 'npm' | 'iframe'

/**
 * "Pasang di situsmu": how to put this tool on your own website. Every tool can
 * be embedded with an iframe (the site's ?embed mode); tools with a package
 * also get a one-line script tag and npm instructions.
 */
export function InstallCard({ tool }: { tool: Tool }) {
  const t = useT()
  const lang = useLang()
  const title = toolText(tool, lang).title
  const pkg = tool.package?.published ? tool.package : undefined
  const [tab, setTab] = useState<Tab>(pkg ? 'script' : 'iframe')

  const iframe = `<iframe
  src="${SITE}#/${tool.slug}?embed${lang === 'en' ? '&lang=en' : ''}"
  title="${title}"
  style="width: 100%; height: 760px; border: 0; border-radius: 16px"
  allow="display-capture; microphone; camera; clipboard-write; fullscreen; picture-in-picture"
></iframe>`
  const snippets: Record<Tab, { label: string; code: string; note: string }> = {
    script: {
      label: t('Satu tag script', 'One script tag'),
      code: pkg
        ? `<script type="module" src="https://cdn.jsdelivr.net/npm/${pkg.name}@0/dist/element.js"></script>\n\n<${pkg.element}></${pkg.element}>`
        : '',
      note: t(
        'Tempel di HTML mana pun — WordPress, Blogger, Webflow, atau halaman biasa. Gayanya terisolasi, jadi tidak bentrok dengan CSS situsmu.',
        "Paste into any HTML — WordPress, Blogger, Webflow or a plain page. Its styles are isolated, so they won't clash with your site's CSS.",
      ),
    },
    npm: {
      label: 'npm',
      code: pkg ? `npm install ${pkg.name}\n\n// ${t('lalu, di kode situsmu:', "then, in your site's code:")}\nimport '${pkg.name}/element'` : '',
      note: t(
        'Untuk proyek dengan bundler (Vite, Next.js, dll.). Ada juga API tanpa tampilan untuk membuat UI sendiri — lihat README.',
        'For projects with a bundler (Vite, Next.js, etc.). There is also a headless API for building your own UI — see the README.',
      ),
    },
    iframe: {
      label: 'Iframe',
      code: iframe,
      note: t(
        'Paling sederhana: tool ini tampil di situsmu langsung dari sini, tanpa header dan footer.',
        'The simplest: this tool shows on your site straight from here, without the header and footer.',
      ),
    },
  }
  const tabs = (pkg ? ['script', 'npm', 'iframe'] : ['iframe']) as Tab[]
  const current = snippets[tab]

  return (
    // Folded by default: one line under the tool, opened only by someone who wants it.
    <details className="group mt-14 rounded-2xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border bg-background">
          <Code2 className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold tracking-tight">{t('Pasang di situsmu', 'Add it to your site')}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {t('Gratis dan open source (MIT) — tetap berjalan di browser pengunjungmu.', "Free and open source (MIT) — it still runs in your visitors' browsers.")}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t p-4 sm:p-5">
        {tool.package && (
          <a
            href={`${REPO}/tree/main/packages/${tool.package.dir}#readme`}
            target="_blank"
            rel="noreferrer"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {t('Dokumentasi paket', 'Package docs')} <ExternalLink className="size-3.5" />
          </a>
        )}

        {tabs.length > 1 && (
          <div role="tablist" className="flex w-fit gap-1 rounded-xl border bg-muted/60 p-1">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm transition-colors',
                  tab === t ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {snippets[t].label}
              </button>
            ))}
          </div>
        )}

        <div className={cn('relative', tabs.length > 1 && 'mt-4')}>
          <pre className="overflow-x-auto rounded-xl border bg-muted/50 p-4 pr-24 font-mono text-[13px] leading-relaxed">
            {current.code}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton text={current.code} variant="outline" />
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{current.note}</p>
        {tool.package && !tool.package.published && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('Versi paket npm', 'An npm package version')} (<code className="font-mono text-xs">{tool.package.name}</code>){' '}
            {t('dengan satu tag script sedang disiapkan.', 'with a one-line script tag is on its way.')}
          </p>
        )}
      </div>
    </details>
  )
}
