import { useState } from 'react'
import { locale, useT } from '@/lib/i18n'
import { Segmented } from '@/components/tool/Segmented'
import { dueFromLmp, dueFromUltrasound, fmtDay, gestation, milestoneDate, MILESTONES, parseDay } from './hpl'

const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

function todayLocal() {
  const d = new Date()
  return fmtDay(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

export default function Hpl() {
  const t = useT()
  const [mode, setMode] = useState<'lmp' | 'usg'>('lmp')
  const [lmp, setLmp] = useState('')
  const [cycle, setCycle] = useState('28')
  const [scan, setScan] = useState('')
  const [gw, setGw] = useState('')
  const [gd, setGd] = useState('0')
  const [today, setToday] = useState(todayLocal())

  const long = (ms: number) =>
    new Date(ms).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  let due = NaN
  if (mode === 'lmp') {
    const l = parseDay(lmp)
    const c = Math.round(Number(cycle))
    if (!isNaN(l) && c >= 21 && c <= 45) due = dueFromLmp(l, c)
  } else {
    const s = parseDay(scan)
    const w = Math.floor(Number(gw))
    const d = Math.floor(Number(gd) || 0)
    if (!isNaN(s) && gw !== '' && w >= 4 && w <= 42 && d >= 0 && d <= 6) due = dueFromUltrasound(s, w, d)
  }
  const now = parseDay(today)
  const g = !isNaN(due) && !isNaN(now) ? gestation(due, now) : null
  const outOfRange = g !== null && (g.totalDays < 0 || g.totalDays > 300)

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Hitung dari', 'Calculate from')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'lmp', label: t('Dari HPHT', 'From LMP') },
          { value: 'usg', label: t('Dari USG', 'From ultrasound') },
        ]}
      />
      <div className="grid max-w-xl gap-4">
        {mode === 'lmp' ? (
          <>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t('Hari pertama haid terakhir (HPHT)', 'First day of last period (LMP)')}
              <input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} className={inputCls} />
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t('Panjang siklus (hari)', 'Cycle length (days)')}
              <input inputMode="numeric" value={cycle} onChange={(e) => setCycle(e.target.value)} className={inputCls} />
              <span className="block font-normal">{t('Standarnya 28 hari; isi 21–45 bila siklusmu berbeda.', 'Standard is 28; enter 21–45 if yours differs.')}</span>
            </label>
          </>
        ) : (
          <>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              {t('Tanggal USG', 'Ultrasound date')}
              <input type="date" value={scan} onChange={(e) => setScan(e.target.value)} className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('Usia kehamilan di USG (minggu)', 'Gestational age at scan (weeks)')}
                <input inputMode="numeric" value={gw} onChange={(e) => setGw(e.target.value)} className={inputCls} placeholder="12" />
              </label>
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {t('…dan hari (0–6)', '…and days (0–6)')}
                <input inputMode="numeric" value={gd} onChange={(e) => setGd(e.target.value)} className={inputCls} />
              </label>
            </div>
          </>
        )}
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          {t('Hitung usia kehamilan per tanggal', 'Gestational age as of')}
          <input type="date" value={today} onChange={(e) => setToday(e.target.value)} className={inputCls} />
        </label>
      </div>

      {g && !isNaN(due) ? (
        <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('Hari perkiraan lahir (HPL)', 'Estimated due date')}</p>
            <p className="text-2xl font-semibold">{long(due)}</p>
          </div>
          {outOfRange ? (
            <p className="text-sm">{t('Tanggal hitung ada di luar masa kehamilan (0–42 minggu).', 'The chosen date is outside a pregnancy (0–42 weeks).')}</p>
          ) : (
            <p className="text-sm">
              {t(`Usia kehamilan: ${g.weeks} minggu ${g.days} hari · trimester ${g.trimester}`, `Gestational age: ${g.weeks} weeks ${g.days} days · trimester ${g.trimester}`)}
              {' · '}
              {t(`${Math.max(0, 280 - g.totalDays)} hari lagi ke HPL`, `${Math.max(0, 280 - g.totalDays)} days to go`)}
            </p>
          )}
          <ul className="divide-y text-sm">
            {MILESTONES.map((m) => {
              const ms = milestoneDate(due, m.week)
              const past = !isNaN(now) && ms <= now
              return (
                <li key={m.week} className={`flex flex-wrap justify-between gap-x-4 py-1.5 ${past ? 'text-muted-foreground' : ''}`}>
                  <span>
                    <span className="tabular-nums font-medium">{t(`Minggu ${m.week}`, `Week ${m.week}`)}</span> — {t(m.label[0], m.label[1])}
                  </span>
                  <span className="tabular-nums">
                    {new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('Isi tanggal untuk melihat HPL dan usia kehamilan.', 'Enter a date to see the due date and gestational age.')}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {t(
          'Ini hanya perkiraan dengan rumus Naegele (HPHT + 280 hari, disesuaikan panjang siklus). Hanya sekitar 5% bayi lahir tepat di HPL. Bidan atau dokter yang menentukan HPL sebenarnya, biasanya dengan USG. Datanya tidak dikirim ke mana pun.',
          "This is only an estimate using Naegele's rule (LMP + 280 days, adjusted for cycle length). Only about 5% of babies arrive on the due date. Your midwife or doctor sets the real due date, usually by ultrasound. Nothing is sent anywhere.",
        )}
      </p>
    </div>
  )
}
