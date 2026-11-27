import { Suspense, useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Crown, Loader2, Lock, Moon, MousePointerClick, Sun } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { ToolBoundary } from '@/components/tool/ToolBoundary'
import { setLang, useLang, useT } from '@/lib/i18n'
import { deliverIncoming, setShownSlug } from '@/lib/native'
import { useTheme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'
import type { Job } from './background'
import { proNow, usePro } from './license'
import { useOneSave, useSavesLeft } from './trial'
import { GROUPS, TOOLS, findTool, type ExtTool } from './tools'
import { Upgrade } from './Upgrade'

type View = { kind: 'home' } | { kind: 'tool'; slug: string; job?: Job } | { kind: 'upgrade'; from?: string }

// FileDrop asks which tool is on screen before taking a handed-over file.
let shown = ''
setShownSlug(() => shown)

const hasChrome = typeof chrome !== 'undefined' && !!chrome.storage?.session

/** The picture a right-click menu was used on, as a File. */
async function fetchImage(url: string): Promise<File> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(String(res.status))
  const blob = await res.blob()
  if (!blob.type.startsWith('image/')) throw new Error('not an image')
  const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') ?? 'png'
  let name = 'image'
  try {
    const u = new URL(url)
    if (u.protocol.startsWith('http')) name = decodeURIComponent(u.pathname.split('/').pop() || '').replace(/\.[^.]+$/, '') || 'image'
  } catch {
    // keep "image"
  }
  return new File([blob], `${name.slice(0, 80)}.${ext}`, { type: blob.type })
}

