import { useMemo, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tool/CopyButton'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useT, useLang } from '@/lib/i18n'
import { CATEGORIES, convert, formatResult, parseNumber, type CategoryId } from './units'

const selectCls =
  'w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function UnitConverter() {
  const t = useT()
  const en = useLang() === 'en'
  const [catId, setCatId] = useState<CategoryId>('length')
  const [input, setInput] = useState('1')
  const [from, setFrom] = useState('m')
  const [to, setTo] = useState('cm')

  const cat = CATEGORIES.find((c) => c.id === catId)!
  const name = (n: [string, string]) => (en ? n[1] : n[0])
  const value = parseNumber(input)

  const pick = (id: CategoryId) => {
    const c = CATEGORIES.find((x) => x.id === id)!
    setCatId(id)
    setFrom(c.units[Math.min(2, c.units.length - 1)].id)
    setTo(c.units[Math.min(3, c.units.length - 1)].id)
  }

  const rows = useMemo(
    () =>
      value === null
        ? []
        : cat.units.map((u) => ({ u, text: formatResult(convert(cat, value, from, u.id), locale()) })),
    [cat, value, from],
  )
  const main = rows.find((r) => r.u.id === to)

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Jenis', 'Type')}
        value={catId}
        options={CATEGORIES.map((c) => ({ value: c.id, label: name(c.label) }))}
        onChange={pick}
      />

      <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto_1fr]">
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          {t('Nilai', 'Value')}
          <input
            inputMode="decimal"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-invalid={value === null}
            className={`${selectCls} text-base text-foreground tabular-nums`}
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          {t('Dari', 'From')}
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${selectCls} text-foreground`}>
            {cat.units.map((u) => (
              <option key={u.id} value={u.id}>
                {name(u.name)} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          size="icon"
          aria-label={t('Tukar', 'Swap')}
          onClick={() => {
            setFrom(to)
            setTo(from)
          }}
        >
          <ArrowLeftRight />
        </Button>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          {t('Ke', 'To')}
          <select value={to} onChange={(e) => setTo(e.target.value)} className={`${selectCls} text-foreground`}>
            {cat.units.map((u) => (
              <option key={u.id} value={u.id}>
                {name(u.name)} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
      </div>

      {value === null ? (
        <p className="text-sm text-destructive" role="alert">
          {t('Masukkan angka yang valid, misalnya 12,5.', 'Enter a valid number, for example 12.5.')}
        </p>
      ) : (
        main && (
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 p-4">
            <p className="min-w-0 break-all text-2xl font-semibold tabular-nums">
              {main.text} <span className="text-base font-normal text-muted-foreground">{main.u.symbol}</span>
            </p>
            <CopyButton text={main.text} variant="outline" />
          </div>
        )
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t('Semua satuan', 'All units')}</h3>
          <ul className="divide-y rounded-xl border">
            {rows.map(({ u, text }) => (
              <li key={u.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{name(u.name)}</span>
                <span className="break-all text-right tabular-nums">
                  {text} {u.symbol}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
