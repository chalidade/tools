import { useState } from 'react'
import { Download, Share, SquarePlus, X } from 'lucide-react'
import { promptInstall, useInstall } from '@/lib/install'
import { useT } from '@/lib/i18n'

/** "Install app" in the header: the browser's own dialog, or the iOS steps. */
export function InstallButton() {
  const t = useT()
  const mode = useInstall()
  const [help, setHelp] = useState(false)
  if (!mode) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (mode === 'prompt' ? void promptInstall() : setHelp((h) => !h))}
        className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">{t('Pasang aplikasi', 'Install app')}</span>
        <span className="sr-only min-[420px]:not-sr-only sm:hidden">{t('Pasang', 'Install')}</span>
      </button>
      {help && (
        <div className="absolute top-11 right-0 z-50 w-72 rounded-2xl border bg-card p-4 text-sm shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{t('Pasang di iPhone / iPad', 'Install on iPhone / iPad')}</p>
            <button type="button" aria-label={t('Tutup', 'Close')} onClick={() => setHelp(false)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <ol className="mt-3 space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="font-mono text-xs">1.</span> {t('Buka situs ini di Safari.', 'Open this site in Safari.')}
            </li>
            <li className="flex items-center gap-2">
              <span className="font-mono text-xs">2.</span> {t('Ketuk', 'Tap')} <Share className="size-4 text-foreground" /> {t('(Bagikan).', '(Share).')}
            </li>
            <li className="flex items-center gap-2">
              <span className="font-mono text-xs">3.</span> {t('Pilih', 'Choose')} <SquarePlus className="size-4 text-foreground" />{' '}
              {t('Tambahkan ke Layar Utama.', 'Add to Home Screen.')}
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}
