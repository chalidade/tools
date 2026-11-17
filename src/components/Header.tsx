import { Github, LayoutGrid, Moon, Sun } from 'lucide-react'
import { InstallButton } from '@/components/InstallButton'
import { Logo } from '@/components/Logo'
import { useTheme } from '@/lib/use-theme'
import { setLang, useLang, useT } from '@/lib/i18n'
import { getRoute, navigate, pageUrl } from '@/lib/route'
import { cn } from '@/lib/utils'

const REPO = 'https://github.com/chalidade/tools'

const item =
  'flex h-9 items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent'

export function Header() {
  const { theme, toggle } = useTheme()
  const t = useT()
  const lang = useLang()

  return (
    <header className="header-line sticky top-0 z-40 border-b bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href={pageUrl('', lang)} aria-label={t('toowl — beranda', 'toowl — home')} className="rounded-md outline-offset-4">
          <Logo />
        </a>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          <InstallButton />
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
          <button
            type="button"
            onClick={() => {
              // Remember the choice, then move to the same page in that language.
              const next = lang === 'en' ? 'id' : 'en'
              setLang(next)
              navigate(pageUrl(getRoute().slug, next, location.search.slice(1)))
            }}
            aria-label={lang === 'en' ? 'Ganti ke Bahasa Indonesia' : 'Switch to English'}
            title={lang === 'en' ? 'Bahasa Indonesia' : 'English'}
            className="mx-1 flex h-8 items-center rounded-lg border bg-muted/50 p-0.5 font-mono text-[11px] font-medium"
          >
            {(['id', 'en'] as const).map((code) => (
              <span
                key={code}
                className={cn(
                  'grid h-full place-items-center rounded-md px-2 uppercase transition-colors',
                  lang === code ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground',
                )}
              >
                {code}
              </span>
            ))}
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? t('Ganti ke tema terang', 'Switch to light theme') : t('Ganti ke tema gelap', 'Switch to dark theme')}
            className={cn(item, 'w-9 justify-center')}
          >
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
        </nav>
      </div>
    </header>
  )
}
