import { Github, Languages, Moon, Sun } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useTheme } from '@/lib/use-theme'
import { setLang, useLang, useT } from '@/lib/i18n'

const REPO = 'https://github.com/chalidade/tools'

export function Header() {
  const { theme, toggle } = useTheme()
  const t = useT()
  const lang = useLang()

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <a href="#/" aria-label={t('Tools — beranda', 'Tools — home')} className="rounded-md outline-offset-4">
          <Logo />
        </a>

        <nav className="flex items-center gap-1">
          <a
            href="#/"
            className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            {t('Semua tools', 'All tools')}
          </a>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            aria-label={t('Kode sumber di GitHub', 'Source code on GitHub')}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Github className="size-[18px]" />
          </a>
          {/* Language: shows the one you'd switch to. */}
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
            aria-label={lang === 'en' ? 'Ganti ke Bahasa Indonesia' : 'Switch to English'}
            title={lang === 'en' ? 'Bahasa Indonesia' : 'English'}
            className="flex h-9 items-center gap-1 rounded-lg px-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Languages className="size-4" />
            <span className={lang === 'id' ? 'font-semibold text-foreground' : ''}>ID</span>
            <span aria-hidden className="opacity-40">/</span>
            <span className={lang === 'en' ? 'font-semibold text-foreground' : ''}>EN</span>
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? t('Ganti ke tema terang', 'Switch to light theme') : t('Ganti ke tema gelap', 'Switch to dark theme')}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
        </nav>
      </div>
    </header>
  )
}
