import { useEffect, useState } from 'react'
import { CopyButton } from '@/components/tool/CopyButton'
import { ErrorNote } from '@/components/tool/ErrorNote'
import { Segmented } from '@/components/tool/Segmented'
import { locale, tr, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-xl border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

const DEVICE_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

const ZONES = [
  { zone: 'Asia/Jakarta', label: 'WIB' },
  { zone: 'Asia/Makassar', label: 'WITA' },
  { zone: 'Asia/Jayapura', label: 'WIT' },
  { zone: 'UTC', label: 'UTC' },
]

/** Epoch in seconds, milliseconds, microseconds or nanoseconds (by digit count), or any date text Date can read. */
function parseInput(raw: string): { date: Date; unit?: string } | null {
  const v = raw.trim()
  if (!v) return null
  if (/^-?\d+(\.\d+)?$/.test(v)) {
    const n = Number(v)
    const digits = v.replace(/^-/, '').split('.')[0].length
    if (digits <= 11) return { date: new Date(n * 1000), unit: tr('detik', 'seconds') }
    if (digits <= 14) return { date: new Date(n), unit: tr('milidetik', 'milliseconds') }
    if (digits <= 17) return { date: new Date(n / 1000), unit: tr('mikrodetik', 'microseconds') }
    return { date: new Date(n / 1e6), unit: tr('nanodetik', 'nanoseconds') }
  }
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : { date: d }
}

function relative(date: Date, now: number) {
  const diff = (date.getTime() - now) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ]
  const [unit, secs] = units.find(([, s]) => Math.abs(diff) >= s) ?? units[units.length - 1]
  return rtf.format(Math.round(diff / secs), unit)
}

const inZone = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat(locale(), {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)

/** The wall-clock fields of a date in a zone, for the date-to-epoch input. */
function wallClock(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}:${parts.second}`
}

/** A wall-clock time in a zone → the instant it names. */
function fromWallClock(value: string, timeZone: string) {
  const asUtc = new Date(value + 'Z')
  if (Number.isNaN(asUtc.getTime())) return null
  // Shift by the zone's offset at that moment (twice, to settle across a DST change).
  let t = asUtc.getTime()
  for (let i = 0; i < 2; i++) t = asUtc.getTime() - (new Date(wallClock(new Date(t), timeZone) + 'Z').getTime() - t)
  return new Date(t)
}

export default function Timestamp() {
  const t = useT()
  const [now, setNow] = useState(() => Date.now())
  const [input, setInput] = useState(() => String(Math.floor(Date.now() / 1000)))
  const [zone, setZone] = useState('Asia/Jakarta')
  const [wall, setWall] = useState(() => wallClock(new Date(), 'Asia/Jakarta'))

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const parsed = parseInput(input)
  const picked = fromWallClock(wall, zone)
  const nowSec = String(Math.floor(now / 1000))

  const rows = parsed
    ? [
        ...ZONES.map((z) => ({ label: z.label, value: inZone(parsed.date, z.zone) })),
        ...(ZONES.some((z) => z.zone === DEVICE_ZONE) ? [] : [{ label: t('Perangkat', 'Device') + ` (${DEVICE_ZONE})`, value: inZone(parsed.date, DEVICE_ZONE) }]),
        { label: 'ISO 8601', value: parsed.date.toISOString() },
        { label: t('Detik', 'Seconds'), value: String(Math.floor(parsed.date.getTime() / 1000)) },
        { label: t('Milidetik', 'Milliseconds'), value: String(parsed.date.getTime()) },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">{t('Sekarang (Unix, detik)', 'Now (Unix, seconds)')}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">{nowSec}</span>
          <CopyButton text={nowSec} variant="outline" />
          <CopyButton text={String(now)} variant="outline" label={t('Salin ms', 'Copy ms')} />
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t('Timestamp → tanggal', 'Timestamp → date')}</h3>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          aria-label="Timestamp"
          placeholder="1700000000, 1700000000000, 2026-11-20T07:00:00Z"
          className={field}
        />
        {input.trim() && !parsed && <ErrorNote message={t('Bukan timestamp atau tanggal yang dikenali.', 'Not a recognised timestamp or date.')} />}
        {parsed && (
          <>
            <p className="text-sm text-muted-foreground">
              {parsed.unit && t(`Dibaca sebagai ${parsed.unit} · `, `Read as ${parsed.unit} · `)}
              {relative(parsed.date, now)}
            </p>
            <ul className="divide-y rounded-xl border">
              {rows.map((r) => (
                <li key={r.label} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-28 shrink-0 text-xs text-muted-foreground">{r.label}</span>
                  <span className="min-w-0 flex-1 font-mono text-sm break-words">{r.value}</span>
                  <CopyButton text={r.value} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t('Tanggal → timestamp', 'Date → timestamp')}</h3>
        <div className="flex flex-wrap items-end gap-4">
          <input type="datetime-local" step={1} value={wall} onChange={(e) => setWall(e.target.value)} aria-label={t('Tanggal dan jam', 'Date and time')} className={cn(field, 'w-auto')} />
          <Segmented
            label={t('Zona', 'Time zone')}
            value={zone}
            onChange={setZone}
            options={[...ZONES.map((z) => ({ value: z.zone, label: z.label })), ...(ZONES.some((z) => z.zone === DEVICE_ZONE) ? [] : [{ value: DEVICE_ZONE, label: t('Perangkat', 'Device') }])]}
          />
        </div>
        {picked && (
          <ul className="divide-y rounded-xl border">
            {[
              { label: t('Detik', 'Seconds'), value: String(Math.floor(picked.getTime() / 1000)) },
              { label: t('Milidetik', 'Milliseconds'), value: String(picked.getTime()) },
              { label: 'ISO 8601', value: picked.toISOString() },
            ].map((r) => (
              <li key={r.label} className="flex items-center gap-3 px-3 py-2">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{r.label}</span>
                <span className="min-w-0 flex-1 font-mono text-sm break-words">{r.value}</span>
                <CopyButton text={r.value} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted-foreground">
        {t(
          'Panjang angka menentukan satuannya: 10 digit detik, 13 digit milidetik, 16 mikrodetik, 19 nanodetik. Indonesia tidak memakai jam musim panas, jadi WIB selalu UTC+7, WITA UTC+8, dan WIT UTC+9.',
          'The number of digits decides the unit: 10 digits seconds, 13 milliseconds, 16 microseconds, 19 nanoseconds. Indonesia has no daylight saving: WIB is always UTC+7, WITA UTC+8 and WIT UTC+9.',
        )}
      </p>
    </div>
  )
}
