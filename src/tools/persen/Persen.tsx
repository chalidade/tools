import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useT } from '@/lib/i18n'
import { parseNumber, percentChange, percentOf, stackedDiscount, whatPercent } from './percent'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

type Mode = 'of' | 'what' | 'change' | 'discount'

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      {label}
      <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder={placeholder} />
    </label>
  )
}

function Result({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-4">
      <p className="text-2xl font-semibold tabular-nums">{children}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default function Persen() {
  const t = useT()
  const fmt = (n: number, max = 2) => n.toLocaleString(locale(), { maximumFractionDigits: max })
  const [mode, setMode] = useState<Mode>('of')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [steps, setSteps] = useState(['', ''])

  const x = parseNumber(a)
  const y = parseNumber(b)
  const both = !Number.isNaN(x) && !Number.isNaN(y)

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Hitungan', 'Calculation')}
        value={mode}
        onChange={(m) => {
          setMode(m)
          setA('')
          setB('')
        }}
        options={[
          { value: 'of', label: t('X% dari Y', 'X% of Y') },
          { value: 'what', label: t('Berapa %', 'What %') },
          { value: 'change', label: t('Naik/turun', 'Change') },
          { value: 'discount', label: t('Diskon', 'Discount') },
        ]}
      />

      {mode === 'of' && (
        <div className="max-w-xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="X (%)" value={a} onChange={setA} placeholder="15" />
            <Field label="Y" value={b} onChange={setB} placeholder="200.000" />
          </div>
          {both && (
            <Result hint={`${fmt(x)}% × ${fmt(y)} ÷ 100`}>{fmt(percentOf(x, y) ?? 0, 4)}</Result>
          )}
        </div>
      )}

      {mode === 'what' && (
        <div className="max-w-xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Y" value={a} onChange={setA} placeholder="30" />
            <Field label="Z" value={b} onChange={setB} placeholder="120" />
          </div>
          {both &&
            (() => {
              const r = whatPercent(x, y)
              return r === null ? (
                <p className="text-sm text-destructive">{t('Z tidak boleh 0.', 'Z cannot be 0.')}</p>
              ) : (
                <Result hint={`${fmt(x)} ÷ ${fmt(y)} × 100`}>{fmt(r, 4)}%</Result>
              )
            })()}
        </div>
      )}

      {mode === 'change' && (
        <div className="max-w-xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Nilai awal', 'From')} value={a} onChange={setA} placeholder="80.000" />
            <Field label={t('Nilai akhir', 'To')} value={b} onChange={setB} placeholder="100.000" />
          </div>
          {both &&
            (() => {
              const r = percentChange(x, y)
              return r === null ? (
                <p className="text-sm text-destructive">{t('Nilai awal tidak boleh 0.', 'The starting value cannot be 0.')}</p>
              ) : (
                <Result hint={`(${fmt(y)} − ${fmt(x)}) ÷ ${fmt(Math.abs(x))} × 100`}>
                  {r >= 0 ? t('Naik', 'Up') : t('Turun', 'Down')} {fmt(Math.abs(r), 4)}%
                </Result>
              )
            })()}
        </div>
      )}

      {mode === 'discount' && (
        <div className="max-w-xl space-y-4">
          <Field label={t('Harga awal', 'Original price')} value={a} onChange={setA} placeholder="500.000" />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('Diskon bertingkat (%)', 'Stacked discounts (%)')}</p>
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  inputMode="decimal"
                  value={s}
                  onChange={(e) => setSteps(steps.map((v, j) => (j === i ? e.target.value : v)))}
                  className={inputCls}
                  placeholder={i === 0 ? '50' : '20'}
                  aria-label={t(`Diskon ${i + 1}`, `Discount ${i + 1}`)}
                />
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                    aria-label={t('Hapus diskon', 'Remove discount')}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {steps.length < 5 && (
              <button
                type="button"
                onClick={() => setSteps([...steps, ''])}
                className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <Plus className="size-4" />
                {t('Tambah diskon', 'Add discount')}
              </button>
            )}
          </div>
          {(() => {
            const price = parseNumber(a)
            const pcts = steps.map(parseNumber).filter((n) => !Number.isNaN(n))
            if (Number.isNaN(price) || pcts.length === 0) return null
            const d = stackedDiscount(price, pcts)
            return (
              <div className="space-y-3">
                <Result hint={t(`Hemat ${fmt(d.saved)} (${fmt(d.combined)}% dari harga awal)`, `You save ${fmt(d.saved)} (${fmt(d.combined)}% off the original)`)}>
                  {fmt(d.final)}
                </Result>
                <div className="overflow-auto rounded-xl border">
                  <table className="w-full text-right text-sm tabular-nums">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">{t('Diskon', 'Discount')}</th>
                        <th className="px-3 py-2 font-medium">{t('Dari', 'From')}</th>
                        <th className="px-3 py-2 font-medium">{t('Hemat', 'Saved')}</th>
                        <th className="px-3 py-2 font-medium">{t('Jadi', 'To')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.steps.map((s, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5 text-left">{fmt(s.percent)}%</td>
                          <td className="px-3 py-1.5">{fmt(s.from)}</td>
                          <td className="px-3 py-1.5">{fmt(s.saved)}</td>
                          <td className="px-3 py-1.5">{fmt(s.to)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'Tiap diskon dihitung dari harga yang tersisa, jadi 50% + 20% = 60% (bukan 70%).',
                    'Each discount applies to the price left by the previous one, so 50% + 20% = 60% (not 70%).',
                  )}
                </p>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
