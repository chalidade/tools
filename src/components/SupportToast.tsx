import { useEffect, useState } from 'react'
import { Coffee, X } from 'lucide-react'
import { useT } from '@/lib/i18n'

export const SUPPORT_URL = 'https://trakteer.id/chalidade/tip'
const SEEN = 'tools:support-seen'

// After the first file a visitor saves in a session, a small note asks for a
// coffee — the moment the site has just been useful. Once per session, and
// only a plain link: no Trakteer script, so nothing tracks the visitor.
export function SupportToast() {
  const t = useT()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let timer = 0
    const onSave = () => {
      try {
        if (sessionStorage.getItem(SEEN)) return
        sessionStorage.setItem(SEEN, '1')
      } catch {
        // Storage blocked: still show it, at most once while this page lives.
      }
      window.removeEventListener('tools:downloaded', onSave)
      timer = window.setTimeout(() => setOpen(true), 1200)
    }
    window.addEventListener('tools:downloaded', onSave)
    return () => {
      window.removeEventListener('tools:downloaded', onSave)
      clearTimeout(timer)
    }
  }, [])

  if (!open) return null
  return (
    <div role="status" className="blur-in fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-card/95 p-3 pl-4 shadow-xl backdrop-blur-xl sm:bottom-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white">
        <Coffee className="size-4" />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{t('File tersimpan.', 'File saved.')}</span>{' '}
        <span className="text-muted-foreground">{t('Terbantu? Traktir kopi biar tools ini terus gratis.', 'Helpful? A coffee keeps these tools free.')}</span>
      </p>
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noreferrer"
        onClick={() => setOpen(false)}
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t('Traktir', 'Support')}
      </a>
      <button
        type="button"
        aria-label={t('Tutup', 'Close')}
        onClick={() => setOpen(false)}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
