import { ArrowUpRight, BadgeCheck, Check, Code2, KeyRound, Palette, RefreshCw, ShieldCheck, Sparkles, Store, Wallet, X } from 'lucide-react'
import { useLang, useT } from '@/lib/i18n'
import { CUSTOM_TOOL_URL, licenseProducts, productCount, SINGLE_TOOLS, type Product } from '@/lib/license'
import { pageUrl } from '@/lib/route'
import { embedFaq } from '@/lib/seo'
import { useTheme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'
import { TOOLS } from '@/tools/registry'

// /embed/ — the page for site owners: what the free embed gives, what a
// license adds, and every product on sale. Hidden inside the iOS and Play
// apps (App.tsx), which sell nothing outside the stores.

const DEMO = 'cicilan'

const REASONS = [
  {
    icon: Store,
    title: ['Tampil sebagai milikmu', 'Looks like your own'],
    body: [
      'Tanpa nama toowl di halamanmu dan tanpa tautan yang membawa pengunjung keluar.',
      'No toowl name on your page and no link taking visitors away.',
    ],
  },
  {
    icon: Palette,
    title: ['Warna brand-mu', 'Your brand color'],
    body: ['Tombol dan aksen mengikuti warna situsmu.', 'Buttons and accents follow your site color.'],
  },
  {
    icon: Wallet,
    title: ['Lebih murah dari bikin sendiri', 'Cheaper than building it'],
    body: [
      'Satu kalkulator atau tool PDF buatan developer bisa jutaan rupiah. Di sini sekali bayar.',
      'Having a developer build one calculator or PDF tool costs far more. Here it is one payment.',
    ],
  },
  {
    icon: RefreshCw,
    title: ['Tool baru terus datang', 'New tools keep coming'],
    body: [
      'Tool baru rilis hampir setiap hari dan masuk ke lisensimu sesuai temanya, gratis.',
      'New tools ship almost every day and join your license by theme, free.',
    ],
  },
  {
    icon: ShieldCheck,
    title: ['Tanpa server, tanpa upload', 'No server, no uploads'],
    body: [
      'Semua jalan di browser pengunjung. Tidak ada data yang kamu tampung, tidak ada server yang perlu diurus.',
      'Everything runs in the visitor\'s browser. You hold no data and run no server.',
    ],
  },
  {
    icon: Sparkles,
    title: ['Pengunjung betah', 'Visitors stay'],
    body: [
      'Tool yang berguna membuat orang kembali ke situsmu, bukan ke situs lain.',
      'A useful tool brings people back to your site, not someone else\'s.',
    ],
  },
] as const

const COMPARE: [label: [string, string], free: boolean, paid: boolean][] = [
  [['Semua tool bisa di-embed', 'Every tool can be embedded'], true, true],
  [['Jalan di browser, tanpa upload', 'Runs in the browser, no uploads'], true, true],
  [['Boleh untuk situs komersial', 'Allowed on commercial sites'], true, true],
  [['Tanpa tulisan "toowl"', 'No "toowl" credit line'], false, true],
  [['Warna aksen sendiri', 'Your own accent color'], false, true],
  [['Tool baru di temanya, gratis', 'New tools in its theme, free'], false, true],
]

export function EmbedPage() {
  const t = useT()
  const lang = useLang()
  const { theme } = useTheme()
  const products = licenseProducts()
  const note = (p: Product) => {
    const n = productCount(p, TOOLS)
    if (p.scope === 'one') return t(`Pilih 1 dari ${SINGLE_TOOLS.length} tool, satu situs`, `Pick 1 of ${SINGLE_TOOLS.length} tools, one site`)
    if (p.url.endsWith('agency')) return t(`${n} tool, situs klien tanpa batas`, `${n} tools, unlimited client sites`)
    return t(`${n} tool, satu situs`, `${n} tools, one site`)
  }
  const term = (p: Product) => (p.price.includes('/') ? t('bulanan, bisa berhenti kapan saja', 'monthly, cancel anytime') : t('sekali bayar', 'one-time'))
  const demo = `${import.meta.env.BASE_URL}#/${DEMO}?embed&lang=${lang}&theme=${theme === 'light' ? 'light' : 'dark'}`
  const snippet = `<iframe src="https://toowl.my.id/#/${DEMO}?embed" style="width:100%;height:760px;border:0"></iframe>`

  return (
    <div className="page-in mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-12">
      {/* Intro */}
      <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{t('Untuk pemilik website', 'For website owners')}</p>
      <h1 className="mt-2 max-w-3xl text-[2.375rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
        {t(`${TOOLS.length} tools siap pasang di situsmu.`, `${TOOLS.length} tools, ready for your website.`)}
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground text-pretty sm:text-base">
        {t(
          'Kalkulator cicilan, jadwal sholat, kompres PDF, hapus noise video, dan ratusan lainnya. Satu baris kode, jalan di browser pengunjung, tanpa server.',
          'Loan calculators, prayer times, PDF compression, video noise removal and many more. One line of code, running in your visitors\' browsers, no server.',
        )}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="#pricing" className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-brand px-5 text-sm font-medium text-brand-ink">
          {t('Lihat harga lisensi', 'See license prices')}
        </a>
        <a href={pageUrl(DEMO, lang)} className="inline-flex h-11 items-center gap-2 rounded-xl border px-5 text-sm font-medium hover:border-brand-2">
          <Code2 className="size-4" />
          {t('Ambil kode embed gratis', 'Get the free embed code')}
        </a>
      </div>

      {/* Demo + free vs licensed */}
      <section className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-10">
        <div className="min-w-0">
          <p className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{t('Contoh: begini tampilannya di situsmu', 'Live example: how it looks on your site')}</p>
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center gap-1.5 border-b px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="ml-3 truncate font-mono text-xs text-muted-foreground">{t('situsmu.com/kalkulator', 'yoursite.com/calculator')}</span>
            </div>
            <iframe src={demo} title={t('Contoh embed', 'Embed example')} loading="lazy" className="block h-[560px] w-full border-0" />
          </div>
          <pre className="mt-3 overflow-x-auto rounded-xl border bg-card p-3 font-mono text-xs text-muted-foreground">{snippet}</pre>
        </div>

        <div className="min-w-0">
          <p className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{t('Gratis vs berlisensi', 'Free vs licensed')}</p>
          <div className="rounded-2xl border">
            <div className="grid grid-cols-[1fr_4rem_4rem] items-center border-b px-4 py-3 text-xs font-medium">
              <span />
              <span className="text-center text-muted-foreground">{t('Gratis', 'Free')}</span>
              <span className="text-center text-brand-2">{t('Lisensi', 'License')}</span>
            </div>
            <ul>
              {COMPARE.map(([label, free, paid]) => (
                <li key={label[1]} className="grid grid-cols-[1fr_4rem_4rem] items-center border-b px-4 py-3 text-sm last:border-b-0">
                  <span>{t(label[0], label[1])}</span>
                  <span className="grid place-items-center">{free ? <Check className="size-4 text-muted-foreground" /> : <X className="size-4 text-muted-foreground/50" />}</span>
                  <span className="grid place-items-center">{paid ? <Check className="size-4 text-brand-2" /> : <X className="size-4" />}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t(
              'Versi gratis tetap boleh dipakai selamanya. Lisensi untuk yang ingin tool-nya tampil sepenuhnya sebagai bagian dari situsnya.',
              'The free version is yours to keep using. A license is for sites that want the tool to look fully like their own.',
            )}
          </p>
        </div>
      </section>

      {/* Why a license */}
      <section className="mt-16 border-t pt-10">
        <h2 className="text-2xl font-semibold tracking-tight">{t('Kenapa pakai lisensi?', 'Why get a license?')}</h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((r) => (
            <li key={r.title[1]} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card">
                <r.icon className="size-[18px]" />
              </span>
              <div>
                <h3 className="font-semibold tracking-tight">{t(r.title[0], r.title[1])}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(r.body[0], r.body[1])}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mt-16 scroll-mt-20 border-t pt-10">
        <h2 className="text-2xl font-semibold tracking-tight">{t('Harga lisensi', 'License prices')}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t(
            'Bayar lewat Gumroad (kartu, PayPal). Kunci lisensi langsung dikirim ke email. Refund penuh dalam 14 hari kalau tidak jalan di situsmu.',
            'Pay through Gumroad (card, PayPal). The license key arrives by email right away. Full refund within 14 days if it does not work on your site.',
          )}
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const top = p.scope === 'all' && !p.price.includes('/')
            return (
              <li key={p.url}>
                <a
                  href={p.scope === 'one' ? `${p.url}?wanted=true` : p.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'group flex h-full flex-col rounded-2xl border p-5 transition-colors hover:border-brand-2',
                    top && 'border-brand-2 bg-card',
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-semibold tracking-tight">{t(p.name[0], p.name[1])}</span>
                    {top && (
                      <span className="shrink-0 rounded-full bg-gradient-brand px-2 py-0.5 font-mono text-[10px] text-brand-ink uppercase">
                        {t('Paling lengkap', 'Best value')}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">{note(p)}</span>
                  <span className="mt-5 flex items-end justify-between gap-3">
                    <span>
                      <span className="font-mono text-2xl font-semibold tracking-tight">{p.price}</span>
                      <span className="block text-xs text-muted-foreground">{term(p)}</span>
                    </span>
                    <ArrowUpRight className="size-5 text-muted-foreground transition-colors group-hover:text-brand-2" />
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          {t('Butuh tool khusus untuk bisnismu?', 'Need a tool made for your business?')}{' '}
          <a href={CUSTOM_TOOL_URL} target="_blank" rel="noreferrer" className="text-brand-2 underline underline-offset-4">
            {t('Pesan custom tool', 'Order a custom tool')}
          </a>
        </p>
      </section>

      {/* How */}
      <section className="mt-16 border-t pt-10">
        <h2 className="text-2xl font-semibold tracking-tight">{t('Cara pasang', 'How to set it up')}</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            [KeyRound, ['Beli lisensi', 'Buy a license'], ['Kunci lisensi dikirim Gumroad ke email-mu.', 'Gumroad emails you a license key.']],
            [Code2, ['Buka tool-nya', 'Open the tool'], ['Di toowl.my.id, buka "Pasang di situsmu", tempel kunci, pilih warna.', 'On toowl.my.id, expand "Add it to your site", paste the key, pick a color.']],
            [BadgeCheck, ['Tempel kodenya', 'Paste the code'], ['Salin kode iframe ke halamanmu: WordPress, Blogger, Webflow, HTML biasa.', 'Copy the iframe code into your page: WordPress, Blogger, Webflow, plain HTML.']],
          ].map(([Icon, title, body], i) => {
            const I = Icon as typeof KeyRound
            const [ti, bi] = [title as string[], body as string[]]
            return (
              <li key={ti[1]} className="flex gap-4 sm:block">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card">
                  <I className="size-[18px]" />
                </span>
                <div>
                  <h3 className="font-semibold tracking-tight sm:mt-4">
                    <span className="mr-2 font-mono text-xs font-normal text-muted-foreground">0{i + 1}</span>
                    {t(ti[0], ti[1])}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(bi[0], bi[1])}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* FAQ */}
      <section className="mt-16 border-t pt-10">
        <h2 className="text-2xl font-semibold tracking-tight">{t('Pertanyaan umum', 'Questions')}</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {embedFaq(lang).map((f) => (
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
