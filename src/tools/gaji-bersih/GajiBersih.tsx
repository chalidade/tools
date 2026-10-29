import { useState } from 'react'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useT } from '@/lib/i18n'
import { num } from '@/tools/cicilan/loan'
import { netSalary, progressiveTax } from './payroll'
import { MAX_DEPENDENTS, RATES_AS_OF } from './rates'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function GajiBersih() {
  const t = useT()
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString(locale())}`
  const [gross, setGross] = useState('')
  const [married, setMarried] = useState<'single' | 'married'>('single')
  const [dependents, setDependents] = useState(0)
  const [bpjs, setBpjs] = useState(true)

  const g = num(gross)
  const r = g > 0 ? netSalary({ gross: g, married: married === 'married', dependents, bpjs }) : null
  const status = `${married === 'married' ? 'K' : 'TK'}/${dependents}`

  const rows: [string, number][] = r
    ? [
        [t('BPJS Kesehatan (1%)', 'BPJS Kesehatan (1%)'), r.kesEmployee],
        [t('JHT (2%)', 'JHT (2%)'), r.jhtEmployee],
        [t('Jaminan Pensiun (1%)', 'Pension (JP, 1%)'), r.jpEmployee],
        [t('PPh 21 per bulan', 'PPh 21 per month'), r.taxMonth],
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="grid max-w-xl gap-4">
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Gaji bruto per bulan (Rp)', 'Gross salary per month (Rp)')}
          <input inputMode="decimal" value={gross} onChange={(e) => setGross(e.target.value)} className={inputCls} placeholder="10.000.000" />
          <span className="block font-normal">{t('Gaji pokok + tunjangan tetap.', 'Base salary + fixed allowances.')}</span>
        </label>
        <Segmented
          label={t('Status', 'Status')}
          value={married}
          onChange={setMarried}
          options={[
            { value: 'single', label: t('Lajang (TK)', 'Single (TK)') },
            { value: 'married', label: t('Menikah (K)', 'Married (K)') },
          ]}
        />
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Tanggungan (anak/keluarga, maks. 3)', 'Dependents (max. 3)')}
          <select value={dependents} onChange={(e) => setDependents(Number(e.target.value))} className={inputCls}>
            {Array.from({ length: MAX_DEPENDENTS + 1 }, (_, n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={bpjs} onChange={(e) => setBpjs(e.target.checked)} className="size-4" />
          {t('Ikut BPJS Kesehatan & Ketenagakerjaan', 'Enrolled in BPJS health & employment')}
        </label>
      </div>

      {r ? (
        <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('Perkiraan gaji bersih per bulan', 'Estimated take-home pay per month')}</p>
            <p className="text-3xl font-semibold tabular-nums">{rp(r.takeHome)}</p>
          </div>
          <table className="w-full text-sm tabular-nums">
            <tbody>
              <tr>
                <td className="py-1">{t('Gaji bruto', 'Gross salary')}</td>
                <td className="py-1 text-right">{rp(r.gross)}</td>
              </tr>
              {rows.map(([label, v]) => (
                <tr key={label} className="border-t">
                  <td className="py-1">− {label}</td>
                  <td className="py-1 text-right">{rp(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>{t(`PTKP ${status} = ${rp(r.ptkp)} per tahun.`, `PTKP ${status} = ${rp(r.ptkp)} per year.`)}</li>
            <li>{t(`Penghasilan kena pajak setahun = ${rp(r.taxableYear)}.`, `Annual taxable income = ${rp(r.taxableYear)}.`)}</li>
            <li>{t(`PPh 21 setahun = ${rp(progressiveTax(r.taxableYear))} (tarif 5%/15%/25%/30%/35%), rata-rata ${r.effectivePct.toFixed(2)}% dari bruto.`, `Annual PPh 21 = ${rp(progressiveTax(r.taxableYear))} (5%/15%/25%/30%/35% brackets), averaging ${r.effectivePct.toFixed(2)}% of gross.`)}</li>
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('Isi gaji bruto untuk melihat perkiraan gaji bersih.', 'Enter a gross salary to see the estimate.')}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          `Ini perkiraan, bukan nasihat pajak. Pajak dihitung dari penghasilan setahun penuh (tarif Pasal 17, biaya jabatan 5% maks. Rp500 ribu/bulan, PTKP), lalu dirata-rata per bulan; potongan bulanan resmi memakai tabel TER dan bisa berbeda sampai penyesuaian Desember. Premi BPJS yang dibayar pemberi kerja dihitung sebagai penghasilan. Tidak termasuk bonus, THR, lembur, dan tambahan 20% bila tanpa NPWP. Tarif dan batas upah (per ${RATES_AS_OF}) ada di satu berkas sumber dan perlu diperbarui bila aturan berubah.`,
          `This is an estimate, not tax advice. Tax is computed on a full year’s income (Article 17 brackets, job-cost deduction of 5% up to Rp500k/month, PTKP) and averaged per month; official monthly withholding uses TER tables and may differ until the December true-up. Employer-paid BPJS premiums count as income. Bonuses, THR, overtime and the 20% surcharge without a tax ID are not included. Rates and wage ceilings (as of ${RATES_AS_OF}) live in one source file and need updating when the rules change.`,
        )}
      </p>
    </div>
  )
}
