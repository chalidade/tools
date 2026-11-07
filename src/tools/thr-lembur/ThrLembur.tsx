import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useT } from '@/lib/i18n'
import { num } from '@/tools/cicilan/loan'
import { hourlyWage, overtimeDay, thr } from './calc'
import { HOURLY_DIVISOR, MAX_OVERTIME_PER_DAY, RULES_AS_OF, RULES_SOURCE, type DayType } from './rules'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface Row {
  id: number
  day: DayType
  hours: string
  days: string
}

let nextId = 2

export default function ThrLembur() {
  const t = useT()
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString(locale())}`
  const fmt = (n: number) => n.toLocaleString(locale(), { maximumFractionDigits: 2 })
  const [mode, setMode] = useState<'thr' | 'lembur'>('thr')
  const [wage, setWage] = useState('')
  const [months, setMonths] = useState('12')
  const [week, setWeek] = useState<5 | 6>(5)
  const [rows, setRows] = useState<Row[]>([{ id: 1, day: 'weekday', hours: '2', days: '1' }])

  const w = num(wage)
  const patch = (id: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)))

  const thrR = thr(w, num(months))
  const calc = rows.map((r) => ({ r, ...overtimeDay(w, r.day, week, num(r.hours)) }))
  const days = (r: Row) => Math.max(1, Math.floor(num(r.days)) || 1)
  const total = calc.reduce((s, c) => s + c.pay * days(c.r), 0)

  const dayLabel = (d: DayType) =>
    d === 'weekday'
      ? t('Hari kerja', 'Working day')
      : d === 'holiday'
        ? t('Hari libur / istirahat mingguan', 'Rest day / public holiday')
        : t('Libur di hari kerja pendek (5 jam)', 'Holiday on a short day (5 h)')

  return (
    <div className="space-y-6">
      <div className="grid max-w-xl gap-4">
        <Segmented
          label={t('Hitung', 'Calculate')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'thr', label: 'THR' },
            { value: 'lembur', label: t('Lembur', 'Overtime') },
          ]}
        />
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Upah sebulan (Rp)', 'Monthly wage (Rp)')}
          <input inputMode="decimal" value={wage} onChange={(e) => setWage(e.target.value)} className={inputCls} placeholder="5.000.000" />
          <span className="block font-normal">{t('Gaji pokok + tunjangan tetap.', 'Base salary + fixed allowances.')}</span>
        </label>

        {mode === 'thr' ? (
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Masa kerja (bulan, dihitung sampai hari H)', 'Months of service (up to the holiday)')}
            <input inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} className={inputCls} />
            <span className="block font-normal">{t('12 bulan atau lebih = THR penuh; 1–11 bulan = prorata.', '12+ months = full THR; 1–11 months = prorated.')}</span>
          </label>
        ) : (
          <>
            <Segmented
              label={t('Hari kerja per minggu', 'Working days per week')}
              value={week}
              onChange={setWeek}
              options={[
                { value: 5, label: t('5 hari', '5 days') },
                { value: 6, label: t('6 hari', '6 days') },
              ]}
            />
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="space-y-2 rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <select value={r.day} onChange={(e) => patch(r.id, { day: e.target.value as DayType })} className={inputCls}>
                      {(['weekday', 'holiday', ...(week === 6 ? ['holidayShort'] : [])] as DayType[]).map((d) => (
                        <option key={d} value={d}>
                          {dayLabel(d)}
                        </option>
                      ))}
                    </select>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        aria-label={t('Hapus baris', 'Remove row')}
                        onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                        className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                      {t('Jam lembur per hari', 'Overtime hours per day')}
                      <input inputMode="decimal" value={r.hours} onChange={(e) => patch(r.id, { hours: e.target.value })} className={inputCls} />
                    </label>
                    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                      {t('Jumlah hari', 'Number of days')}
                      <input inputMode="numeric" value={r.days} onChange={(e) => patch(r.id, { days: e.target.value })} className={inputCls} />
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRows((rs) => [...rs, { id: nextId++, day: 'weekday', hours: '1', days: '1' }])}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <Plus className="size-4" /> {t('Tambah baris', 'Add row')}
              </button>
            </div>
          </>
        )}
      </div>

      {w <= 0 ? (
        <p className="text-sm text-muted-foreground">{t('Isi upah sebulan untuk melihat hasilnya.', 'Enter a monthly wage to see the result.')}</p>
      ) : mode === 'thr' ? (
        <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">{t('Perkiraan THR', 'Estimated THR')}</p>
          <p className="text-3xl font-semibold tabular-nums">{rp(thrR.amount)}</p>
          <p className="text-sm">
            {thrR.fraction === 0
              ? t('Masa kerja kurang dari 1 bulan: belum berhak THR.', 'Under 1 month of service: no THR yet.')
              : thrR.prorated
                ? t(`Prorata: ${Math.floor(num(months))}/12 × ${rp(w)}.`, `Prorated: ${Math.floor(num(months))}/12 × ${rp(w)}.`)
                : t(`THR penuh: 1 × upah sebulan (${rp(w)}).`, `Full THR: 1 × monthly wage (${rp(w)}).`)}
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('Perkiraan upah lembur', 'Estimated overtime pay')}</p>
            <p className="text-3xl font-semibold tabular-nums">{rp(total)}</p>
            <p className="text-xs text-muted-foreground">
              {t(`Upah sejam = ${rp(w)} ÷ ${HOURLY_DIVISOR} = ${rp(hourlyWage(w))}`, `Hourly wage = ${rp(w)} ÷ ${HOURLY_DIVISOR} = ${rp(hourlyWage(w))}`)}
            </p>
          </div>
          {calc.map(({ r, steps, pay }) => (
            <div key={r.id} className="space-y-1">
              <p className="text-sm font-medium">
                {dayLabel(r.day)} · {fmt(num(r.hours))} {t('jam', 'h')} × {days(r)} {t('hari', 'days')}
              </p>
              {steps.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('Isi jam lembur.', 'Enter overtime hours.')}</p>
              ) : (
                <table className="w-full text-sm tabular-nums">
                  <tbody>
                    {steps.map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-1">
                          {fmt(s.hours)} {t('jam', 'h')} × {s.mult}
                        </td>
                        <td className="py-1 text-right">{rp(s.pay)}</td>
                      </tr>
                    ))}
                    <tr className="border-t font-medium">
                      <td className="py-1">{t('Per hari', 'Per day')}</td>
                      <td className="py-1 text-right">{rp(pay)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
              {r.day === 'weekday' && num(r.hours) > MAX_OVERTIME_PER_DAY && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t(`Batas lembur 4 jam per hari (18 jam per minggu).`, `Overtime is capped at 4 hours a day (18 a week).`)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          `Ini perkiraan, bukan nasihat hukum. Aturan per ${RULES_AS_OF} (${RULES_SOURCE}) ada di satu berkas dan perlu diperbarui bila berubah. THR dihitung dari upah sebulan; perusahaan bisa membayar lebih menurut perjanjian kerja. Upah lembur memakai upah sebulan ÷ ${HOURLY_DIVISOR}; pekerjaan tertentu (sektor tertentu, jam kerja khusus) punya aturan sendiri. Jam pecahan dihitung proporsional.`,
          `This is an estimate, not legal advice. Rules as of ${RULES_AS_OF} (${RULES_SOURCE}) live in one file and need updating when they change. THR uses the monthly wage; employers may pay more under the contract. Overtime uses monthly wage ÷ ${HOURLY_DIVISOR}; some sectors and special schedules have their own rules. Fractional hours are counted proportionally.`,
        )}
      </p>
    </div>
  )
}
