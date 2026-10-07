import { Logo } from '@/components/Logo'
import { useT } from '@/lib/i18n'

export function Footer() {
  const t = useT()
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo className="h-5" />
          <span className="text-sm text-muted-foreground">
            {t('Semua diproses di browser — tidak ada yang di-upload.', 'Everything runs in your browser — nothing is uploaded.')}
          </span>
        </div>
        <a
          href="https://github.com/chalidade/tools"
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          github.com/chalidade/tools
        </a>
      </div>
    </footer>
  )
}
