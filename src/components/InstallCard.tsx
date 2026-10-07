import { useState } from 'react'
import { Code2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CopyButton } from '@/components/tool/CopyButton'
import type { Tool } from '@/tools/registry'

const SITE = 'https://chalidade.github.io/tools/'
const REPO = 'https://github.com/chalidade/tools'

type Tab = 'script' | 'npm' | 'iframe'

/**
 * "Pasang di situsmu": how to put this tool on your own website. Every tool can
 * be embedded with an iframe (the site's ?embed mode); tools with a package
 * also get a one-line script tag and npm instructions.
 */
export function InstallCard({ tool }: { tool: Tool }) {
  const pkg = tool.package?.published ? tool.package : undefined
  const [tab, setTab] = useState<Tab>(pkg ? 'script' : 'iframe')

  const iframe = `<iframe
  src="${SITE}#/${tool.slug}?embed"
  title="${tool.title}"
  style="width: 100%; height: 760px; border: 0; border-radius: 16px"
  allow="display-capture; microphone; camera; clipboard-write; fullscreen; picture-in-picture"
></iframe>`
  const snippets: Record<Tab, { label: string; code: string; note: string }> = {
    script: {
      label: 'Satu tag script',
      code: pkg
        ? `<script type="module" src="https://cdn.jsdelivr.net/npm/${pkg.name}@0/dist/element.js"></script>\n\n<${pkg.element}></${pkg.element}>`
        : '',
      note: 'Tempel di HTML mana pun — WordPress, Blogger, Webflow, atau halaman biasa. Gayanya terisolasi, jadi tidak bentrok dengan CSS situsmu.',
    },
    npm: {
      label: 'npm',
      code: pkg ? `npm install ${pkg.name}\n\n// lalu, di kode situsmu:\nimport '${pkg.name}/element'` : '',
      note: 'Untuk proyek dengan bundler (Vite, Next.js, dll.). Ada juga API tanpa tampilan untuk membuat UI sendiri — lihat README.',
    },
    iframe: {
      label: 'Iframe',
      code: iframe,
      note: 'Paling sederhana: tool ini tampil di situsmu langsung dari sini, tanpa header dan footer.',
    },
  }
  const tabs = (pkg ? ['script', 'npm', 'iframe'] : ['iframe']) as Tab[]
  const current = snippets[tab]

  return (
    <section className="mt-14 rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border bg-background">
            <Code2 className="size-[18px]" />
          </span>
          <div>
            <h2 className="font-semibold tracking-tight">Pasang di situsmu</h2>
            <p className="text-sm text-muted-foreground">
              Gratis dan open source (MIT) — tetap berjalan di browser pengunjungmu.
            </p>
          </div>
        </div>
        {tool.package && (
          <a
            href={`${REPO}/tree/main/packages/${tool.package.dir}#readme`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Dokumentasi paket <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      {tabs.length > 1 && (
        <div role="tablist" className="mt-5 inline-flex gap-1 rounded-xl border bg-muted/60 p-1">
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

      <div className="relative mt-4">
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
          Versi paket npm (<code className="font-mono text-xs">{tool.package.name}</code>) dengan satu tag script
          sedang disiapkan.
        </p>
      )}
    </section>
  )
}
