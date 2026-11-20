import { useState } from 'react'
import { BadgeCheck, ChevronDown, Code2, ExternalLink, Loader2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CopyButton } from '@/components/tool/CopyButton'
import { toolText, type Tool } from '@/tools/registry'
import { useLang, useT } from '@/lib/i18n'
import { buyUrl, checkLicense, licenseEnabled, savedLicenseKey } from '@/lib/license'

const SITE = 'https://toowl.my.id/'
const DEFAULT_ACCENT = '#c6ff3a'
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
  const [license, setLicense] = useState<{ key: string; accent: string } | null>(null)
  const extra = license ? `&key=${license.key}${license.accent !== DEFAULT_ACCENT ? `&accent=${license.accent.slice(1)}` : ''}` : ''

  const iframe = `<iframe
  src="${SITE}#/${tool.slug}?embed${lang === 'en' ? '&lang=en' : ''}${extra}"
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
    <details className="group mt-10 rounded-2xl border bg-card sm:mt-14">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border bg-background">
          <Code2 className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold tracking-tight">{t('Pasang di situsmu', 'Add it to your site')}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {t('Gratis dan open source (AGPL-3.0) — tetap berjalan di browser pengunjungmu.', "Free and open source (AGPL-3.0) — it still runs in your visitors' browsers.")}
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
        {tab === 'iframe' && licenseEnabled() && <LicensePanel license={license} onChange={setLicense} />}
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

/**
 * The paid part of the iframe embed: a license key from Lemon Squeezy or
 * Gumroad removes the toowl credit and unlocks a custom accent colour. Shown
 * only once a store is configured in src/lib/license.ts.
 */
function LicensePanel({
  license,
  onChange,
}: {
  license: { key: string; accent: string } | null
  onChange: (l: { key: string; accent: string } | null) => void
}) {
  const t = useT()
  const [key, setKey] = useState(savedLicenseKey)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const check = async () => {
    setBusy(true)
    setError('')
    const r = await checkLicense(key)
    setBusy(false)
    if (r.valid) onChange({ key: key.trim(), accent: license?.accent ?? DEFAULT_ACCENT })
    else {
      onChange(null)
      setError(r.reason ?? t('Kunci tidak valid.', 'Invalid key.'))
    }
  }

  if (license)
    return (
      <div className="mt-5 rounded-xl border p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <BadgeCheck className="size-4 text-brand-2" />
          {t('Lisensi aktif — kode di atas sudah tanpa tulisan toowl.', 'License active — the code above has no toowl credit.')}
        </p>
        <label className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <input
            type="color"
            value={license.accent}
            onChange={(e) => onChange({ ...license, accent: e.target.value })}
            className="size-9 cursor-pointer rounded-lg border bg-transparent p-1"
          />
          {t('Warna aksen', 'Accent color')} <code className="font-mono text-xs">{license.accent}</code>
        </label>
      </div>
    )

  return (
    <div className="mt-5 rounded-xl border p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Lock className="size-4 text-muted-foreground" />
        {t('Tanpa tulisan toowl, dengan warna situsmu', 'No toowl credit, in your own colors')}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(
          'Versi gratis menampilkan satu baris kecil "toowl" di bawah tool. Dengan lisensi, baris itu hilang dan warnanya bisa kamu sesuaikan.',
          'The free version shows one small "toowl" line under the tool. With a license that line is gone and you can set the color.',
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={buyUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center rounded-lg bg-brand-fill px-3 text-sm font-medium text-brand-ink"
        >
          {t('Beli lisensi', 'Buy a license')}
        </a>
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (key.trim() && !busy) void check()
          }}
        >
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={t('Tempel kunci lisensi', 'Paste your license key')}
            spellCheck={false}
            autoComplete="off"
            className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 font-mono text-xs"
          />
          <button type="submit" disabled={!key.trim() || busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm disabled:opacity-50">
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {t('Pakai', 'Apply')}
          </button>
        </form>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}
