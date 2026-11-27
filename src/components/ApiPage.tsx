import { useState } from 'react'
import { ArrowUpRight, Braces, Clock, Gauge, Layers, ShieldCheck, Wallet, Workflow } from 'lucide-react'
import { CopyButton } from '@/components/tool/CopyButton'
import { Segmented } from '@/components/tool/Segmented'
import { actorPageUrl, APIFY_CATALOG, APIFY_USER, apifyProfileUrl, perThousand, publishedActors } from '@/lib/apify'
import { useLang, useT } from '@/lib/i18n'
import { pageUrl } from '@/lib/route'
import { apiFaq } from '@/lib/seo'
import { findTool, toolText } from '@/tools/registry'

// /api/ — toowl's engines as paid Apify Actors, for developers and automation
// people. Every link to Apify carries the affiliate token (src/lib/apify.ts).
// Hidden in the iOS and Play apps (App.tsx), which sell nothing outside the
// stores.

const POINTS = [
  {
    icon: Layers,
    title: ['Ribuan file sekali jalan', 'Thousands of files per run'],
    body: ['Kirim daftar URL, dapat link hasil per file. Paralel, dengan batas biaya per run.', 'Send a list of URLs, get a result link per file. Parallel, with a cost cap per run.'],
  },
  {
    icon: Wallet,
    title: ['Bayar per file, tanpa langganan', 'Pay per file, no subscription'],
    body: ['File yang gagal tidak ditagih. Kredit gratis bulanan Apify cukup untuk mencoba.', 'Failed files are free. Apify’s free monthly credit is enough to try them out.'],
  },
  {
    icon: Workflow,
    title: ['Kode atau tanpa kode', 'Code or no code'],
    body: ['REST API, klien Python dan JavaScript, plus n8n, Make dan Zapier.', 'REST API, Python and JavaScript clients, plus n8n, Make and Zapier.'],
  },
  {
    icon: Clock,
    title: ['Terjadwal atau dipicu', 'Scheduled or triggered'],
    body: ['Jalankan tiap jam, saat ada file baru, atau dari webhook.', 'Run every hour, when a new file arrives, or from a webhook.'],
  },
  {
    icon: Gauge,
    title: ['Engine yang sudah teruji', 'Battle-tested engines'],
    body: ['Engine yang sama dengan tool toowl yang dipakai ribuan orang tiap hari.', 'The same engines as the toowl tools thousands of people use every day.'],
  },
  {
    icon: ShieldCheck,
    title: ['Kode terbuka', 'Open source'],
    body: ['Semua Actor ada di repositori publik toowl. Tidak ada yang disembunyikan.', 'Every Actor lives in toowl’s public repository. Nothing hidden.'],
  },
] as const

type Lang3 = 'curl' | 'python' | 'js'

function snippet(kind: Lang3, actor: string) {
  const id = `${APIFY_USER}/${actor}`
  if (kind === 'python')
    return `# pip install apify-client
from apify_client import ApifyClient

client = ApifyClient("<YOUR_APIFY_TOKEN>")
run = client.actor("${id}").call(run_input={
    "files": [{"url": "https://example.com/report.pdf"}],
})
for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item["name"], item.get("downloadUrl") or item.get("error"))`
  if (kind === 'js')
    return `// npm install apify-client
import { ApifyClient } from 'apify-client'

const client = new ApifyClient({ token: '<YOUR_APIFY_TOKEN>' })
const run = await client.actor('${id}').call({
  files: [{ url: 'https://example.com/report.pdf' }],
})
const { items } = await client.dataset(run.defaultDatasetId).listItems()
console.log(items)`
  return `curl -X POST \\
  "https://api.apify.com/v2/acts/${id.replace('/', '~')}/run-sync-get-dataset-items?token=<YOUR_APIFY_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"files":[{"url":"https://example.com/report.pdf"}]}'`
}

