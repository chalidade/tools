import { useState } from 'react'
import { ChevronLeft, Code2, Ellipsis, Github, LayoutGrid, Moon, Sun, Workflow } from 'lucide-react'
import { InstallButton } from '@/components/InstallButton'
import { Logo } from '@/components/Logo'
import { useTheme } from '@/lib/use-theme'
import { setLang, useLang, useT, type Lang } from '@/lib/i18n'
import { getRoute, navigate, pageUrl } from '@/lib/route'
import { toolText, type Tool } from '@/tools/registry'
import { apifyProfileUrl } from '@/lib/apify'
import { cn } from '@/lib/utils'
import { isNativeApp } from '@/lib/native'
import { isPlayApp } from '@/lib/platform'

const REPO = 'https://github.com/chalidade/tools'

const item =
  'flex h-9 items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent'
const square = 'grid size-9.5 place-items-center rounded-[0.75rem] border bg-card text-muted-foreground active:bg-accent'

/** Remember the choice, then move to the same page in that language. */
function switchLang(lang: Lang) {
  const next = lang === 'en' ? 'id' : 'en'
  setLang(next)
  navigate(pageUrl(getRoute().slug, next, location.search.slice(1)))
}

function LangSwitch({ className }: { className?: string }) {
  const lang = useLang()
  return (
    <button
      type="button"
      onClick={() => switchLang(lang)}
      aria-label={lang === 'en' ? 'Ganti ke Bahasa Indonesia' : 'Switch to English'}
      title={lang === 'en' ? 'Bahasa Indonesia' : 'English'}
      className={cn(item, 'gap-1.5 px-2 font-mono text-xs', className)}
    >
      <span className={lang === 'id' ? 'text-foreground' : ''}>ID</span>
      <span aria-hidden className="opacity-40">/</span>
      <span className={lang === 'en' ? 'text-foreground' : ''}>EN</span>
    </button>
  )
}

/**
 * The site header. On a phone a tool page gets an app bar instead — back,
 * the tool's name, and a "more" menu holding what the full header shows —
 * so the tool itself starts right under it.
 */
export function Header({ tool }: { tool?: Tool }) {
  const { theme, toggle } = useTheme()
  const t = useT()
  const lang = useLang()
  const [menu, setMenu] = useState(false)
  // The licenses page sells outside the stores: not linked inside the apps.
  const forSites = !isNativeApp() && !isPlayApp()
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  const themeLabel = theme === 'dark' ? t('Tema terang', 'Light theme') : t('Tema gelap', 'Dark theme')

  return (
    <header className="header-line sticky top-0 z-40 border-b bg-background/85 backdrop-blur-lg">
      {tool && (
        <div className="flex h-14 items-center gap-3 px-3 lg:hidden">
          <a href={pageUrl('', lang)} aria-label={t('Kembali ke beranda', 'Back to home')} className={square}>
            <ChevronLeft className="size-5" />
          </a>
          <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold tracking-tight">{toolText(tool, lang).title}</h1>
          <div className="relative">
            <button type="button" aria-label={t('Menu', 'Menu')} aria-expanded={menu} onClick={() => setMenu((m) => !m)} className={square}>
              <Ellipsis className="size-5" />
            </button>
            {menu && (
              <>
                <button type="button" aria-label={t('Tutup menu', 'Close menu')} className="fixed inset-0 z-40 cursor-default" onClick={() => setMenu(false)} />
                <div className="rise-in absolute top-12 right-0 z-50 w-56 rounded-2xl border bg-popover p-1.5 text-sm shadow-xl" onClick={() => setMenu(false)}>
                  <a href={pageUrl('all', lang)} className="flex h-11 items-center gap-3 rounded-xl px-3 active:bg-accent">
                    <LayoutGrid className="size-4 text-muted-foreground" />
                    {t('Semua tools', 'All tools')}
                  </a>
                  {forSites && (
                    <a href={pageUrl('embed', lang)} className="flex h-11 items-center gap-3 rounded-xl px-3 active:bg-accent">
                      <Code2 className="size-4 text-muted-foreground" />
                      {t('Untuk website', 'For websites')}
                    </a>
                  )}
                  {forSites && apifyProfileUrl() && (
                    <a href={pageUrl('api', lang)} className="flex h-11 items-center gap-3 rounded-xl px-3 active:bg-accent">
                      <Workflow className="size-4 text-muted-foreground" />
                      {t('API untuk developer', 'API for developers')}
                    </a>
                  )}
                  <button type="button" onClick={() => switchLang(lang)} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 active:bg-accent">
                    <span className="w-4 text-center font-mono text-[10px] text-muted-foreground">{lang === 'en' ? 'ID' : 'EN'}</span>
                    {lang === 'en' ? 'Bahasa Indonesia' : 'English'}
                  </button>
                  <button type="button" onClick={toggle} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 active:bg-accent">
                    <ThemeIcon className="size-4 text-muted-foreground" />
                    {themeLabel}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className={cn('mx-auto h-14 max-w-6xl items-center justify-between px-4 sm:px-6', tool ? 'hidden lg:flex' : 'flex')}>
        <a href={pageUrl('', lang)} aria-label={t('toowl — beranda', 'toowl — home')} className="rounded-md outline-offset-4">
          <Logo />
        </a>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          <InstallButton />
          {forSites && (
            <a href={pageUrl('embed', lang)} aria-label={t('Untuk website', 'For websites')} className={cn(item, 'gap-2 px-2.5 text-sm sm:px-3')}>
              <Code2 className="size-[18px] sm:size-4" />
              <span className="hidden sm:inline">{t('Untuk website', 'For websites')}</span>
            </a>
          )}
          {forSites && apifyProfileUrl() && (
            <a href={pageUrl('api', lang)} aria-label="API" className={cn(item, 'gap-2 px-2.5 text-sm max-sm:hidden sm:px-3')}>
              <Workflow className="size-4" />
              <span>API</span>
            </a>
          )}
          <a href={pageUrl('all', lang)} aria-label={t('Semua tools', 'All tools')} className={cn(item, 'gap-2 px-2.5 text-sm sm:px-3')}>
            <LayoutGrid className="size-[18px] sm:size-4" />
            <span className="hidden sm:inline">{t('Semua tools', 'All tools')}</span>
          </a>
          {/* The footer links to the code too, so a phone keeps its header short. */}
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            aria-label={t('Kode sumber di GitHub', 'Source code on GitHub')}
            className={cn(item, 'hidden w-9 justify-center sm:flex')}
          >
            <Github className="size-[18px]" />
          </a>
          <LangSwitch />
          <button type="button" onClick={toggle} aria-label={themeLabel} className={cn(item, 'w-9 justify-center')}>
            <ThemeIcon className="size-[18px]" />
          </button>
        </nav>
      </div>
    </header>
  )
}
