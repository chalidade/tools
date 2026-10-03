import { Github, Moon, Sun } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useTheme } from '@/lib/use-theme'

const REPO = 'https://github.com/chalidade/tools'

export function Header() {
  const { theme, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <a href="#/" aria-label="Tools — beranda" className="rounded-md outline-offset-4">
          <Logo />
        </a>

        <nav className="flex items-center gap-1">
          <a
            href="#/"
            className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Semua tools
          </a>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            aria-label="Kode sumber di GitHub"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Github className="size-[18px]" />
          </a>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
        </nav>
      </div>
    </header>
  )
}
