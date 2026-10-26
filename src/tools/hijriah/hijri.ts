// Gregorian ⇄ Hijri through the browser's built-in `islamic-umalqura`
// calendar (Intl). Dates are handled as UTC midnights so the device's time
// zone never shifts the day.

export interface Hijri {
  year: number
  month: number
  day: number
}

export const MIN_YEAR = 1318
export const MAX_YEAR = 1500

const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

/** Months as [Indonesian, English]. */
export const HIJRI_MONTHS: [string, string][] = [
  ['Muharram', 'Muharram'],
  ['Safar', 'Safar'],
  ['Rabiul Awal', 'Rabi’ al-awwal'],
  ['Rabiul Akhir', 'Rabi’ al-thani'],
  ['Jumadil Awal', 'Jumada al-awwal'],
  ['Jumadil Akhir', 'Jumada al-thani'],
  ['Rajab', 'Rajab'],
  ['Syaban', 'Sha’ban'],
  ['Ramadan', 'Ramadan'],
  ['Syawal', 'Shawwal'],
  ['Dzulkaidah', 'Dhu al-Qi’dah'],
  ['Dzulhijjah', 'Dhu al-Hijjah'],
]

const DAY = 86400000

export const utcDate = (y: number, m: number, d: number) => {
  const t = new Date(0)
  t.setUTCFullYear(y, m - 1, d)
  t.setUTCHours(0, 0, 0, 0)
  return t
}

export function toHijri(date: Date): Hijri {
  const parts = fmt.formatToParts(date)
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: n('year'), month: n('month'), day: n('day') }
}

/** Gregorian date of a Hijri date, or null if that day does not exist. */
export function toGregorian({ year, month, day }: Hijri): Date | null {
  if (year < MIN_YEAR || year > MAX_YEAR) return null
  // 1 Muharram 1 AH ≈ 622-07-19; a Hijri year averages 354.367 days.
  const guess = Date.UTC(622, 6, 19) + ((year - 1) * 354.367 + (month - 1) * 29.53 + (day - 1)) * DAY
  const start = new Date(Math.round(guess / DAY) * DAY)
  for (let off = -45; off <= 45; off++) {
    const d = new Date(start.getTime() + off * DAY)
    const h = toHijri(d)
    if (h.year === year && h.month === month && h.day === day) return d
  }
  return null
}

/** Days in a Hijri month (29 or 30). */
export function hijriMonthLength(year: number, month: number): number {
  return toGregorian({ year, month, day: 30 }) ? 30 : 29
}

export interface Holiday {
  month: number
  day: number
  name: [string, string]
}

export const HOLIDAYS: Holiday[] = [
  { month: 1, day: 1, name: ['Tahun Baru Hijriah', 'Islamic New Year'] },
  { month: 1, day: 10, name: ['Hari Asyura', 'Day of Ashura'] },
  { month: 3, day: 12, name: ['Maulid Nabi Muhammad SAW', 'Mawlid (Prophet’s birthday)'] },
  { month: 7, day: 27, name: ['Isra Mikraj', 'Isra and Mi’raj'] },
  { month: 8, day: 15, name: ['Nisfu Syaban', 'Mid-Sha’ban'] },
  { month: 9, day: 1, name: ['Awal Ramadan', 'First day of Ramadan'] },
  { month: 9, day: 17, name: ['Nuzulul Quran', 'Nuzul al-Quran'] },
  { month: 10, day: 1, name: ['Idulfitri', 'Eid al-Fitr'] },
  { month: 12, day: 9, name: ['Hari Arafah', 'Day of Arafah'] },
  { month: 12, day: 10, name: ['Iduladha', 'Eid al-Adha'] },
]

/** Islamic holidays that fall inside a Gregorian year, in date order. */
export function holidaysIn(gregYear: number) {
  const out: { date: Date; name: [string, string]; hijri: Hijri }[] = []
  const approx = Math.floor(((gregYear - 622) * 365.2425) / 354.367) + 1
  for (let y = approx - 1; y <= approx + 1; y++) {
    for (const h of HOLIDAYS) {
      const hijri = { year: y, month: h.month, day: h.day }
      const date = toGregorian(hijri)
      if (date && date.getUTCFullYear() === gregYear) out.push({ date, name: h.name, hijri })
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime())
}
