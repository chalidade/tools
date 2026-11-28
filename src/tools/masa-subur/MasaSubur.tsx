import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { locale, useT } from '@/lib/i18n'
import { DAY, cleanDates, cycleStats, fmtDay, kindOf, monthGrid, predict, type DayKind } from './cycle'

const KEY = 'toowl:masa-subur'
const inputCls =
  'w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface Saved {
  dates: string[]
  cycle: string
  period: string
}

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (s && Array.isArray(s.dates)) {
      return { dates: s.dates.filter((x: unknown) => typeof x === 'string').slice(0, 12), cycle: String(s.cycle ?? '28'), period: String(s.period ?? '5') }
    }
  } catch {
    /* ignore */
  }
  return { dates: [''], cycle: '28', period: '5' }
}

function todayUtc() {
  const d = new Date()
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

const KIND_CLS: Record<DayKind, string> = {
  none: '',
  period: 'bg-destructive/20 text-foreground font-medium',
  fertile: 'bg-brand-fill text-brand-ink',
  ovulation: 'bg-brand-fill text-brand-ink font-bold ring-2 ring-foreground',
}

export default function MasaSubur() {
  const t = useT()
  const [init] = useState(load)
  const [dates, setDates] = useState(init.dates.length ? init.dates : [''])
  const [cycleStr, setCycleStr] = useState(init.cycle)
  const [periodStr, setPeriodStr] = useState(init.period)

  useEffect(() => {
    try {
      const empty = dates.every((d) => !d)
      if (empty && cycleStr === '28' && periodStr === '5') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, JSON.stringify({ dates, cycle: cycleStr, period: periodStr } satisfies Saved))
    } catch {
      /* private mode */
    }
  }, [dates, cycleStr, periodStr])

  const days = useMemo(() => cleanDates(dates), [dates])
  const stats = useMemo(() => cycleStats(days), [days])
  const manual = Math.round(Number(cycleStr))
  const cycle = stats ? stats.avg : manual
  const periodLen = Math.min(10, Math.max(1, Math.round(Number(periodStr)) || 5))
  const last = days.length ? days[days.length - 1] : NaN
  const cycleOk = cycle >= 21 && cycle <= 45
  const today = todayUtc()

  const cycles = useMemo(() => {
    if (isNaN(last) || !cycleOk) return []
    // Enough cycles to cover the three months shown, however old the last date is.
    const n = Math.min(60, Math.max(3, Math.ceil((today + 125 * DAY - last) / (cycle * DAY)) + 1))
    return predict(last, cycle, periodLen, n)
  }, [last, cycle, cycleOk, periodLen, today])
  // Months shown: the one holding "today", plus two more.
  const base = new Date(today)
  const months = [0, 1, 2].map((i) => {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1))
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() }
  })

  const long = (ms: number) => new Date(ms).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const short = (ms: number) => new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const next = cycles.find((c) => c.start > last && c.start >= today) ?? cycles.find((c) => c.start > last)
  const nextOvu = cycles.find((c) => c.ovulation >= today)
  const wd = [t('Sen', 'Mon'), t('Sel', 'Tue'), t('Rab', 'Wed'), t('Kam', 'Thu'), t('Jum', 'Fri'), t('Sab', 'Sat'), t('Min', 'Sun')]
  const setDate = (i: number, v: string) => setDates(dates.map((d, j) => (j === i ? v : d)))
  const hasData = dates.some((d) => d) || cycleStr !== '28' || periodStr !== '5'

  return (
    <div className="space-y-6">
      <div className="grid max-w-xl gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t('Hari pertama haid (isi beberapa bulan terakhir untuk rata-rata)', 'First day of each period (add a few recent months for an average)')}
          </p>
          {dates.map((d, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="date"
                aria-label={t(`Tanggal haid ${i + 1}`, `Period date ${i + 1}`)}
                value={d}
                onChange={(e) => setDate(i, e.target.value)}
                className={inputCls}
              />
              {dates.length > 1 && (
                <button
                  type="button"
                  aria-label={t('Hapus tanggal', 'Remove date')}
                  onClick={() => setDates(dates.filter((_, j) => j !== i))}
                  className="rounded-xl border px-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
          {dates.length < 12 && (
            <button
              type="button"
              onClick={() => setDates([...dates, ''])}
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Plus className="size-4" /> {t('Tambah tanggal haid', 'Add a period date')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Panjang siklus (hari)', 'Cycle length (days)')}
            <input
              inputMode="numeric"
              value={stats ? String(stats.avg) : cycleStr}
              disabled={!!stats}
              onChange={(e) => setCycleStr(e.target.value)}
              className={inputCls + ' disabled:opacity-60'}
            />
            <span className="block font-normal">
              {stats ? t('Dihitung dari tanggal-tanggalmu.', 'Worked out from your dates.') : t('Isi 21–45; standarnya 28.', 'Enter 21–45; the usual is 28.')}
            </span>
          </label>
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {t('Lama haid (hari)', 'Period length (days)')}
            <input inputMode="numeric" value={periodStr} onChange={(e) => setPeriodStr(e.target.value)} className={inputCls} />
          </label>
        </div>
      </div>

      {stats && (
        <p className="text-sm">
          {t(
            `Siklus dari ${stats.lengths.length} selisih tanggal: rata-rata ${stats.avg} hari, rentang ${stats.min}–${stats.max} hari.`,
            `From ${stats.lengths.length} gap(s): average ${stats.avg} days, range ${stats.min}–${stats.max} days.`,
          )}
          {stats.max - stats.min > 7 && (
            <span className="block text-muted-foreground">
              {t('Siklusmu cukup bervariasi, jadi perkiraan di bawah kurang akurat.', 'Your cycles vary a lot, so the estimates below are less reliable.')}
            </span>
          )}
        </p>
      )}

      {cycles.length && next ? (
        <div className="space-y-5">
          <div className="grid gap-3 rounded-xl border bg-muted/40 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{t('Haid berikutnya', 'Next period')}</p>
              <p className="font-semibold">{long(next.start)}</p>
            </div>
            {nextOvu && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">{t('Perkiraan ovulasi', 'Estimated ovulation')}</p>
                  <p className="font-semibold">{long(nextOvu.ovulation)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('Jendela subur', 'Fertile window')}</p>
                  <p className="font-semibold">
                    {short(nextOvu.fertileFrom)} – {short(nextOvu.fertileTo)}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {months.map(({ y, m }) => (
              <div key={`${y}-${m}`} className="rounded-xl border p-3">
                <p className="mb-2 text-sm font-semibold">
                  {new Date(Date.UTC(y, m, 1)).toLocaleDateString(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                </p>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {wd.map((w) => (
                    <span key={w} className="text-muted-foreground">
                      {w}
                    </span>
                  ))}
                  {monthGrid(y, m).map((d, i) => {
                    if (d === null) return <span key={i} />
                    const known = days.includes(d)
                    const k = known ? 'period' : kindOf(d, cycles)
                    return (
                      <span
                        key={i}
                        title={fmtDay(d)}
                        className={`rounded-md py-1 tabular-nums ${KIND_CLS[k]} ${d === today ? 'outline outline-1 outline-offset-1 outline-foreground' : ''}`}
                      >
                        {new Date(d).getUTCDate()}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-destructive/20" /> {t('Haid', 'Period')}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-brand-fill" /> {t('Jendela subur', 'Fertile window')}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-brand-fill ring-2 ring-foreground" /> {t('Ovulasi', 'Ovulation')}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded outline outline-1 outline-foreground" /> {t('Hari ini', 'Today')}
            </li>
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {!cycleOk && !stats
            ? t('Panjang siklus harus 21–45 hari.', 'Cycle length must be 21–45 days.')
            : t('Isi tanggal hari pertama haid terakhir untuk melihat perkiraan.', 'Enter the first day of your last period to see the estimate.')}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted-foreground">
          {t('Tanggalmu otomatis tersimpan di perangkat ini saja.', 'Your dates are saved on this device only.')}
        </p>
        {hasData && (
          <button
            type="button"
            onClick={() => {
              setDates([''])
              setCycleStr('28')
              setPeriodStr('5')
              try {
                localStorage.removeItem(KEY)
              } catch {
                /* ignore */
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Trash2 className="size-4" /> {t('Hapus semua data', 'Delete all data')}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {t(
          'Ini perkiraan metode kalender, bukan alat kontrasepsi dan bukan nasihat medis. Ovulasi dihitung 14 hari sebelum haid berikutnya (fase luteal rata-rata) dan jendela subur 6 hari: 5 hari sebelum sampai sehari sesudah ovulasi (Wilcox dkk., N Engl J Med 2000). Siklus yang tidak teratur, menyusui, stres, dan obat bisa menggeser semuanya. Untuk program hamil atau mencegah kehamilan, bicarakan dengan dokter atau bidan.',
          'This is a calendar-method estimate, not contraception and not medical advice. Ovulation is placed 14 days before the next period (average luteal phase) and the fertile window is 6 days: 5 days before through the day after ovulation (Wilcox et al., N Engl J Med 2000). Irregular cycles, breastfeeding, stress and medication can shift everything. To conceive or to avoid pregnancy, talk to a doctor or midwife.',
        )}
      </p>
    </div>
  )
}
