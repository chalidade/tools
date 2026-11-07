// Pregnancy due date maths. All dates are handled as UTC midnight so daylight
// saving or time zones never shift a day.
const DAY = 86_400_000
export const FULL_TERM_DAYS = 280

/** Parse "YYYY-MM-DD" to UTC ms; NaN when invalid. */
export function parseDay(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return NaN
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3])
  const d = new Date(ms)
  return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? ms : NaN
}

export function fmtDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Naegele's rule: LMP + 280 days, shifted by (cycle length − 28). */
export function dueFromLmp(lmp: number, cycle = 28): number {
  return lmp + (FULL_TERM_DAYS + (cycle - 28)) * DAY
}

/** Due date from an ultrasound that measured `weeks`+`days` on `scanDate`. */
export function dueFromUltrasound(scanDate: number, weeks: number, days: number): number {
  return scanDate + (FULL_TERM_DAYS - (weeks * 7 + days)) * DAY
}

export interface Gestation {
  totalDays: number
  weeks: number
  days: number
  trimester: 1 | 2 | 3
}

/** Gestational age on `today` for a pregnancy due on `due` (negative before conception window is clamped by caller). */
export function gestation(due: number, today: number): Gestation {
  const totalDays = FULL_TERM_DAYS - Math.round((due - today) / DAY)
  const w = Math.floor(totalDays / 7)
  return { totalDays, weeks: w, days: totalDays - w * 7, trimester: w < 14 ? 1 : w < 28 ? 2 : 3 }
}

/** [id, en] labels. Weeks follow common antenatal practice. */
export const MILESTONES: { week: number; label: [string, string] }[] = [
  { week: 4, label: ['Terlambat haid, tes kehamilan mulai positif', 'Missed period; pregnancy test turns positive'] },
  { week: 8, label: ['Kunjungan pertama ke bidan/dokter (K1) dan USG awal', 'First antenatal visit and early ultrasound'] },
  { week: 12, label: ['Akhir trimester pertama; skrining awal', 'End of first trimester; early screening'] },
  { week: 20, label: ['USG anatomi (organ bayi)', 'Anatomy ultrasound'] },
  { week: 24, label: ['Skrining diabetes kehamilan (24–28 minggu)', 'Gestational diabetes screening (24–28 weeks)'] },
  { week: 28, label: ['Mulai trimester ketiga', 'Third trimester begins'] },
  { week: 37, label: ['Dianggap cukup bulan', 'Considered full term'] },
  { week: 40, label: ['Hari perkiraan lahir (HPL)', 'Estimated due date'] },
]

/** Date a milestone week begins, given the due date. */
export function milestoneDate(due: number, week: number): number {
  return due - (FULL_TERM_DAYS - week * 7) * DAY
}
