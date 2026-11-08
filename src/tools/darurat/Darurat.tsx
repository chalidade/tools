import { useState } from 'react'
import { MapPin, Phone, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { getLang, useT } from '@/lib/i18n'
import { CHECKED_ON, NUMBERS } from './data'
import { locationText, whatsappUrl } from './location'

export default function Darurat() {
  const t = useT()
  const [text, setText] = useState('')
  const [acc, setAcc] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  function locate() {
    setErr('')
    if (!navigator.geolocation) {
      setErr(t('Browser ini tidak punya GPS.', 'This browser has no geolocation.'))
      return
    }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy(false)
        setAcc(p.coords.accuracy)
        setText(locationText(p.coords.latitude, p.coords.longitude, p.coords.accuracy, getLang() === 'id'))
      },
      () => {
        setBusy(false)
        setErr(t('Lokasi tidak bisa dibaca. Izinkan akses lokasi lalu coba lagi.', 'Could not read the location. Allow location access and try again.'))
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  const share = () => navigator.share?.({ text }).catch(() => {})

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-2">
        {NUMBERS.map((n) => (
          <a
            key={n.number}
            href={`tel:${n.number}`}
            className="flex items-center gap-3 rounded-2xl border bg-card p-4 active:scale-[0.99]"
          >
            <Phone className="size-6 shrink-0 text-red-500" />
            <span className="text-3xl font-bold tabular-nums">{n.number}</span>
            <span className="text-sm">
              {t(...n.name)}
              {n.note && <span className="block text-xs text-muted-foreground">{t(...n.note)}</span>}
            </span>
          </a>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t(`Daftar dicek ${CHECKED_ON}; periksa ulang ke sumber resmi.`, `List checked ${CHECKED_ON}; re-check against official sources.`)}
      </p>

      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="font-semibold">{t('Bagikan lokasiku', 'Share my location')}</h2>
        <Button size="lg" onClick={locate} disabled={busy}>
          <MapPin className="mr-2 size-5" /> {busy ? t('Mencari GPS…', 'Finding GPS…') : t('Ambil lokasiku', 'Get my location')}
        </Button>
        {err && <ErrorNote message={err} />}
        {text && (
          <div className="space-y-3">
            <pre className="whitespace-pre-wrap rounded-xl bg-muted p-3 text-sm">{text}</pre>
            {acc > 100 && (
              <p className="text-sm text-amber-500">
                {t('Akurasi rendah. Keluar ruangan atau tunggu lalu ambil ulang.', 'Low accuracy. Go outside or wait, then try again.')}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <CopyButton text={text} variant="outline" />
              {typeof navigator.share === 'function' && (
                <Button variant="secondary" onClick={share}>
                  <Share2 className="mr-2 size-4" /> {t('Bagikan', 'Share')}
                </Button>
              )}
              <a
                href={whatsappUrl(text)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground"
              >
                WhatsApp
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
