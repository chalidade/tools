import { useState } from 'react'
import { Download } from 'lucide-react'
import { downloadBlob } from '@/lib/download'
import { locale, useLang, useT } from '@/lib/i18n'
import { parseNumber } from '@/tools/persen/percent'
import { buildMortgage, maxPrice, MAX_YEARS, mortgageCsv } from './mortgage'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Like cicilan's num(), but keeps 0 (a 0% down payment or 0 fixed years is a real answer). */
const num = (s: string) => {
  const n = parseNumber(s)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

/** Share of income banks usually allow for the instalment. */
const SHARE = 0.3

export default function Kpr() {
  const t = useT()
  const lang = useLang()
  // Indonesian pages count in rupiah; the English page is currency-neutral for visitors elsewhere.
  const money = (n: number) => `${lang === 'id' ? 'Rp ' : ''}${Math.round(n).toLocaleString(locale())}`
  const [price, setPrice] = useState(lang === 'id' ? '500.000.000' : '400,000')
  const [down, setDown] = useState(lang === 'id' ? '10' : '20')
  const [years, setYears] = useState(lang === 'id' ? '20' : '30')
  const [fixedRate, setFixedRate] = useState(lang === 'id' ? '5' : '6')
  const [fixedYears, setFixedYears] = useState(lang === 'id' ? '3' : '5')
  const [floatRate, setFloatRate] = useState(lang === 'id' ? '11' : '7')
  const [income, setIncome] = useState('')

  const terms = { downPct: num(down), years: num(years), fixedRate: num(fixedRate), fixedYears: num(fixedYears), floatRate: num(floatRate) }
  const m = buildMortgage({ price: num(price), ...terms })
  const pay = num(income)
  const highest = m ? Math.max(m.fixedPayment, m.floatPayment ?? 0) : 0
  const afford = pay > 0 && m ? maxPrice(pay, SHARE, terms) : null

  const field = (label: string, value: string, set: (v: string) => void, hint?: string, mode: 'decimal' | 'numeric' = 'decimal') => (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      {label}
      <input inputMode={mode} value={value} onChange={(e) => set(e.target.value)} className={inputCls} />
      {hint && <span className="block font-normal">{hint}</span>}
    </label>
  )

  return (
    <div className="space-y-6">
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        {field(t('Harga rumah (Rp)', 'Home price'), price, setPrice)}
        {field(t('Uang muka / DP (%)', 'Down payment (%)'), down, setDown, m ? `= ${money(m.down)}` : undefined)}
        {field(t('Tenor (tahun)', 'Term (years)'), years, setYears, t(`Paling lama ${MAX_YEARS} tahun.`, `Up to ${MAX_YEARS} years.`), 'numeric')}
        {field(t('Bunga fix per tahun (%)', 'Fixed rate per year (%)'), fixedRate, setFixedRate)}
        {field(t('Masa bunga fix (tahun)', 'Fixed period (years)'), fixedYears, setFixedYears, t('Isi 0 bila langsung floating.', 'Enter 0 for a variable rate from the start.'), 'numeric')}
        {field(t('Bunga floating setelahnya (%)', 'Rate after the fixed period (%)'), floatRate, setFloatRate, t('Perkiraanmu; bank menentukannya nanti.', 'Your estimate; the lender sets it later.'))}
        {field(t('Penghasilan per bulan (opsional)', 'Monthly income (optional)'), income, setIncome, t('Untuk cek kemampuan bayar.', 'To check affordability.'))}
      </div>

      {m ? (
        <>
          <div className="grid gap-3 rounded-xl border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t('Pokok pinjaman', 'Loan amount')} value={money(m.loan)} />
            <Stat
              label={m.floatPayment === null ? t('Angsuran per bulan', 'Monthly payment') : t(`Angsuran ${terms.fixedYears} tahun pertama`, `Payment, first ${terms.fixedYears} years`)}
              value={money(m.fixedPayment)}
            />
            {m.floatPayment !== null && <Stat label={t('Angsuran setelah floating', 'Payment after the fixed period')} value={money(m.floatPayment)} />}
            <Stat label={t('Total bunga', 'Total interest')} value={money(m.totalInterest)} />
            <Stat label={t('Total dibayar (tanpa DP)', 'Total repaid (excl. down payment)')} value={money(m.totalPaid)} />
          </div>

          {pay > 0 ? (
            <p className={`rounded-xl border p-4 text-sm ${highest <= pay * SHARE ? '' : 'border-destructive/50'}`}>
              {highest <= pay * SHARE
                ? t(
                    `Angsuran tertinggi ${money(highest)} = ${((highest / pay) * 100).toFixed(0)}% penghasilan, masih di bawah batas umum bank 30%.`,
                    `The highest payment, ${money(highest)}, is ${((highest / pay) * 100).toFixed(0)}% of income — under the usual 30% limit.`,
                  )
                : t(
                    `Angsuran tertinggi ${money(highest)} = ${((highest / pay) * 100).toFixed(0)}% penghasilan, di atas batas umum bank 30%.`,
                    `The highest payment, ${money(highest)}, is ${((highest / pay) * 100).toFixed(0)}% of income — above the usual 30% limit.`,
                  )}{' '}
              {afford !== null &&
                t(
                  `Dengan DP dan bunga ini, harga rumah yang terjangkau sekitar ${money(afford)}.`,
                  `With this down payment and rate, an affordable price is about ${money(afford)}.`,
                )}{' '}
              {t(`Penghasilan minimal untuk angsuran ini: ${money(highest / SHARE)}.`, `Minimum income for this payment: ${money(highest / SHARE)}.`)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(
                `Supaya angsuran tertinggi tidak lebih dari 30% penghasilan, penghasilan minimal ${money(highest / SHARE)} per bulan.`,
                `To keep the highest payment within 30% of income, you need about ${money(highest / SHARE)} a month.`,
              )}
            </p>
          )}

          <button
            type="button"
            onClick={() => downloadBlob(new Blob(['﻿', mortgageCsv(m.rows)], { type: 'text/csv;charset=utf-8' }), t('simulasi-kpr.csv', 'mortgage-schedule.csv'))}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Download className="size-4" />
            {t('Unduh tabel per bulan (CSV)', 'Download monthly table (CSV)')}
          </button>

          <div className="max-h-96 overflow-auto rounded-xl border">
            <table className="w-full text-right text-sm tabular-nums">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t('Tahun', 'Year')}</th>
                  <th className="px-3 py-2 font-medium">{t('Dibayar', 'Paid')}</th>
                  <th className="px-3 py-2 font-medium">{t('Pokok', 'Principal')}</th>
                  <th className="px-3 py-2 font-medium">{t('Bunga', 'Interest')}</th>
                  <th className="px-3 py-2 font-medium">{t('Sisa pokok', 'Balance')}</th>
                </tr>
              </thead>
              <tbody>
                {m.years.map((r) => (
                  <tr key={r.year} className="border-t">
                    <td className="px-3 py-1.5 text-left">{r.year}</td>
                    <td className="px-3 py-1.5">{money(r.paid)}</td>
                    <td className="px-3 py-1.5">{money(r.principal)}</td>
                    <td className="px-3 py-1.5">{money(r.interest)}</td>
                    <td className="px-3 py-1.5">{money(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(
            `Isi harga, DP (di bawah 100%), tenor 1–${MAX_YEARS} tahun, dan masa fix tidak lebih dari tenor.`,
            `Enter the price, a down payment under 100%, a term of 1–${MAX_YEARS} years, and a fixed period no longer than the term.`,
          )}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Ini simulasi, bukan penawaran bank. Angsuran dihitung anuitas (bunga dari sisa pokok); saat masa fix habis, angsuran dihitung ulang dari sisa pokok dengan bunga floating. Belum termasuk biaya provisi, notaris, BPHTB, appraisal, dan asuransi yang dibayar di awal; jumlahnya bisa beberapa persen dari harga rumah, jadi tanyakan rinciannya ke bank.',
          'This is a simulation, not a lender’s offer. Payments are an annuity (interest on the remaining balance); when the fixed period ends, the payment is recomputed on the remaining balance at the new rate. Closing costs, taxes, insurance and fees are not included.',
        )}
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
