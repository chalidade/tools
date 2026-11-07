import { useState } from 'react'
import { locale, useT } from '@/lib/i18n'
import { num } from '@/tools/cicilan/loan'
import { DEFAULT_PPJ, GOLONGAN, PPN_RATE, TARIF_AS_OF, TARIF_SOURCE } from './tarif'
import { daysLeft, tokenKwh } from './token'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function TokenListrik() {
  const t = useT()
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString(locale())}`
  const [amount, setAmount] = useState('')
  const [gid, setGid] = useState('r1-1300')
  const [ppj, setPpj] = useState(String(DEFAULT_PPJ))
  const [admin, setAdmin] = useState('')
  const [usage, setUsage] = useState('')
  const [ppnOn, setPpnOn] = useState<boolean | null>(null)

  const g = GOLONGAN.find((x) => x.id === gid) ?? GOLONGAN[0]
  const ppnApplies = ppnOn ?? g.ppn
  const a = num(amount)
  const r =
    a > 0
      ? tokenKwh({ amount: a, admin: num(admin), rate: g.rate, ppjPct: Math.min(num(ppj), 30), ppnPct: ppnApplies ? PPN_RATE : 0 })
      : null
  const days = r ? daysLeft(r.kwh, num(usage)) : null
  const fmt = (n: number, d = 2) => n.toLocaleString(locale(), { maximumFractionDigits: d })

  return (
    <div className="space-y-6">
      <div className="grid max-w-xl gap-4">
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Nominal pembelian (Rp)', 'Purchase amount (Rp)')}
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="100.000" />
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Golongan tarif', 'Tariff class')}
          <select value={gid} onChange={(e) => { setGid(e.target.value); setPpnOn(null) }} className={inputCls}>
            {GOLONGAN.map((x) => (
              <option key={x.id} value={x.id}>
                {t(x.label[0], x.label[1])} — Rp {x.rate.toLocaleString(locale())}/kWh
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('PPJ (%)', 'PPJ street-light tax (%)')}
            <input inputMode="decimal" value={ppj} onChange={(e) => setPpj(e.target.value)} className={inputCls} />
            <span className="block font-normal">{t('Beda tiap daerah, lihat struk.', 'Differs by region; see your receipt.')}</span>
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Biaya admin (Rp)', 'Admin fee (Rp)')}
            <input inputMode="decimal" value={admin} onChange={(e) => setAdmin(e.target.value)} className={inputCls} placeholder="2.500" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ppnApplies} onChange={(e) => setPpnOn(e.target.checked)} className="size-4" />
          {t(`Kenakan PPN ${PPN_RATE}%`, `Apply ${PPN_RATE}% VAT`)}
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Pemakaian per hari (kWh, opsional)', 'Daily use (kWh, optional)')}
          <input inputMode="decimal" value={usage} onChange={(e) => setUsage(e.target.value)} className={inputCls} placeholder="5" />
        </label>
      </div>

      {r ? (
        <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('Perkiraan token yang didapat', 'Estimated token')}</p>
            <p className="text-3xl font-semibold tabular-nums">{fmt(r.kwh)} kWh</p>
            {days !== null && (
              <p className="mt-1 text-sm">
                {t(`Cukup sekitar ${fmt(days, 1)} hari`, `Lasts about ${fmt(days, 1)} days`)}
                {days >= 30 ? t(` (± ${fmt(days / 30, 1)} bulan)`, ` (≈ ${fmt(days / 30, 1)} months)`) : ''}
              </p>
            )}
          </div>
          <table className="w-full text-sm tabular-nums">
            <tbody>
              <tr>
                <td className="py-1">{t('Dibayar', 'Paid')}</td>
                <td className="py-1 text-right">{rp(a)}</td>
              </tr>
              {num(admin) > 0 && (
                <tr className="border-t">
                  <td className="py-1">− {t('Biaya admin', 'Admin fee')}</td>
                  <td className="py-1 text-right">{rp(num(admin))}</td>
                </tr>
              )}
              {ppnApplies && (
                <tr className="border-t">
                  <td className="py-1">− PPN {PPN_RATE}%</td>
                  <td className="py-1 text-right">{rp(Math.max(0, r.ppn))}</td>
                </tr>
              )}
              <tr className="border-t">
                <td className="py-1">− PPJ {fmt(num(ppj))}%</td>
                <td className="py-1 text-right">{rp(r.ppj)}</td>
              </tr>
              <tr className="border-t font-medium">
                <td className="py-1">{t('Dipakai untuk energi', 'Spent on energy')}</td>
                <td className="py-1 text-right">{rp(r.energy)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('Isi nominal pembelian untuk melihat perkiraan kWh.', 'Enter an amount to see the estimated kWh.')}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          `Ini perkiraan. Jumlah di struk bisa berbeda sedikit karena pembulatan, materai, dan tarif daerah. Tarif per kWh (per ${TARIF_AS_OF}, sumber: ${TARIF_SOURCE}) ada di satu berkas dan perlu diperbarui bila PLN mengubahnya; golongan nonsubsidi dan penyesuaian tarif triwulanan tidak dilacak otomatis.`,
          `This is an estimate. Your receipt may differ slightly because of rounding, stamp duty and regional rates. Per-kWh tariffs (as of ${TARIF_AS_OF}, source: ${TARIF_SOURCE}) live in one file and need updating when PLN changes them; quarterly non-subsidised adjustments are not tracked automatically.`,
        )}
      </p>
    </div>
  )
}
