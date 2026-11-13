import { useState } from 'react'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useT } from '@/lib/i18n'
import { monthlyForTarget, num, project, TAX_RATE, type Result } from './savings'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

type Mode = 'lump' | 'regular' | 'target'

function Chart({ result, deposits, label }: { result: Result; deposits: string; label: string }) {
  const W = 600
  const H = 220
  const pad = { l: 8, r: 8, t: 10, b: 20 }
  const rows = result.rows
  const n = rows.length
  const max = Math.max(...rows.map((r) => r.balance), 1)
  const x = (i: number) => pad.l + (n === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (n - 1))
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b)
  const line = (key: 'balance' | 'deposited') => rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r[key]).toFixed(1)}`).join(' ')
  const area = `${line('balance')} L${x(n - 1).toFixed(1)} ${H - pad.b} L${x(0).toFixed(1)} ${H - pad.b} Z`
  return (
    <figure className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full rounded-xl border bg-background">
        <path d={area} className="fill-primary/15" />
        <path d={line('balance')} fill="none" strokeWidth="2.5" className="stroke-primary" />
        <path d={line('deposited')} fill="none" strokeWidth="2" strokeDasharray="5 4" className="stroke-muted-foreground" />
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="stroke-border" />
        <text x={x(0)} y={H - 4} fontSize="11" className="fill-muted-foreground" textAnchor={n === 1 ? 'middle' : 'start'}>{rows[0].year}</text>
        {n > 1 && <text x={x(n - 1)} y={H - 4} fontSize="11" className="fill-muted-foreground" textAnchor="end">{rows[n - 1].year}</text>}
      </svg>
      <figcaption className="flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 bg-primary" />{label}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed border-muted-foreground" />{deposits}</span>
      </figcaption>
    </figure>
  )
}

export default function Tabungan() {
  const t = useT()
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString(locale())}`
  const [mode, setMode] = useState<Mode>('lump')
  const [initial, setInitial] = useState('')
  const [monthly, setMonthly] = useState('')
  const [target, setTarget] = useState('')
  const [rate, setRate] = useState('')
  const [years, setYears] = useState('')
  const [freq, setFreq] = useState('12')
  const [tax, setTax] = useState(false)

  const f = Number(freq)
  const y = num(years)
  const r = num(rate) || 0
  const init = num(initial) || 0
  const needed = mode === 'target' ? monthlyForTarget(num(target), init, r, y, f, tax) : null
  const monthlyUsed = mode === 'lump' ? 0 : mode === 'regular' ? num(monthly) || 0 : needed ?? 0
  const result =
    mode === 'target' && needed === null
      ? null
      : project({ initial: init, monthly: monthlyUsed, ratePct: r, years: y, freq: f, tax })

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Jenis hitungan', 'Calculation')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'lump', label: t('Deposito', 'Lump sum') },
          { value: 'regular', label: t('Nabung rutin', 'Regular saving') },
          { value: 'target', label: t('Target dana', 'Target') },
        ]}
      />

      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        {mode === 'target' ? (
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Target dana (Rp)', 'Target amount (Rp)')}
            <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls} placeholder="100.000.000" />
          </label>
        ) : null}
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {mode === 'lump' ? t('Dana awal (Rp)', 'Principal (Rp)') : t('Dana awal, boleh kosong (Rp)', 'Starting amount, optional (Rp)')}
          <input inputMode="decimal" value={initial} onChange={(e) => setInitial(e.target.value)} className={inputCls} placeholder="10.000.000" />
        </label>
        {mode === 'regular' && (
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Nabung per bulan (Rp)', 'Saved per month (Rp)')}
            <input inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} className={inputCls} placeholder="1.000.000" />
          </label>
        )}
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Bunga per tahun (%)', 'Interest per year (%)')}
          <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} placeholder="5" />
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Lama (tahun)', 'Duration (years)')}
          <input inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} className={inputCls} placeholder="5" />
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Bunga dihitung', 'Interest compounds')}
          <select value={freq} onChange={(e) => setFreq(e.target.value)} className={inputCls}>
            <option value="12">{t('Tiap bulan', 'Monthly')}</option>
            <option value="4">{t('Tiap 3 bulan', 'Quarterly')}</option>
            <option value="2">{t('Tiap 6 bulan', 'Half-yearly')}</option>
            <option value="1">{t('Tiap tahun', 'Yearly')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={tax} onChange={(e) => setTax(e.target.checked)} className="size-4" />
          {t(`Potong pajak bunga ${TAX_RATE * 100}%`, `Deduct ${TAX_RATE * 100}% interest tax`)}
        </label>
      </div>

      {result ? (
        <>
          {mode === 'target' && needed !== null && (
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">{t('Harus nabung per bulan', 'Monthly saving needed')}</p>
              <p className="text-3xl font-semibold tabular-nums">{rp(needed)}</p>
            </div>
          )}
          <div className="grid gap-3 rounded-xl border bg-muted/40 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{t('Total disetor', 'Total deposited')}</p>
              <p className="text-xl font-semibold tabular-nums">{rp(result.deposited)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Bunga didapat', 'Interest earned')}</p>
              <p className="text-xl font-semibold tabular-nums">{rp(result.interest)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Saldo akhir', 'Final balance')}</p>
              <p className="text-xl font-semibold tabular-nums">{rp(result.balance)}</p>
            </div>
          </div>

          <Chart result={result} label={t('Saldo', 'Balance')} deposits={t('Total setoran', 'Deposits')} />

          <div className="max-h-96 overflow-auto rounded-xl border">
            <table className="w-full text-right text-sm tabular-nums">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t('Tahun', 'Year')}</th>
                  <th className="px-3 py-2 font-medium">{t('Setoran', 'Deposited')}</th>
                  <th className="px-3 py-2 font-medium">{t('Bunga', 'Interest')}</th>
                  <th className="px-3 py-2 font-medium">{t('Saldo', 'Balance')}</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.year} className="border-t">
                    <td className="px-3 py-1.5 text-left">{row.year}</td>
                    <td className="px-3 py-1.5">{rp(row.deposited)}</td>
                    <td className="px-3 py-1.5">{rp(row.interest)}</td>
                    <td className="px-3 py-1.5">{rp(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {mode === 'target'
            ? t('Isi target dana dan lama menabung (maksimal 100 tahun).', 'Enter the target and how long you will save (up to 100 years).')
            : t('Isi dana, bunga, dan lama menabung (maksimal 100 tahun).', 'Enter the amount, rate and duration (up to 100 years).')}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Perkiraan, bukan janji hasil. Setoran dianggap masuk di akhir bulan dan bunga ditambahkan sesuai frekuensi yang dipilih. Pajak bunga deposito 20% memotong bunga; suku bunga nyata, biaya, dan inflasi bisa berbeda. Hasil investasi seperti reksa dana atau saham tidak pasti dan tidak dijamin.',
          'An estimate, not a promised return. Deposits are assumed at the end of each month and interest compounds at the chosen frequency. The 20% deposit interest tax reduces the interest; real rates, fees and inflation may differ. Returns from funds or stocks are uncertain and not guaranteed.',
        )}
      </p>
    </div>
  )
}