export function ApiPage() {
  const t = useT()
  const lang = useLang()
  const live = publishedActors()
  const soon = APIFY_CATALOG.filter((a) => !a.published)
  const [kind, setKind] = useState<Lang3>('curl')
  const example = live.find((a) => a.name === 'pdf-to-markdown') ?? live[0]
  const code = example ? snippet(kind, example.name) : ''
  const profile = apifyProfileUrl()

  return (
    <div className="page-in mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-12">
      {/* Intro */}
      <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{t('Untuk developer & otomasi', 'For developers & automation')}</p>
      <h1 className="mt-2 max-w-3xl text-[2.375rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
        {t('Tool toowl, sekarang lewat API.', 'toowl’s tools, now as an API.')}
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground text-pretty sm:text-base">
        {t(
          'Butuh ribuan PDF, dokumen, gambar atau video diproses otomatis? Engine yang sama dengan tool gratis toowl, berjalan di Apify: panggil dari kode, n8n, Make atau Zapier, bayar per file.',
          'Need thousands of PDFs, documents, images or videos processed automatically? The same engines as toowl’s free tools, running on Apify: call them from code, n8n, Make or Zapier, and pay per file.',
        )}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="#apis" className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-brand px-5 text-sm font-medium text-brand-ink">
          {t('Lihat semua API', 'See all APIs')}
        </a>
        <a href="#code" className="inline-flex h-11 items-center gap-2 rounded-xl border px-5 text-sm font-medium hover:border-brand-2">
          <Braces className="size-4" />
          {t('Contoh kode', 'Code example')}
        </a>
      </div>

      {/* Catalogue */}
      <section id="apis" className="mt-14 scroll-mt-20">
        <p className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{t(`${live.length} API tersedia`, `${live.length} APIs available`)}</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {live.map((a) => {
            const tool = findTool(a.tools[0])
            return (
              <li key={a.name} className="flex flex-col rounded-2xl border p-5 transition-colors hover:border-brand-2">
                <a href={actorPageUrl(a)} target="_blank" rel="sponsored noopener" className="group flex flex-1 flex-col">
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-semibold tracking-tight">{t(a.title[0], a.title[1])}</span>
                    <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-2" />
                  </span>
                  <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(a.blurb[0], a.blurb[1])}</span>
                  <span className="mt-4 font-mono text-sm font-semibold">{perThousand(a, lang)}</span>
                </a>
                {tool && (
                  <a href={pageUrl(tool.slug, lang)} className="mt-3 border-t pt-3 text-xs text-muted-foreground hover:text-foreground">
                    {t('Satu file? Pakai gratis di browser:', 'One file? Free in your browser:')} <span className="text-brand-2">{toolText(tool, lang).title}</span>
                  </a>
                )}
              </li>
            )
          })}
        </ul>
        {soon.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">{t('Segera hadir:', 'Coming soon:')}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {soon.map((a) => (
                <li key={a.name} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                  {t(a.title[0], a.title[1])}
                </li>
              ))}
            </ul>
          </div>
        )}
        {profile && (
          <a href={profile} target="_blank" rel="sponsored noopener" className="mt-6 inline-flex items-center gap-1.5 text-sm text-brand-2 underline underline-offset-4">
            {t('Semua API toowl di Apify Store', 'All toowl APIs on the Apify Store')}
            <ArrowUpRight className="size-4" />
          </a>
        )}
      </section>

      {/* Why */}
      <section className="mt-16 border-t pt-10">
        <h2 className="text-2xl font-semibold tracking-tight">{t('Kenapa lewat API?', 'Why the API?')}</h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {POINTS.map((p) => (
            <li key={p.title[1]} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card">
                <p.icon className="size-[18px]" />
              </span>
              <div>
                <h3 className="font-semibold tracking-tight">{t(p.title[0], p.title[1])}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(p.body[0], p.body[1])}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Code */}
      {example && (
        <section id="code" className="mt-16 scroll-mt-20 border-t pt-10">
          <h2 className="text-2xl font-semibold tracking-tight">{t('Mulai dalam 2 menit', 'Start in 2 minutes')}</h2>
          <ol className="mt-4 max-w-2xl list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              {t('Buat akun Apify gratis lewat ', 'Create a free Apify account through ')}
              <a href={actorPageUrl(example)} target="_blank" rel="sponsored noopener" className="text-brand-2 underline underline-offset-4">
                {t('halaman API-nya', 'the API’s page')}
              </a>
              {t(' (dapat kredit gratis bulanan).', ' (comes with free monthly credit).')}
            </li>
            <li>{t('Salin API token dari Settings → API & Integrations.', 'Copy your API token from Settings → API & Integrations.')}</li>
            <li>{t('Kirim daftar URL file, ambil link hasilnya dari dataset.', 'Send a list of file URLs, read the result links from the dataset.')}</li>
          </ol>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            <Segmented<Lang3>
              label={t(`Contoh: ${t(example.title[0], example.title[1])}`, `Example: ${t(example.title[0], example.title[1])}`)}
              value={kind}
              options={[
                { value: 'curl', label: 'cURL' },
                { value: 'python', label: 'Python' },
                { value: 'js', label: 'JavaScript' },
              ]}
              onChange={setKind}
            />
            <CopyButton text={code} variant="outline" />
          </div>
          <pre className="mt-3 overflow-x-auto rounded-xl border bg-card p-4 font-mono text-xs leading-relaxed">{code}</pre>
          <p className="mt-3 text-sm text-muted-foreground">
            {t(
              'Setiap API memakai input yang sama: "files" berisi daftar URL. Pilihan lain ada di halaman tiap API.',
              'Every API takes the same input: "files", a list of URLs. Other options are on each API’s page.',
            )}
          </p>
        </section>
      )}

      {/* FAQ */}
      <section className="mt-16 border-t pt-10">
        <h2 className="text-2xl font-semibold tracking-tight">{t('Pertanyaan umum', 'Questions')}</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {apiFaq(lang).map((f) => (
            <div key={f.q}>
              <dt className="font-medium">{f.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
