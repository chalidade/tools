import { Coffee, Github } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { SUPPORT_URL } from '@/components/SupportToast'
import { useT } from '@/lib/i18n'

const link = 'inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground'

export function Footer() {
  const t = useT()
  return (
    <footer className="border-t pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Logo className="text-base" />
          <span className="text-sm text-muted-foreground">
            {t('Semua diproses di browser — tidak ada yang di-upload.', 'Everything runs in your browser — nothing is uploaded.')}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className={link}>
            <Coffee className="size-4" />
            {t('Traktir kopi', 'Buy me a coffee')}
          </a>
          <a href="https://github.com/chalidade/tools" target="_blank" rel="noreferrer" className={link}>
            <Github className="size-4" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
