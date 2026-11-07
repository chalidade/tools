import { useState } from 'react'
import { locale, useT } from '@/lib/i18n'
import { Segmented } from '@/components/tool/Segmented'
import { num } from '@/tools/cicilan/loan'
import { ACTIVITY, STANDARDS, type StandardId } from './data'
import { bmi, bmr, classify, idealRange } from './bmi'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

const TONE = { low: 'text-sky-500', ok: 'text-emerald-500', warn: 'text-amber-500', high: 'text-rose-500' }

export default function Bmi() {
  const t = useT()
  const [kg, setKg] = useState('')
  const [cm, setCm] = useState('')
  const [age, setAge] = useState('')
  const [male, setMale] = useState(true)
  const [act, setAct] = useState('light')
  const [std, setStd] = useState<StandardId>('asia')

  const w = num(kg)
  const h = num(cm)
  const ok = w >= 10 && w <= 400 && h >= 100 && h <= 250
  const v = ok ? bmi(w, h) : null
  const band = v !== null ? classify(v, std) : null
  const [lo, hi] = ok ? idealRange(h, std) : [0, 0]
  const a = num(age)
  const factor = ACTIVITY.find((x) => x.id === act)?.factor ?? 1.2
  const base = ok && a >= 15 && a <= 100 ? bmr(w, h, a, male) : null
  const f1 = (n: number) => n.toLocaleString(locale(), { maximumFractionDigits: 1 })
  const f0 = (n: number) => Math.round(n).toLocaleString(locale())

  return (
    <div className="space-y-6">
      <div className="grid max-w-xl gap-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Berat badan (kg)', 'Weight (kg)')}
            <input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} className={inputCls} placeholder="65" />
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Tinggi badan (cm)', 'Height (cm)')}
            <input inputMode="decimal" value={cm} onChange={(e) => setCm(e.target.value)} className={inputCls} placeholder="165" />
          </label>
        </div>
        <Segmented
          label={t('Standar kategori', 'Category standard')}
          value={std}
          onChange={setStd}
          options={(Object.keys(STANDARDS) as StandardId[]).map((k) => ({ value: k, label: t(STANDARDS[k].name[0], STANDARDS[k].name[1]) }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Usia (untuk kalori)', 'Age (for calories)')}
            <input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} className={inputCls} placeholder="30" />
          </label>
          <Segmented
            label={t('Jenis kelamin', 'Sex')}
            value={male ? 'm' : 'f'}
            onChange={(x) => setMale(x === 'm')}
            options={[
              { value: 'm', label: t('Laki-laki', 'Male') },
              { value: 'f', label: t('Perempuan', 'Female') },
            ]}
          />
        </div>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Tingkat aktivitas', 'Activity level')}
          <select value={act} onChange={(e) => setAct(e.target.value)} className={inputCls}>
            {ACTIVITY.map((x) => (
              <option key={x.id} value={x.id}>
                {t(x.label[0], x.label[1])}
              </option>
            ))}
          </select>
        </label>
      </div>

      {v !== null && band ? (
        <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
          <div>
            <p className="text-sm text-muted-foreground">BMI</p>
            <p className="text-3xl font-semibold tabular-nums">
              {f1(v)} <span className={`text-lg ${TONE[band.tone]}`}>{t(band.label[0], band.label[1])}</span>
            </p>
          </div>
          <p className="text-sm">
            {t('Rentang berat ideal untuk tinggimu', 'Healthy weight range for your height')}:{' '}
            <span className="font-medium tabular-nums">{f1(lo)} – {f1(hi)} kg</span>
            {w > hi && <span className="text-muted-foreground"> · {t(`sekitar ${f1(w - hi)} kg di atas`, `about ${f1(w - hi)} kg above`)}</span>}
            {w < lo && <span className="text-muted-foreground"> · {t(`sekitar ${f1(lo - w)} kg di bawah`, `about ${f1(lo - w)} kg below`)}</span>}
          </p>
          {base !== null ? (
            <table className="w-full text-sm tabular-nums">
              <tbody>
                <tr>
                  <td className="py-1">{t('Kalori basal (BMR, Mifflin-St Jeor)', 'Basal calories (BMR, Mifflin-St Jeor)')}</td>
                  <td className="py-1 text-right">{f0(base)} kcal</td>
                </tr>
                <tr className="border-t font-medium">
                  <td className="py-1">{t(`Kebutuhan harian (× ${factor})`, `Daily need (× ${factor})`)}</td>
                  <td className="py-1 text-right">{f0(base * factor)} kcal</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-muted-foreground">{t('Isi usia (15–100) untuk kebutuhan kalori.', 'Enter an age (15–100) for calorie needs.')}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('Isi berat dan tinggi badan untuk melihat BMI.', 'Enter weight and height to see your BMI.')}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'BMI hanya skrining, bukan diagnosis: tidak membedakan otot dari lemak dan kurang pas untuk atlet, lansia, anak, serta ibu hamil. Ambang kategori ada di satu berkas data (WHO 2000 Asia-Pasifik, Kemenkes RI, WHO global). Tanyakan ke dokter atau ahli gizi sebelum mengubah pola makan. Datamu tidak dikirim ke mana pun.',
          "BMI is a screening figure, not a diagnosis: it can't tell muscle from fat and fits athletes, older adults, children and pregnancy poorly. Category cut-offs live in one data file (WHO 2000 Asia-Pacific, Indonesian MoH, global WHO). Ask a doctor or dietitian before changing your diet. Nothing is sent anywhere.",
        )}
      </p>
    </div>
  )
}
