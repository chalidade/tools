import { useMemo, useState } from 'react'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { locale, useLang, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { CronError, describe, nextRuns, parseCron } from './cron'

const field =
  'rounded-xl border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

type Preset = 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly'

const COLUMNS = [
  ['detik', 'second'],
  ['menit', 'minute'],
  ['jam', 'hour'],
  ['tanggal', 'day'],
  ['bulan', 'month'],
  ['hari', 'weekday'],
] as const

function build(preset: Preset, n: number, time: string, day: number, date: number) {
  const [h, m] = time.split(':').map(Number)
  switch (preset) {
    case 'minutes':
      return `*/${n} * * * *`
    case 'hourly':
      return `${m} * * * *`
    case 'daily':
      return `${m} ${h} * * *`
    case 'weekly':
      return `${m} ${h} * * ${day}`
    case 'monthly':
      return `${m} ${h} ${date} * *`
  }
}

export default function Cron() {
  const t = useT()
  const lang = useLang()
  const [expr, setExpr] = useState('*/15 9-17 * * 1-5')
  const [preset, setPreset] = useState<Preset>('daily')
  const [n, setN] = useState(15)
  const [time, setTime] = useState('08:00')
  const [day, setDay] = useState(1)
  const [date, setDate] = useState(1)

  const result = useMemo(() => {
    try {
      const p = parseCron(expr)
      return { p, text: describe(p), runs: nextRuns(p, new Date()), error: null as CronError | null }
    } catch (e) {
      return { p: null, text: '', runs: [], error: e instanceof CronError ? e : new CronError(String(e), -1) }
    }
    // lang: the sentence is rebuilt in the new language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expr, lang])

  const parts = expr.trim().split(/\s+/).filter(Boolean)
  const six = parts.length === 6
  const cols = six ? COLUMNS : COLUMNS.slice(1)
  const fmt = (d: Date, timeZone?: string) =>
    new Intl.DateTimeFormat(locale(), { timeZone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: six ? '2-digit' : undefined, hour12: false }).format(d)
  const dayNames = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale(), { weekday: 'long' }).format(new Date(2024, 0, 7 + i)))

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <input value={expr} onChange={(e) => setExpr(e.target.value)} spellCheck={false} aria-label={t('Ekspresi cron', 'Cron expression')} className={cn(field, 'w-full text-lg')} />
        <div className={cn('grid gap-1 text-center text-[11px] text-muted-foreground', six ? 'grid-cols-6' : 'grid-cols-5')}>
          {cols.map(([id, en], i) => (
            <div key={id} className={cn('rounded-lg border px-1 py-1', result.error?.field === i && 'border-destructive text-destructive')}>
              <div className="font-mono text-xs text-foreground">{parts[i] ?? '–'}</div>
              {t(id, en)}
            </div>
          ))}
        </div>
      </div>

      {result.error ? (
        <ErrorNote message={result.error.message} />
      ) : (
        <div className="space-y-4">
          <p className="rounded-2xl border bg-card p-4 text-lg font-medium tracking-tight">{result.text}</p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t('5 jadwal berikutnya', 'Next 5 runs')}</p>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">{t('Zona perangkat', 'Device time zone')}</th>
                    <th className="px-3 py-1.5 font-medium">UTC</th>
                  </tr>
                </thead>
                <tbody>
                  {result.runs.map((d) => (
                    <tr key={d.getTime()} className="border-t font-mono text-xs">
                      <td className="px-3 py-1.5 whitespace-nowrap">{fmt(d)}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{fmt(d, 'UTC')}</td>
                    </tr>
                  ))}
                  {!result.runs.length && (
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-muted-foreground">
                        {t('Tidak pernah jalan dalam 5 tahun ke depan (mis. 31 Februari).', 'Never runs in the next 5 years (e.g. 31 February).')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3 rounded-2xl border p-4">
        <h3 className="text-sm font-medium">{t('Buat ekspresi', 'Build an expression')}</h3>
        <Segmented
          label={t('Jadwal', 'Schedule')}
          value={preset}
          onChange={setPreset}
          options={[
            { value: 'minutes', label: t('Tiap N menit', 'Every N minutes') },
            { value: 'hourly', label: t('Tiap jam', 'Hourly') },
            { value: 'daily', label: t('Tiap hari', 'Daily') },
            { value: 'weekly', label: t('Tiap minggu', 'Weekly') },
            { value: 'monthly', label: t('Tiap bulan', 'Monthly') },
          ]}
        />
        <div className="flex flex-wrap items-end gap-3 text-xs font-medium text-muted-foreground">
          {preset === 'minutes' ? (
            <label className="space-y-1">
              <span className="block">{t('Tiap berapa menit', 'Every how many minutes')}</span>
              <select value={n} onChange={(e) => setN(Number(e.target.value))} className={field}>
                {[1, 2, 5, 10, 15, 20, 30].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="space-y-1">
              <span className="block">{preset === 'hourly' ? t('Menit ke', 'At minute') : t('Jam', 'Time')}</span>
              {preset === 'hourly' ? (
                <input type="number" min={0} max={59} value={Number(time.split(':')[1])} onChange={(e) => setTime(`00:${String(Math.min(59, Math.max(0, Number(e.target.value) || 0))).padStart(2, '0')}`)} className={cn(field, 'w-24')} />
              ) : (
                <input type="time" value={time} onChange={(e) => setTime(e.target.value || '00:00')} className={field} />
              )}
            </label>
          )}
          {preset === 'weekly' && (
            <label className="space-y-1">
              <span className="block">{t('Hari', 'Day')}</span>
              <select value={day} onChange={(e) => setDay(Number(e.target.value))} className={field}>
                {dayNames.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
          {preset === 'monthly' && (
            <label className="space-y-1">
              <span className="block">{t('Tanggal', 'Day of month')}</span>
              <input type="number" min={1} max={31} value={date} onChange={(e) => setDate(Math.min(31, Math.max(1, Number(e.target.value) || 1)))} className={cn(field, 'w-24')} />
            </label>
          )}
          <button type="button" onClick={() => setExpr(build(preset, n, time, day, date))} className="h-10 rounded-xl bg-gradient-brand px-4 text-sm font-semibold text-brand-ink">
            {t('Pakai', 'Use')}
          </button>
          <CopyButton text={expr} variant="outline" label={t('Salin ekspresi', 'Copy expression')} />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        {t(
          'Format crontab standar: menit, jam, tanggal, bulan, hari (0 atau 7 = Minggu), plus 6 kolom dengan detik di depan seperti Quartz atau node-cron. Mendukung * , - / dan nama (JAN, MON) serta @daily, @hourly, dan sejenisnya. Bila tanggal dan hari sama-sama diisi, jadwal jalan saat salah satunya cocok.',
          'Standard crontab: minute, hour, day of month, month, weekday (0 or 7 = Sunday), plus 6 fields with seconds first as in Quartz or node-cron. Supports * , - / and names (JAN, MON) and @daily, @hourly and the like. When both day of month and weekday are set, it runs when either matches.',
        )}
      </p>
    </div>
  )
}
