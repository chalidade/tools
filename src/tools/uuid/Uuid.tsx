import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { Segmented } from '@/components/tool/Segmented'
import { useT } from '@/lib/i18n'
import { generate } from './uuid'

export default function Uuid() {
  const t = useT()
  const [version, setVersion] = useState<'v4' | 'v7'>('v4')
  const [count, setCount] = useState(5)
  const [upper, setUpper] = useState(false)
  const [hyphens, setHyphens] = useState(true)
  const [braces, setBraces] = useState(false)
  const [nonce, setNonce] = useState(0)

  const ids = useMemo(
    () => generate({ version, count, upper, hyphens, braces }),
    // nonce re-rolls the list on demand
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, count, upper, hyphens, braces, nonce],
  )
  const text = ids.join('\n')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label={t('Versi', 'Version')}
          value={version}
          onChange={setVersion}
          options={[
            { value: 'v4', label: 'v4 (acak)' },
            { value: 'v7', label: 'v7 (urut waktu)' },
          ]}
        />
        <label className="space-y-2 text-xs font-medium text-muted-foreground">
          <span className="block">{t('Jumlah (1–1000)', 'Count (1–1000)')}</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(Math.min(1000, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
            className="w-28 rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} />
          {t('HURUF BESAR', 'UPPERCASE')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hyphens} onChange={(e) => setHyphens(e.target.checked)} />
          {t('Tanda hubung', 'Hyphens')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={braces} onChange={(e) => setBraces(e.target.checked)} />
          {'{ }'}
        </label>
      </div>
      <textarea
        readOnly
        value={text}
        rows={Math.min(14, Math.max(3, ids.length))}
        aria-label="UUID"
        className="w-full resize-y rounded-xl border bg-background p-3 font-mono text-sm outline-none"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setNonce((n) => n + 1)}>
          <RefreshCw />
          {t('Buat lagi', 'Regenerate')}
        </Button>
        <CopyButton text={text} variant="outline" label={ids.length > 1 ? t('Salin semua', 'Copy all') : undefined} />
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          'v4 murni acak. v7 diawali cap waktu milidetik sehingga bisa diurutkan, cocok untuk kunci database. Semua dibuat di perangkatmu dengan crypto.getRandomValues.',
          'v4 is pure random. v7 starts with a millisecond timestamp so it sorts by creation time, good for database keys. All generated on your device with crypto.getRandomValues.',
        )}
      </p>
    </div>
  )
}
