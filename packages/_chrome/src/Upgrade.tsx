import { useState } from 'react'
import { Check, Crown, Loader2 } from 'lucide-react'
import { useLang, useT } from '@/lib/i18n'
import { PRO, buyUrl, canActivate, canBuy } from './config'
import { activate, deactivate, savedKey, usePro } from './license'
import { TOOLS } from './tools'

/** Price, what Pro opens, buy button and the key field; or, with Pro on, the key in use. */
export function Upgrade({ onDone, reason }: { onDone: () => void; reason?: string }) {
  const t = useT()
  const lang = useLang()
  const pro = usePro()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const proTools = TOOLS.filter((x) => x.pro)

  async function submit() {
    setBusy(true)
    setError('')
    const r = await activate(key)
    setBusy(false)
    if (r.ok) onDone()
    else setError(r.reason ?? t('Kunci tidak valid.', 'Invalid key.'))
  }

  if (pro)
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-4">
          <p className="flex items-center gap-2 font-medium">
            <Crown className="size-4 text-brand-2" /> {t('toowl Pro aktif', 'toowl Pro is active')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t('Semua tool terbuka tanpa batas. Terima kasih sudah mendukung!', 'Every tool, no limits. Thanks for your support!')}</p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">{savedKey().replace(/^(.{8}).*(.{4})$/, '$1…$2')}</p>
        </div>
        <button type="button" onClick={() => void deactivate()} className="text-xs text-muted-foreground underline underline-offset-2">
          {t('Lepas kunci dari perangkat ini', 'Remove the key from this device')}
        </button>
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4">
        {reason && <p className="mb-2 text-sm text-brand-2">{reason}</p>}
        <p className="flex items-center gap-2 text-lg font-semibold">
          <Crown className="size-5 text-brand-2" /> toowl Pro
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            `Free: ${PRO.freeSavesPerDay} simpan per hari dari tool Pro. Pro: tanpa batas, semua tool.`,
            `Free: ${PRO.freeSavesPerDay} saves a day from Pro tools. Pro: unlimited, every tool.`,
          )}
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-1 text-sm min-[380px]:grid-cols-2">
          {proTools.map((x) => (
            <li key={x.slug} className="flex items-center gap-1.5">
              <Check className="size-3.5 shrink-0 text-brand-2" /> {lang === 'en' ? x.title[1] : x.title[0]}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <Check className="size-3.5 shrink-0 text-brand-2" /> {t('Tool baru berikutnya', 'Every new tool')}
          </li>
        </ul>
        <p className="mt-4 text-sm font-medium">{lang === 'en' ? PRO.price[1] : PRO.price[0]}</p>
        {canBuy() ? (
          <a
            href={buyUrl()}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex h-10 items-center justify-center rounded-xl bg-brand-fill text-sm font-semibold text-brand-ink"
          >
            {t('Beli toowl Pro', 'Get toowl Pro')}
          </a>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed p-2 text-center text-xs text-muted-foreground">{t('Segera dijual.', 'On sale soon.')}</p>
        )}
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {t('File tetap diproses di perangkatmu. Kunci dikirim lewat email.', 'Files still stay on your device. The key arrives by email.')}
        </p>
      </div>

      {canActivate() && (
        <form
          className="rounded-2xl border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (key.trim() && !busy) void submit()
          }}
        >
          <label className="text-sm font-medium" htmlFor="key">
            {t('Sudah punya kunci lisensi?', 'Have a license key?')}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="XXXXXXXX-XXXXXXXX-…"
              spellCheck={false}
              autoComplete="off"
              className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2.5 font-mono text-xs outline-none focus:border-brand-2"
            />
            <button type="submit" disabled={busy || !key.trim()} className="flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm disabled:opacity-50">
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {t('Aktifkan', 'Activate')}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t('Kunci All-Access toowl juga bisa dipakai di sini.', 'toowl All-Access keys work here too.')}
          </p>
        </form>
      )}
    </div>
  )
}
