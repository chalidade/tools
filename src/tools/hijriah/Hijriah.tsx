import { useMemo, useState } from 'react'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useLang, useT } from '@/lib/i18n'
import {
  HIJRI_MONTHS,
  MAX_YEAR,
  MIN_YEAR,
  hijriMonthLength,
  holidaysIn,
  toGregorian,
  toHijri,
  utcDate,
} from './hijri'

const inputCls =
  'w-full rounded-lg border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

const todayUtc = () => {
  const n = new Date()
  return utcDate(n.getFullYear(), n.getMonth() + 1, n.getDate())
}
const iso = (d: Date) => d.toISOString().slice(0, 10)

export default function Hijriah() {
  const t = useT()
  const idx = useLang() === 'en' ? 1 : 0
  const today = todayUtc()
  const [mode, setMode] = useState<'toH' | 'toG'>('toH')
  const [gDate, setGDate] = useState(iso(today))
  const th = toHijri(today)
  const [hy, setHy] = useState(String(th.year))
  const [hm, setHm] = useState(th.month)
  const [hd, setHd] = useState(String(th.day))
  const [holYear, setHolYear] = useState(today.getUTCFullYear())

  const dateText = (d: Date, long = true) =>
    d.toLocaleDateString(locale(), { weekday: long ? 'long' : undefined, day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const hijriText = (h: { year: number; month: number; day: number }) => `${h.day} ${HIJRI_MONTHS[h.month - 1][idx]} ${h.year} H`

  const parsedG = /^\d{4}-\d{2}-\d{2}$/.test(gDate) ? new Date(`${gDate}T00:00:00Z`) : null
  const gResult = parsedG && !Number.isNaN(parsedG.getTime()) ? toHijri(parsedG) : null
  const gInRange = gResult && gResult.year >= MIN_YEAR && gResult.year <= MAX_YEAR

  const yNum = Number(hy)
  const dNum = Number(hd)
  const hValid = Number.isInteger(yNum) && yNum >= MIN_YEAR && yNum <= MAX_YEAR && Number.isInteger(dNum) && dNum >= 1
  const monthLen = hValid ? hijriMonthLength(yNum, hm) : 30
  const hResult = hValid && dNum <= monthLen ? toGregorian({ year: yNum, month: hm, day: dNum }) : null

  const holidays = useMemo(() => holidaysIn(holYear), [holYear])

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Segmented
          label={t('Arah konversi', 'Direction')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'toH', label: t('Masehi → Hijriah', 'Gregorian → Hijri') },
            { value: 'toG', label: t('Hijriah → Masehi', 'Hijri → Gregorian') },
          ]}
        />

        {mode === 'toH' ? (
          <>
            <label className="block max-w-xs space-y-1 text-xs font-medium text-muted-foreground">
              {t('Tanggal Masehi', 'Gregorian date')}
              <input type="date" value={gDate} onChange={(e) => setGDate(e.target.value)} className={inputCls} />
            </label>
            {gResult && gInRange && (
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{dateText(parsedG!)}</p>
                <p className="mt-1 text-2xl font-semibold">{hijriText(gResult)}</p>
              </div>
            )}
            {gResult && !gInRange && (
              <p className="text-sm text-destructive">{t(`Kalender hanya mencakup tahun ${MIN_YEAR}–${MAX_YEAR} H.`, `The calendar only covers ${MIN_YEAR}–${MAX_YEAR} AH.`)}</p>
            )}
          </>
        ) : (
          <>
            <div className="grid max-w-xl grid-cols-[5rem_1fr_6rem] gap-3">
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                {t('Tanggal', 'Day')}
                <input inputMode="numeric" value={hd} onChange={(e) => setHd(e.target.value)} className={inputCls} />
              </label>
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                {t('Bulan', 'Month')}
                <select value={hm} onChange={(e) => setHm(Number(e.target.value))} className={inputCls}>
                  {HIJRI_MONTHS.map((n, i) => (
                    <option key={n[0]} value={i + 1}>
                      {i + 1}. {n[idx]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                {t('Tahun H', 'Year AH')}
                <input inputMode="numeric" value={hy} onChange={(e) => setHy(e.target.value)} className={inputCls} />
              </label>
            </div>
            {hResult && (
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">{hijriText({ year: yNum, month: hm, day: dNum })}</p>
                <p className="mt-1 text-2xl font-semibold">{dateText(hResult)}</p>
              </div>
            )}
            {!hResult && (
              <p className="text-sm text-destructive">
                {!hValid
                  ? t(`Isi tahun ${MIN_YEAR}–${MAX_YEAR} H dan tanggal yang benar.`, `Enter a year between ${MIN_YEAR} and ${MAX_YEAR} AH and a valid day.`)
                  : t(`${HIJRI_MONTHS[hm - 1][0]} ${yNum} H hanya punya ${monthLen} hari.`, `${HIJRI_MONTHS[hm - 1][1]} ${yNum} AH has only ${monthLen} days.`)}
              </p>
            )}
          </>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">{t('Hari besar Islam', 'Islamic holidays')}</h2>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={t('Tahun sebelumnya', 'Previous year')} onClick={() => setHolYear((y) => y - 1)} className="rounded-lg border px-3 py-1.5 hover:bg-muted">
              ‹
            </button>
            <span className="min-w-14 text-center font-semibold tabular-nums">{holYear}</span>
            <button type="button" aria-label={t('Tahun berikutnya', 'Next year')} onClick={() => setHolYear((y) => y + 1)} className="rounded-lg border px-3 py-1.5 hover:bg-muted">
              ›
            </button>
          </div>
        </div>
        <ul className="divide-y rounded-xl border">
          {holidays.map((h) => (
            <li key={h.name[0] + h.hijri.year} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
              <div>
                <p className="font-medium">{h.name[idx]}</p>
                <p className="text-xs text-muted-foreground">{hijriText(h.hijri)}</p>
              </div>
              <p className="text-sm tabular-nums">{dateText(h.date)}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        {t(
          'Memakai kalender Umm al-Qura bawaan browser (Intl). Tanggal resmi di Indonesia ditetapkan Kemenag lewat sidang isbat dan rukyat hilal, jadi bisa selisih satu hari, terutama untuk awal Ramadan, Idulfitri, dan Iduladha. Anggap hasil ini perkiraan dan ikuti pengumuman resmi.',
          'Uses the Umm al-Qura calendar built into your browser (Intl). Official dates in Indonesia are set by Kemenag through the isbat meeting and moon sighting, so they can differ by one day, especially for the start of Ramadan, Eid al-Fitr and Eid al-Adha. Treat these as estimates and follow the official announcement.',
        )}
      </p>
    </div>
  )
}
