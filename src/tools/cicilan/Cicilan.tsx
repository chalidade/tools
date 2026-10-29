import { useState } from 'react'
import { Download } from 'lucide-react'
import { Segmented } from '@/components/tool/Segmented'
import { downloadBlob } from '@/lib/download'
import { locale, useT } from '@/lib/i18n'
import { buildLoan, loanCsv, num, type Method } from './loan'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function Cicilan() {
  const t = useT()
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString(locale())}`
  const [method, setMethod] = useState<Method>('annuity')
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState('')
  const [term, setTerm] = useState('')
  const [unit, setUnit] = useState<'months' | 'years'>('months')

  const months = Math.round(num(term) * (unit === 'years' ? 12 : 1))
  const loan = buildLoan(num(amount), num(rate), months, method)

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Jenis bunga', 'Interest type')}
        value={method}
        onChange={setMethod}
        options={[
          { value: 'annuity', label: t('Anuitas (efektif)', 'Annuity (effective)') },
          { value: 'flat', label: 'Flat' },
        ]}
      />

      <div className="grid max-w-xl gap-4">
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Jumlah pinjaman (Rp)', 'Loan amount (Rp)')}
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="100.000.000" />
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Bunga per tahun (%)', 'Interest per year (%)')}
          <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} placeholder="12" />
        </label>
        <div className="space-y-2">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Tenor', 'Term')}
            <input inputMode="numeric" value={term} onChange={(e) => setTerm(e.target.value)} className={inputCls} placeholder="12" />
          </label>
          <Segmented
            label={t('Satuan tenor', 'Term unit')}
            value={unit}
            onChange={setUnit}
            options={[
              { value: 'months', label: t('Bulan', 'Months') },
              { value: 'years', label: t('Tahun', 'Years') },
            ]}
          />
        </div>
      </div>

      {loan ? (
        <>
          <div className="grid gap-3 rounded-xl border bg-muted/40 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{t('Angsuran per bulan', 'Monthly payment')}</p>
              <p className="text-2xl font-semibold tabular-nums">{rp(loan.monthly)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Total bunga', 'Total interest')}</p>
              <p className="text-2xl font-semibold tabular-nums">{rp(loan.totalInterest)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Total dibayar', 'Total paid')}</p>
              <p className="text-2xl font-semibold tabular-nums">{rp(loan.totalPaid)}</p>
            </div>
          </div>
          {method === 'annuity' && (
            <p className="text-xs text-muted-foreground">
              {t('Angsuran sama tiap bulan; porsi bunga turun, porsi pokok naik.', 'Equal payments each month; the interest share falls and the principal share rises.')}
            </p>
          )}

          <button
            type="button"
            onClick={() => downloadBlob(new Blob(['﻿', loanCsv(loan.rows)], { type: 'text/csv;charset=utf-8' }), 'angsuran.csv')}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Download className="size-4" />
            {t('Unduh tabel (CSV)', 'Download table (CSV)')}
          </button>

          <div className="max-h-96 overflow-auto rounded-xl border">
            <table className="w-full text-right text-sm tabular-nums">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t('Bulan', 'Month')}</th>
                  <th className="px-3 py-2 font-medium">{t('Angsuran', 'Payment')}</th>
                  <th className="px-3 py-2 font-medium">{t('Pokok', 'Principal')}</th>
                  <th className="px-3 py-2 font-medium">{t('Bunga', 'Interest')}</th>
                  <th className="px-3 py-2 font-medium">{t('Sisa', 'Balance')}</th>
                </tr>
              </thead>
              <tbody>
                {loan.rows.map((r) => (
                  <tr key={r.month} className="border-t">
                    <td className="px-3 py-1.5 text-left">{r.month}</td>
                    <td className="px-3 py-1.5">{rp(r.payment)}</td>
                    <td className="px-3 py-1.5">{rp(r.principal)}</td>
                    <td className="px-3 py-1.5">{rp(r.interest)}</td>
                    <td className="px-3 py-1.5">{rp(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t('Isi jumlah pinjaman, bunga, dan tenor untuk melihat angsuran.', 'Enter the amount, rate and term to see the instalments.')}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Flat: bunga dihitung dari pokok awal selama tenor, jadi angsuran = (pokok + pokok × bunga × tahun) ÷ bulan. Anuitas: bunga dihitung dari sisa pokok. Biaya provisi, asuransi, dan denda tidak termasuk; angka bank bisa berbeda tipis karena pembulatan.',
          'Flat: interest is charged on the original principal for the whole term, so payment = (principal + principal × rate × years) ÷ months. Annuity: interest is charged on the remaining balance. Fees, insurance and penalties are not included; a bank’s figures may differ slightly due to rounding.',
        )}
      </p>
    </div>
  )
}
