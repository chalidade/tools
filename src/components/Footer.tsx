import { Coffee, Github, Shield } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { SUPPORT_URL } from '@/components/SupportToast'
import { useT } from '@/lib/i18n'
import { isNativeApp } from '@/lib/native'

const link = 'inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground'

/** `quiet` drops the privacy line: a tool page already says it right under the tool. */
export function Footer({ className, quiet = false }: { className?: string; quiet?: boolean }) {
  const t = useT()
  return (
    <footer className={className}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 border-t px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Logo className="h-6" />
          {!quiet && (
            <span className="font-mono text-xs text-muted-foreground">
              {t('Semua diproses di browser · tidak ada yang di-upload', 'Everything runs in your browser · nothing is uploaded')}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <a href={`${import.meta.env.BASE_URL}privacy/`} rel="external" className={link}>
            <Shield className="size-4" />
            {t('Privasi', 'Privacy')}
          </a>
          {/* No tip link in the iOS app: App Store rules allow only in-app purchase there. */}
          {!isNativeApp() && (
            <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className={link}>
              <Coffee className="size-4" />
              {t('Traktir kopi', 'Buy me a coffee')}
            </a>
          )}
          <a href="https://github.com/chalidade/tools" target="_blank" rel="noreferrer" className={link}>
            <Github className="size-4" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
