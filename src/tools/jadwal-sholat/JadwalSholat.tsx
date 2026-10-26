import { useEffect, useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useT, useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { DEFAULT_SPOT, LocationPicker, type Spot } from './Location'
import {
  clock,
  daysInMonth,
  prayerTimes,
  PRAYER_NAMES,
  PRAYER_ORDER,
  type PrayerKey,
} from './prayer'

const inputCls =
  'rounded-lg border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Prayers that get a card on the daily view (Imsak, Dhuha are shown smaller). */
const MAIN: PrayerKey[] = ['subuh', 'zuhur', 'asar', 'maghrib', 'isya']

export default function JadwalSholat() {
  const t = useT()
  const lang = useLang()
  const idx = lang === 'en' ? 1 : 0
  const now = new Date()
  const [spot, setSpot] = useState<Spot>(DEFAULT_SPOT)
  const [view, setView] = useState<'day' | 'month'>('day')
  const [date, setDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  )
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const [y, m, d] = date.split('-').map(Number)
  const valid = Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)
  const times = useMemo(() => (valid ? prayerTimes(y, m, d, spot) : null), [valid, y, m, d, spot])

  // "Now" in the place's own clock, to mark the next prayer.
  const placeNow = useMemo(() => {
    void tick
    const utc = Date.now() + new Date().getTimezoneOffset() * 60000
    const p = new Date(utc + spot.tz * 3600000)
    return { iso: `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}-${String(p.getDate()).padStart(2, '0')}`, min: p.getHours() * 60 + p.getMinutes() }
  }, [tick, spot.tz])
  const next =
    times && placeNow.iso === date
      ? MAIN.find((k) => (times[k] ?? Infinity) > placeNow.min) ?? null
      : null

  const monthRows = useMemo(() => {
    if (view !== 'month' || !valid) return []
    return Array.from({ length: daysInMonth(y, m) }, (_, i) => ({ day: i + 1, t: prayerTimes(y, m, i + 1, spot) }))
  }, [view, valid, y, m, spot])

  const name = (k: PrayerKey) => PRAYER_NAMES[k][idx]
  const monthLabel = valid ? new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''
  const dayLabel = valid ? new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''

  return (
    <div className="space-y-6">
      <div className="space-y-4 print:hidden">
        <LocationPicker spot={spot} onChange={setSpot} />
        <div className="flex flex-wrap items-end gap-4">
          <Segmented
            label={t('Tampilan', 'View')}
            value={view}
            onChange={setView}
            options={[
              { value: 'day', label: t('Harian', 'Daily') },
              { value: 'month', label: t('Sebulan', 'Monthly') },
            ]}
          />
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            {view === 'day' ? t('Tanggal', 'Date') : t('Tanggal (bulan dipakai)', 'Date (its month is used)')}
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(inputCls, 'block')} />
          </label>
          {view === 'month' && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              <Printer className="size-4" />
              {t('Cetak', 'Print')}
            </button>
          )}
        </div>
      </div>

      {times && view === 'day' && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{spot.name}</h2>
            <p className="text-sm text-muted-foreground">{dayLabel}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {MAIN.map((k) => (
              <div key={k} className={cn('rounded-xl border p-4', next === k ? 'border-primary bg-primary/10' : 'bg-muted/40')}>
                <p className="text-xs text-muted-foreground">
                  {name(k)}
                  {next === k && ` · ${t('berikutnya', 'next')}`}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{clock(times[k])}</p>
              </div>
            ))}
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {(['imsak', 'terbit', 'dhuha'] as PrayerKey[]).map((k) => (
              <div key={k} className="flex gap-2">
                <dt>{name(k)}</dt>
                <dd className="font-medium tabular-nums text-foreground">{clock(times[k])}</dd>
              </div>
            ))}
          </dl>
          {PRAYER_ORDER.some((k) => times[k] === null) && (
            <p className="text-xs text-muted-foreground">
              {t('Di lintang setinggi ini, matahari tidak mencapai sudut tertentu pada tanggal ini, jadi sebagian waktu tidak bisa dihitung (–).', 'At this latitude the sun does not reach some angles on this date, so some times cannot be computed (–).')}
            </p>
          )}
        </section>
      )}

      {view === 'month' && monthRows.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">
              {t('Jadwal sholat', 'Prayer times')} — {spot.name}
            </h2>
            <p className="text-sm text-muted-foreground">{monthLabel}</p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-120 text-sm tabular-nums">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t('Tgl', 'Day')}</th>
                  {PRAYER_ORDER.map((k) => (
                    <th key={k} className="px-3 py-2 text-right font-medium">
                      {name(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthRows.map((r) => (
                  <tr key={r.day} className={cn('border-t', r.day === d && 'bg-primary/10')}>
                    <td className="px-3 py-1.5 text-left font-medium">{r.day}</td>
                    {PRAYER_ORDER.map((k) => (
                      <td key={k} className="px-3 py-1.5 text-right">
                        {clock(r.t[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground print:hidden">
        {t(
          'Dihitung di perangkatmu dari posisi matahari, tanpa internet: Subuh 20°, Isya 18°, Asar bayangan 1×, ditambah ihtiyat 2 menit (Imsak 10 menit sebelum Subuh), mengikuti pedoman Kemenag RI. Hasilnya bisa selisih 1–2 menit dari jadwal resmi daerahmu karena ketinggian tempat dan pembulatan, jadi cocokkan dengan jadwal masjid setempat.',
          'Computed on your device from the sun’s position, no internet needed: Fajr 20°, Isha 18°, Asr shadow 1×, plus a 2-minute safety margin (Imsak 10 minutes before Fajr), following Indonesian Ministry of Religious Affairs (Kemenag) guidelines. It can differ by 1–2 minutes from your local official timetable because of altitude and rounding, so check against your local mosque.',
        )}
      </p>
    </div>
  )
}