export function App() {
  const t = useT()
  const [view, setView] = useState<View>({ kind: 'home' })
  const [blocked, setBlocked] = useState<{ job: Job; origin: string } | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const welcome = new URLSearchParams(location.search).has('welcome')

  const open = useCallback((slug: string, job?: Job) => {
    shown = slug
    setView({ kind: 'tool', slug, job })
    scrollTo(0, 0)
  }, [])

  const run = useCallback(
    async (job: Job) => {
      setBlocked(null)
      if (!findTool(job.tool)) return
      if (!job.imageUrl) return open(job.tool, job)
      open(job.tool, job)
      setLoadingImage(true)
      try {
        deliverIncoming(job.tool, await fetchImage(job.imageUrl))
      } catch {
        // Cross-origin without CORS: ask for that site once, then retry (needs this click).
        let origin = ''
        try {
          origin = new URL(job.imageUrl).origin
        } catch {
          // ignore
        }
        if (origin.startsWith('http')) setBlocked({ job, origin })
      } finally {
        setLoadingImage(false)
      }
    },
    [open],
  )

  // Jobs from the right-click menus (background.ts).
  useEffect(() => {
    if (!hasChrome) return
    const take = (job: unknown) => {
      if (!job) return
      void chrome.storage.session.remove('job')
      void run(job as Job)
    }
    void chrome.storage.session.get('job').then((r) => take(r.job))
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'session' && changes.job?.newValue) take(changes.job.newValue)
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [run])

  const home = () => {
    shown = ''
    setView({ kind: 'home' })
    setBlocked(null)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <Bar view={view} onHome={home} onUpgrade={() => setView({ kind: 'upgrade', from: view.kind === 'tool' ? view.slug : undefined })} />
      <main className="page-in flex-1 px-4 pt-3 pb-8">
        {view.kind === 'home' && <Home welcome={welcome} onOpen={(s) => open(s)} />}
        {view.kind === 'upgrade' && <Upgrade onDone={() => (view.from ? open(view.from) : home())} />}
        {view.kind === 'tool' && (
          <>
            {blocked && (
              <div className="mb-3 rounded-xl border bg-card p-3 text-sm">
                <p>{t(`Izinkan toowl memuat gambar dari ${blocked.origin}?`, `Let toowl load images from ${blocked.origin}?`)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('Gambarnya diambil sekali ke perangkatmu, tidak diunggah ke mana pun.', 'The image is fetched once to your device and uploaded nowhere.')}
                </p>
                <button
                  type="button"
                  className="mt-2 h-8 rounded-lg bg-brand-fill px-3 text-xs font-medium text-brand-ink"
                  onClick={() =>
                    void chrome.permissions.request({ origins: [`${blocked.origin}/*`] }).then((ok) => ok && void run(blocked.job))
                  }
                >
                  {t('Izinkan', 'Allow')}
                </button>
              </div>
            )}
            {loadingImage && (
              <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> {t('Mengambil gambar…', 'Fetching the image…')}
              </p>
            )}
            <ToolScreen key={`${view.slug}:${view.job?.at ?? ''}`} tool={findTool(view.slug)!} job={view.job} onUpgrade={() => setView({ kind: 'upgrade', from: view.slug })} />
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function Bar({ view, onHome, onUpgrade }: { view: View; onHome: () => void; onUpgrade: () => void }) {
  const t = useT()
  const lang = useLang()
  const pro = usePro()
  const { theme, toggle } = useTheme()
  const tool = view.kind === 'tool' ? findTool(view.slug) : undefined
  const btn = 'grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground'
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-1 border-b bg-background/90 px-2 backdrop-blur-lg">
      {view.kind === 'home' ? (
        <span className="flex items-center gap-2 px-2">
          <Logo className="h-5" />
        </span>
      ) : (
        <button type="button" onClick={onHome} className={btn} aria-label={t('Kembali', 'Back')}>
          <ChevronLeft className="size-4.5" />
        </button>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {tool ? (lang === 'en' ? tool.title[1] : tool.title[0]) : view.kind === 'upgrade' ? 'toowl Pro' : ''}
      </span>
      {pro === false && view.kind !== 'upgrade' && (
        <button type="button" onClick={onUpgrade} className="flex h-7 items-center gap-1 rounded-full bg-brand-fill px-2.5 text-xs font-medium text-brand-ink">
          <Crown className="size-3.5" /> Pro
        </button>
      )}
      {pro && (
        <button type="button" onClick={onUpgrade} className="flex h-7 items-center gap-1 rounded-full border px-2.5 font-mono text-[11px] text-brand-2">
          <Crown className="size-3.5" /> PRO
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setLang(lang === 'en' ? 'id' : 'en', { page: false, remember: true })
          document.documentElement.lang = lang === 'en' ? 'id' : 'en'
        }}
        className={cn(btn, 'w-auto px-1.5 font-mono text-[11px]')}
        title={lang === 'en' ? 'Bahasa Indonesia' : 'English'}
      >
        {lang === 'en' ? 'EN' : 'ID'}
      </button>
      <button type="button" onClick={toggle} className={btn} aria-label={t('Ganti tema', 'Switch theme')}>
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </header>
  )
}

function Home({ welcome, onOpen }: { welcome: boolean; onOpen: (slug: string) => void }) {
  const t = useT()
  const lang = useLang()
  const pro = usePro()
  const pick = (p: [string, string]) => (lang === 'en' ? p[1] : p[0])
  return (
    <div className="space-y-5">
      {welcome && (
        <div className="rounded-2xl border bg-card p-4">
          <p className="font-medium">{t('toowl sudah terpasang 👋', 'toowl is installed 👋')}</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>{t('• Sematkan ikon toowl (🧩 → 📌) lalu klik untuk membuka panel ini.', '• Pin the toowl icon (🧩 → 📌), then click it to open this panel.')}</li>
            <li className="flex gap-1">
              <MousePointerClick className="mt-0.5 size-4 shrink-0" />
              {t('Klik kanan gambar, link, atau halaman → toowl.', 'Right-click an image, link or page → toowl.')}
            </li>
            <li>{t('• Semua diproses di komputermu. Tidak ada yang diunggah.', '• Everything runs on your computer. Nothing is uploaded.')}</li>
          </ul>
        </div>
      )}
      {GROUPS.map((g) => (
        <section key={g.id}>
          <h2 className="mb-2 px-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">{pick(g.title)}</h2>
          <div className="divide-y overflow-hidden rounded-2xl border bg-card">
            {TOOLS.filter((x) => x.group === g.id).map((tool) => (
              <button
                key={tool.slug}
                type="button"
                onClick={() => onOpen(tool.slug)}
                className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/60"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] border bg-background transition-colors group-hover:border-transparent group-hover:bg-brand-fill group-hover:text-brand-ink">
                  <tool.icon className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {pick(tool.title)}
                    {tool.pro && !pro && <span className="rounded-full border px-1.5 font-mono text-[10px] leading-4 text-brand-2">PRO</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{pick(tool.blurb)}</span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ToolScreen({ tool, job, onUpgrade }: { tool: ExtTool; job?: Job; onUpgrade: () => void }) {
  const t = useT()
  const pro = usePro()
  const left = useSavesLeft()
  const gated = tool.pro && pro === false

  // A save from a Pro tool uses one of today's free saves.
  useEffect(() => {
    if (!tool.pro) return
    const onSave = () => {
      if (!proNow()) void useOneSave()
    }
    window.addEventListener('tools:downloaded', onSave)
    return () => window.removeEventListener('tools:downloaded', onSave)
  }, [tool.pro])

  if (pro === undefined) return null
  if (gated && left === 0) return <Upgrade onDone={() => {}} reason={t('Jatah simpan gratis hari ini sudah habis.', "Today's free saves are used up.")} />

  const Component = tool.component
  return (
    <>
      {gated && (
        <button type="button" onClick={onUpgrade} className="mb-3 flex w-full items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left text-xs">
          <Lock className="size-3.5 shrink-0 text-brand-2" />
          <span className="flex-1 text-muted-foreground">
            {t(`Tool Pro: sisa ${left} simpan gratis hari ini.`, `Pro tool: ${left} free ${left === 1 ? 'save' : 'saves'} left today.`)}
          </span>
          <span className="font-medium text-brand-2">{t('Upgrade', 'Upgrade')}</span>
        </button>
      )}
      <ToolBoundary>
        <Suspense
          fallback={
            <div className="grid h-40 place-items-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          }
        >
          {tool.slug === 'qr-generator' ? <Component start={job?.qr} /> : <Component />}
        </Suspense>
      </ToolBoundary>
    </>
  )
}

function Footer() {
  const t = useT()
  return (
    <footer className="border-t px-4 py-3 text-center text-[11px] text-muted-foreground">
      {t('Berjalan 100% di perangkatmu · ', 'Runs 100% on your device · ')}
      <a href="https://toowl.my.id/?ref=chrome" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
        {t('100+ tool lain di toowl.my.id', '100+ more tools at toowl.my.id')}
      </a>
    </footer>
  )
}
