import { useState } from 'react'
import { locale, useT } from '@/lib/i18n'
import { num } from '@/tools/cicilan/loan'
import { severance } from './calc'
import { LEAVE_DIVISOR, REASONS, RULES_AS_OF, RULES_SOURCE } from './rules'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function Pesangon() {
  const t = useT()
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString(locale())}`
  const [wage, setWage] = useState('')
  const [years, setYears] = useState('')
  const [months, setMonths] = useState('')
  const [reason, setReason] = useState(REASONS[0].id)
  const [leave, setLeave] = useState('')
  const [other, setOther] = useState('')

  const r = REASONS.find((x) => x.id === reason)!
  const w = num(wage)
  const service = Math.floor(num(years)) * 12 + Math.floor(num(months))
  const res = w > 0 && service > 0 ? severance(w, service, r, num(leave), num(other)) : null
  const x = (n: number) => n.toLocaleString(locale(), { maximumFractionDigits: 2 })

  return (
    <div className="space-y-6">
      <div className="grid max-w-xl gap-4">
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Alasan PHK', 'Reason for termination')}
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
            {REASONS.map((o) => (
              <option key={o.id} value={o.id}>
                {t(o.label[0], o.label[1])}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Upah sebulan terakhir: gaji pokok + tunjangan tetap (Rp)', 'Last monthly wage: base pay + fixed allowances (Rp)')}
          <input inputMode="decimal" value={wage} onChange={(e) => setWage(e.target.value)} className={inputCls} placeholder="6.000.000" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Masa kerja (tahun)', 'Service (years)')}
            <input inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} className={inputCls} placeholder="5" />
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('+ bulan', '+ months')}
            <input inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} className={inputCls} placeholder="3" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Sisa cuti belum diambil (hari)', 'Unused leave (days)')}
            <input inputMode="decimal" value={leave} onChange={(e) => setLeave(e.target.value)} className={inputCls} placeholder="0" />
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Hak lain: ongkos pulang dll. (Rp)', 'Other: travel home etc. (Rp)')}
            <input inputMode="decimal" value={other} onChange={(e) => setOther(e.target.value)} className={inputCls} placeholder="0" />
          </label>
        </div>
      </div>

      {res ? (
        <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">
            {t(`${r.pasal} · masa kerja dibulatkan ke bawah: ${res.years} tahun`, `${r.pasal} · service rounded down: ${res.years} years`)}
          </p>
          <table className="w-full text-sm tabular-nums">
            <tbody>
              <tr>
                <td className="py-1">
                  {t('Uang pesangon', 'Severance pay')}
                  <span className="block text-xs text-muted-foreground">
                    {x(res.pesangonBase)} × {x(r.pesangon)} {t('bulan upah', 'months of wage')}
                  </span>
                </td>
                <td className="py-1 text-right">{rp(res.pesangon)}</td>
              </tr>
              <tr className="border-t">
                <td className="py-1">
                  {t('Uang penghargaan masa kerja', 'Long-service award')}
                  <span className="block text-xs text-muted-foreground">
                    {x(res.upmkBase)} × {x(r.upmk)} {t('bulan upah', 'months of wage')}
                  </span>
                </td>
                <td className="py-1 text-right">{rp(res.upmk)}</td>
              </tr>
              <tr className="border-t">
                <td className="py-1">
                  {t('Penggantian hak: cuti', 'Entitlements: leave')}
                  <span className="block text-xs text-muted-foreground">{t(`hari × upah / ${LEAVE_DIVISOR}`, `days × wage / ${LEAVE_DIVISOR}`)}</span>
                </td>
                <td className="py-1 text-right">{rp(res.leave)}</td>
              </tr>
              <tr className="border-t">
                <td className="py-1">{t('Penggantian hak: lain-lain', 'Entitlements: other')}</td>
                <td className="py-1 text-right">{rp(res.other)}</td>
              </tr>
              <tr className="border-t text-base font-semibold">
                <td className="py-2">{t('Total perkiraan', 'Estimated total')}</td>
                <td className="py-2 text-right">{rp(res.total)}</td>
              </tr>
            </tbody>
          </table>
          {r.note && <p className="text-xs text-muted-foreground">{t(r.note[0], r.note[1])}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('Isi upah dan masa kerja untuk melihat hitungannya.', 'Enter wage and length of service to see the calculation.')}</p>
      )}

      <div className="space-y-2 text-xs text-muted-foreground">
        <p>
          {t(
            `Rumus: ${RULES_SOURCE} Pasal 40. Pesangon 1–9 bulan upah menurut masa kerja (mulai 8 tahun: 9 bulan), penghargaan masa kerja 2–10 bulan upah (mulai 3 tahun), lalu dikalikan faktor sesuai alasan PHK. Untuk PKWT (kontrak) yang berlaku adalah uang kompensasi, bukan pesangon. Aturan per ${RULES_AS_OF}; nomor pasal ada di berkas data dan sebaiknya dicocokkan dengan teks resmi.`,
            `Formula: ${RULES_SOURCE} Article 40. Severance is 1–9 months of wage by years served (9 from 8 years), the long-service award 2–10 months (from 3 years), then multiplied by a factor for the reason. Fixed-term (PKWT) staff get a compensation payment instead of severance. Rules as of ${RULES_AS_OF}; article numbers live in the data file and should be checked against the official text.`,
          )}
        </p>
        <p>
          {t(
            'Perjanjian kerja, peraturan perusahaan, atau PKB bisa memberi lebih besar dan yang lebih besar itu yang berlaku. Ini perkiraan, bukan nasihat hukum; untuk sengketa, tanyakan ke serikat pekerja, Disnaker, atau pengacara. Datamu tidak dikirim ke mana pun.',
            'A contract, company rules or collective agreement may give more, and the higher amount applies. This is an estimate, not legal advice; for a dispute ask a union, the labour office or a lawyer. Nothing is sent anywhere.',
          )}
        </p>
      </div>
    </div>
  )
}
