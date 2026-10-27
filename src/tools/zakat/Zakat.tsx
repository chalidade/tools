import { useState } from 'react'
import { Segmented } from '@/components/tool/Segmented'
import { CopyButton } from '@/components/tool/CopyButton'
import { locale, useT } from '@/lib/i18n'
import {
  FITRAH_RICE_KG,
  GOLD_NISAB_G,
  RATE,
  SILVER_NISAB_G,
  num,
  zakatFitrah,
  zakatIncome,
  zakatMal,
  zakatMetal,
  type Outcome,
} from './zakat'

type Kind = 'mal' | 'metal' | 'income' | 'fitrah'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      {label}
      <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder="0" />
      {hint && <span className="block font-normal">{hint}</span>}
    </label>
  )
}

export default function Zakat() {
  const t = useT()
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString(locale())}`
  const [kind, setKind] = useState<Kind>('income')
  const [gold, setGold] = useState('')
  const [silver, setSilver] = useState('')
  const [assets, setAssets] = useState('')
  const [debts, setDebts] = useState('')
  const [grams, setGrams] = useState('')
  const [metal, setMetal] = useState<'gold' | 'silver'>('gold')
  const [income, setIncome] = useState('')
  const [other, setOther] = useState('')
  const [installment, setInstallment] = useState('')
  const [people, setPeople] = useState('1')
  const [rice, setRice] = useState('')

  const goldPrice = num(gold)
  const silverPrice = num(silver)

  let result: Outcome | null = null
  let steps: string[] = []
  let summary = ''
  let needPrice = false

  if (kind === 'mal') {
    needPrice = goldPrice === 0
    result = zakatMal(num(assets), num(debts), goldPrice)
    steps = [
      t(`Harta bersih = harta − utang jatuh tempo = ${rp(result.base)}`, `Net wealth = assets − debts due = ${rp(result.base)}`),
      t(`Nisab = ${GOLD_NISAB_G} g emas × ${rp(goldPrice)} = ${rp(result.nisab)}`, `Nisab = ${GOLD_NISAB_G} g gold × ${rp(goldPrice)} = ${rp(result.nisab)}`),
      t(`Zakat = ${RATE * 100}% × ${rp(result.base)}`, `Zakat = ${RATE * 100}% × ${rp(result.base)}`),
    ]
  } else if (kind === 'income') {
    needPrice = goldPrice === 0
    result = zakatIncome(num(income), num(other), num(installment), goldPrice)
    steps = [
      t(`Penghasilan bersih sebulan = gaji + lainnya − cicilan pokok = ${rp(result.base)}`, `Net monthly income = salary + other − principal installments = ${rp(result.base)}`),
      t(`Nisab sebulan = ${GOLD_NISAB_G} g emas × ${rp(goldPrice)} ÷ 12 = ${rp(result.nisab)}`, `Monthly nisab = ${GOLD_NISAB_G} g gold × ${rp(goldPrice)} ÷ 12 = ${rp(result.nisab)}`),
      t(`Zakat sebulan = ${RATE * 100}% × ${rp(result.base)}`, `Monthly zakat = ${RATE * 100}% × ${rp(result.base)}`),
    ]
  }

  const metalRes = kind === 'metal' ? zakatMetal(num(grams), metal === 'gold' ? GOLD_NISAB_G : SILVER_NISAB_G, metal === 'gold' ? goldPrice : silverPrice) : null
  const fitrah = kind === 'fitrah' ? zakatFitrah(Math.floor(num(people)), num(rice)) : null

  let amount = 0
  let reached = false
  if (result) {
    amount = result.zakat
    reached = result.reached
    summary = reached ? t(`Zakat ${rp(amount)}`, `Zakat ${rp(amount)}`) : ''
  } else if (metalRes) {
    amount = metalRes.zakat
    reached = metalRes.reached
    summary = reached ? `${metalRes.zakatGrams.toLocaleString(locale(), { maximumFractionDigits: 3 })} g ≈ ${rp(amount)}` : ''
  } else if (fitrah) {
    amount = fitrah.zakat
    reached = amount > 0
    summary = reached ? `${fitrah.kg.toLocaleString(locale())} kg ${t('beras', 'rice')} ≈ ${rp(amount)}` : ''
  }

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Jenis zakat', 'Type of zakat')}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'income', label: t('Penghasilan', 'Income') },
          { value: 'mal', label: t('Harta (mal)', 'Wealth (mal)') },
          { value: 'metal', label: t('Emas / perak', 'Gold / silver') },
          { value: 'fitrah', label: 'Fitrah' },
        ]}
      />

      <div className="grid max-w-xl gap-4">
        {(kind === 'mal' || kind === 'income' || (kind === 'metal' && metal === 'gold')) && (
          <Field
            label={t('Harga emas per gram (Rp)', 'Gold price per gram (Rp)')}
            value={gold}
            onChange={setGold}
            hint={t('Isi sendiri dari harga hari ini (mis. Antam); tidak diambil dari internet.', 'Enter today’s price yourself; it is not fetched from the internet.')}
          />
        )}
        {kind === 'metal' && metal === 'silver' && <Field label={t('Harga perak per gram (Rp)', 'Silver price per gram (Rp)')} value={silver} onChange={setSilver} />}

        {kind === 'mal' && (
          <>
            <Field
              label={t('Total harta yang sudah setahun dimiliki (Rp)', 'Total wealth held for a full year (Rp)')}
              value={assets}
              onChange={setAssets}
              hint={t('Tabungan, deposito, emas/perak (nilai uang), surat berharga, piutang lancar, hasil usaha.', 'Savings, deposits, gold/silver (cash value), securities, receivables, business assets.')}
            />
            <Field label={t('Utang jatuh tempo (Rp)', 'Debts due (Rp)')} value={debts} onChange={setDebts} />
          </>
        )}

        {kind === 'income' && (
          <>
            <Field label={t('Penghasilan per bulan (Rp)', 'Income per month (Rp)')} value={income} onChange={setIncome} />
            <Field label={t('Penghasilan lain per bulan (Rp)', 'Other monthly income (Rp)')} value={other} onChange={setOther} />
            <Field label={t('Cicilan utang pokok per bulan (Rp)', 'Monthly principal installments (Rp)')} value={installment} onChange={setInstallment} hint={t('Opsional; kebutuhan pokok dan cicilan boleh dikurangkan menurut sebagian ulama.', 'Optional; some scholars allow deducting basic needs and installments.')} />
          </>
        )}

        {kind === 'metal' && (
          <>
            <Segmented
              label={t('Logam', 'Metal')}
              value={metal}
              onChange={setMetal}
              options={[
                { value: 'gold', label: t('Emas', 'Gold') },
                { value: 'silver', label: t('Perak', 'Silver') },
              ]}
            />
            <Field
              label={t('Berat yang disimpan setahun (gram)', 'Weight held for a year (grams)')}
              value={grams}
              onChange={setGrams}
              hint={t(`Nisab ${metal === 'gold' ? GOLD_NISAB_G : SILVER_NISAB_G} gram. Perhiasan yang dipakai wajar sebagian ulama tidak dizakati.`, `Nisab is ${metal === 'gold' ? GOLD_NISAB_G : SILVER_NISAB_G} grams. Some scholars exempt jewellery worn normally.`)}
            />
          </>
        )}

        {kind === 'fitrah' && (
          <>
            <Field label={t('Jumlah orang', 'Number of people')} value={people} onChange={setPeople} />
            <Field label={t('Harga beras per kg (Rp)', 'Rice price per kg (Rp)')} value={rice} onChange={setRice} hint={t(`${FITRAH_RICE_KG} kg beras per orang (ketetapan Baznas); pakai harga beras yang biasa kamu makan.`, `${FITRAH_RICE_KG} kg of rice per person (Baznas ruling); use the price of the rice you normally eat.`)} />
          </>
        )}
      </div>

      <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
        {needPrice || (kind === 'metal' && (metal === 'gold' ? goldPrice : silverPrice) === 0) ? (
          <p className="text-sm text-muted-foreground">{t('Isi harga emas/perak dulu untuk melihat hasil.', 'Enter the gold/silver price first to see the result.')}</p>
        ) : kind === 'fitrah' && !reached ? (
          <p className="text-sm text-muted-foreground">{t('Isi jumlah orang dan harga beras.', 'Enter the number of people and the rice price.')}</p>
        ) : reached ? (
          <>
            <p className="text-sm text-muted-foreground">{kind === 'income' ? t('Zakat yang dikeluarkan per bulan', 'Zakat due per month') : t('Zakat yang harus dikeluarkan', 'Zakat due')}</p>
            <p className="text-3xl font-semibold tabular-nums">{kind === 'metal' || kind === 'fitrah' ? summary : rp(amount)}</p>
            {kind === 'income' && result && <p className="text-xs text-muted-foreground">{t(`Setara ${rp(amount * 12)} per tahun.`, `Equivalent to ${rp(amount * 12)} per year.`)}</p>}
            <CopyButton text={kind === 'metal' || kind === 'fitrah' ? summary : rp(amount)} variant="outline" />
          </>
        ) : (
          <p className="text-sm">{t('Belum mencapai nisab, jadi belum wajib zakat jenis ini. Sedekah sukarela tetap dianjurkan.', 'Below the nisab, so this type of zakat is not yet obligatory. Voluntary charity is still encouraged.')}</p>
        )}
        {steps.length > 0 && !needPrice && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {t(
          'Rumus mengikuti pedoman Baznas/Kemenag: 2,5% dari harta yang mencapai nisab setara 85 gram emas (perak 595 gram) dan sudah dimiliki satu tahun (haul); zakat penghasilan boleh dibayar bulanan dengan nisab seperduabelas. Fitrah 2,5 kg beras per jiwa. Ini alat bantu hitung, bukan fatwa — tanyakan ke lembaga zakat atau ustaz untuk kasus khusus.',
          'Formulas follow Baznas/Kemenag guidance: 2.5% of wealth reaching the nisab of 85 g of gold (595 g of silver) and held for one year (haul); income zakat may be paid monthly against one twelfth of the nisab. Fitrah is 2.5 kg of rice per person. This is a calculation aid, not a fatwa — ask a zakat institution or scholar about special cases.',
        )}
      </p>
    </div>
  )
}
