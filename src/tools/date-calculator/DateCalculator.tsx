import { useMemo, useState } from 'react'
import { Segmented } from '@/components/tool/Segmented'
import { locale, tr, useT } from '@/lib/i18n'
import {
  addDays,
  addMonths,
  addWorkdays,
  age,
  daysBetween,
  diffYMD,
  holidayMap,
  parseISO,
  toISO,
  todayISO,
  uncoveredYears,
  workdaysBetween,
  type D,
  type YMD,
} from './dates'

type Mode = 'age' | 'diff' | 'work' | 'add'
type Unit = 'days' | 'weeks' | 'months' | 'years' | 'workdays'

const inputCls =
  'w-full rounded-lg border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="space-y-1 text-xs font-medium text-muted-foreground">
      {label}
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function ymdText({ years, months, days }: YMD): string {
  return tr(`${years} tahun ${months} bulan ${days} hari`, `${years} years ${months} months ${days} days`)
}

export default function DateCalculator() {
  const t = useT()
  const [mode, setMode] = useState<Mode>('age')
  const [a, setA] = useState('')
  const [b, setB] = useState(todayISO())
  const [amount, setAmount] = useState('30')
  const [unit, setUnit] = useState<Unit>('days')
  const [sub, setSub] = useState(false)
  const [cuti, setCuti] = useState(true)

  const fmt = (n: number) => n.toLocaleString(locale())
  const dateText = (d: D) =>
    d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const holidays = useMemo(() => holidayMap(cuti), [cuti])
  const da = parseISO(a)
  const db = parseISO(b)

  const warn = (from: D, to: D) => {
    const miss = uncoveredYears(from, to)
    return miss.length > 0 ? (
      <p className="text-xs text-muted-foreground">
        {t(
          `Daftar libur nasional belum mencakup tahun ${miss.join(', ')}; tanggal merah di tahun itu dihitung sebagai hari kerja.`,
          `The holiday list does not cover ${miss.join(', ')}; public holidays in those years count as working days.`,
        )}
      </p>
    ) : null
  }

  let body: React.ReactNode = null

  if (mode === 'age') {
    const r = da && db ? age(da, db) : null
    body = (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          <DateField label={t('Tanggal lahir', 'Date of birth')} value={a} onChange={setA} />
          <DateField label={t('Hitung sampai', 'As of')} value={b} onChange={setB} />
        </div>
        {da && db && !r && <p className="text-sm text-destructive">{t('Tanggal lahir harus sebelum tanggal hitung.', 'Birth date must be before the as-of date.')}</p>}
        {r && (
          <>
            <p className="text-2xl font-semibold">{ymdText(r)}</p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label={t('Total hari', 'Total days')} value={fmt(r.totalDays)} />
              <Stat label={t('Total minggu', 'Total weeks')} value={fmt(Math.floor(r.totalDays / 7))} />
              <Stat label={t('Ulang tahun berikutnya', 'Next birthday')} value={r.daysToBirthday === 0 ? t('Hari ini!', 'Today!') : tr(`${fmt(r.daysToBirthday)} hari lagi`, `in ${fmt(r.daysToBirthday)} days`)} />
              <Stat label={t('Lahir hari', 'Born on a')} value={da!.toLocaleDateString(locale(), { weekday: 'long', timeZone: 'UTC' })} />
            </dl>
            <p className="text-xs text-muted-foreground">{t('Ulang tahun berikutnya', 'Next birthday')}: {dateText(r.nextBirthday)}</p>
          </>
        )}
      </>
    )
  } else if (mode === 'diff') {
    const [lo, hi] = da && db ? (da <= db ? [da, db] : [db, da]) : [null, null]
    body = (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          <DateField label={t('Dari tanggal', 'From')} value={a} onChange={setA} />
          <DateField label={t('Sampai tanggal', 'To')} value={b} onChange={setB} />
        </div>
        {lo && hi && (
          <>
            <p className="text-2xl font-semibold">{ymdText(diffYMD(lo, hi))}</p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label={t('Selisih hari', 'Days apart')} value={fmt(daysBetween(lo, hi))} />
              <Stat label={t('Minggu', 'Weeks')} value={tr(`${fmt(Math.floor(daysBetween(lo, hi) / 7))} mgg ${daysBetween(lo, hi) % 7} hr`, `${fmt(Math.floor(daysBetween(lo, hi) / 7))} wk ${daysBetween(lo, hi) % 7} d`)} />
              <Stat label={t('Jam', 'Hours')} value={fmt(daysBetween(lo, hi) * 24)} />
            </dl>
          </>
        )}
      </>
    )
  } else if (mode === 'work') {
    const [lo, hi] = da && db ? (da <= db ? [da, db] : [db, da]) : [null, null]
    const r = lo && hi ? workdaysBetween(lo, hi, holidays) : null
    body = (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          <DateField label={t('Dari tanggal', 'From')} value={a} onChange={setA} />
          <DateField label={t('Sampai tanggal', 'To')} value={b} onChange={setB} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cuti} onChange={(e) => setCuti(e.target.checked)} />
          {t('Cuti bersama dihitung libur', 'Count collective leave as days off')}
        </label>
        {lo && hi && r && (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label={t('Hari kerja', 'Working days')} value={fmt(r.workdays)} />
              <Stat label={t('Libur nasional', 'Public holidays')} value={fmt(r.holidays.length)} />
              <Stat label={t('Total hari (termasuk kedua ujung)', 'Total days (both ends)')} value={fmt(daysBetween(lo, hi) + 1)} />
            </dl>
            <p className="text-xs text-muted-foreground">{t('Sabtu dan Minggu tidak dihitung; kedua tanggal ikut dihitung.', 'Saturdays and Sundays are excluded; both dates are included.')}</p>
            {r.holidays.length > 0 && (
              <ul className="divide-y rounded-xl border text-sm">
                {r.holidays.map((h) => (
                  <li key={h.date} className="flex justify-between gap-3 px-3 py-2">
                    <span className="tabular-nums">{dateText(parseISO(h.date)!)}</span>
                    <span className="text-right text-muted-foreground">{h.name}</span>
                  </li>
                ))}
              </ul>
            )}
            {warn(lo, hi)}
          </>
        )}
      </>
    )
  } else {
    const n = /^\d{1,6}$/.test(amount.trim()) ? Number(amount) : null
    let result: D | null = null
    if (da && n !== null) {
      const k = sub ? -n : n
      result =
        unit === 'days' ? addDays(da, k)
        : unit === 'weeks' ? addDays(da, k * 7)
        : unit === 'months' ? addMonths(da, k)
        : unit === 'years' ? addMonths(da, k * 12)
        : addWorkdays(da, k, holidays)
    }
    body = (
      <>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_1fr] sm:items-end">
          <DateField label={t('Tanggal awal', 'Start date')} value={a} onChange={setA} />
          <Segmented
            label={t('Operasi', 'Operation')}
            value={sub ? 'sub' : 'add'}
            options={[{ value: 'add', label: t('Tambah', 'Add') }, { value: 'sub', label: t('Kurang', 'Subtract') }]}
            onChange={(v) => setSub(v === 'sub')}
          />
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            {t('Jumlah', 'Amount')}
            <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            {t('Satuan', 'Unit')}
            <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className={inputCls}>
              <option value="days">{t('Hari', 'Days')}</option>
              <option value="weeks">{t('Minggu', 'Weeks')}</option>
              <option value="months">{t('Bulan', 'Months')}</option>
              <option value="years">{t('Tahun', 'Years')}</option>
              <option value="workdays">{t('Hari kerja', 'Working days')}</option>
            </select>
          </label>
        </div>
        {unit === 'workdays' && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={cuti} onChange={(e) => setCuti(e.target.checked)} />
            {t('Cuti bersama dihitung libur', 'Count collective leave as days off')}
          </label>
        )}
        {result && (
          <>
            <p className="text-2xl font-semibold">{dateText(result)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{toISO(result)}</p>
            {unit === 'workdays' && da && warn(da <= result ? da : result, da <= result ? result : da)}
          </>
        )}
        {da && n === null && <p className="text-sm text-destructive">{t('Jumlah harus bilangan bulat tanpa tanda.', 'Amount must be a whole number without a sign.')}</p>}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <Segmented
        label={t('Hitung', 'Calculate')}
        value={mode}
        options={[
          { value: 'age', label: t('Umur', 'Age') },
          { value: 'diff', label: t('Selisih', 'Difference') },
          { value: 'work', label: t('Hari kerja', 'Working days') },
          { value: 'add', label: t('Tambah/kurang', 'Add/subtract') },
        ]}
        onChange={(m) => {
          setMode(m)
          if (m === 'age') setB(todayISO())
          if (m === 'add' && !a) setA(todayISO())
        }}
      />
      <div className="space-y-4">{body}</div>
    </div>
  )
}
