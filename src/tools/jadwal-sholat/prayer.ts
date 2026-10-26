// Prayer times computed from the sun's position (Meeus low-precision
// formulas, good to well under a minute). Parameters follow Kemenag RI:
// Fajr 20°, Isha 18°, Asr with shadow length 1×, sunrise/sunset at −0.833°,
// plus a small safety margin (ihtiyat).

export interface Place {
  lat: number
  lng: number
  /** Hours ahead of UTC at the place (7 = WIB). */
  tz: number
}

export type PrayerKey = 'imsak' | 'subuh' | 'terbit' | 'dhuha' | 'zuhur' | 'asar' | 'maghrib' | 'isya'

export const PRAYER_ORDER: PrayerKey[] = ['imsak', 'subuh', 'terbit', 'dhuha', 'zuhur', 'asar', 'maghrib', 'isya']

/** Names as [Indonesian, English]. */
export const PRAYER_NAMES: Record<PrayerKey, [string, string]> = {
  imsak: ['Imsak', 'Imsak'],
  subuh: ['Subuh', 'Fajr'],
  terbit: ['Terbit', 'Sunrise'],
  dhuha: ['Dhuha', 'Duha'],
  zuhur: ['Zuhur', 'Dhuhr'],
  asar: ['Asar', 'Asr'],
  maghrib: ['Maghrib', 'Maghrib'],
  isya: ['Isya', 'Isha'],
}

/** Times as minutes after local midnight; null when the sun never reaches that angle. */
export type PrayerTimes = Record<PrayerKey, number | null>

export const FAJR_ANGLE = 20
export const ISHA_ANGLE = 18
export const DHUHA_ANGLE = 4.5
export const IHTIYAT = 2

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** Julian day of a UTC instant given in milliseconds. */
const julian = (ms: number) => ms / 86400000 + 2440587.5

function sunPosition(jd: number) {
  const d = jd - 2451545.0
  const g = rad((357.529 + 0.98560028 * d) % 360)
  const q = (280.459 + 0.98564736 * d) % 360
  const L = rad((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360)
  const e = rad(23.439 - 0.00000036 * d)
  const ra = ((deg(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))) % 360) + 360) % 360 / 15
  const decl = Math.asin(Math.sin(e) * Math.sin(L))
  let eqt = q / 15 - ra
  eqt = ((eqt + 12) % 24 + 24) % 24 - 12
  return { decl, eqt }
}

/** Hours (not days) from solar noon to the sun reaching `altitude` degrees; NaN if never. */
function hourAngle(lat: number, decl: number, altitude: number) {
  const phi = rad(lat)
  const c = (Math.sin(rad(altitude)) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl))
  if (c < -1 || c > 1) return NaN
  return deg(Math.acos(c)) / 15
}

/** Prayer times for a calendar day (y, m 1–12, d) at a place. */
export function prayerTimes(y: number, m: number, d: number, p: Place): PrayerTimes {
  // Sun position at local noon is accurate enough for the whole day.
  const noonUtc = Date.UTC(y, m - 1, d, 12) - p.tz * 3600000
  const { decl, eqt } = sunPosition(julian(noonUtc))
  const noon = 12 + p.tz - p.lng / 15 - eqt // local clock hours
  const at = (alt: number, sign: 1 | -1) => {
    const h = hourAngle(p.lat, decl, alt)
    return Number.isNaN(h) ? null : (noon + sign * h) * 60
  }
  const asrAlt = deg(Math.atan(1 / (1 + Math.tan(Math.abs(rad(p.lat) - decl)))))
  const plus = (v: number | null, min: number) => (v === null ? null : v + min)
  const subuh = plus(at(-FAJR_ANGLE, -1), IHTIYAT)
  return {
    imsak: plus(subuh, -10),
    subuh,
    terbit: plus(at(-0.833, -1), -IHTIYAT),
    dhuha: at(DHUHA_ANGLE, -1),
    zuhur: noon * 60 + IHTIYAT,
    asar: plus(at(asrAlt, 1), IHTIYAT),
    maghrib: plus(at(-0.833, 1), IHTIYAT),
    isya: plus(at(-ISHA_ANGLE, 1), IHTIYAT),
  }
}

/** "04:07" for minutes after midnight (rounded to the nearest minute). */
export function clock(min: number | null): string {
  if (min === null) return '–'
  const t = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** Great-circle bearing (degrees from true north) and distance (km) to the Kaaba. */
export const KAABA = { lat: 21.4225, lng: 39.8262 }

export function qibla(lat: number, lng: number) {
  const p1 = rad(lat)
  const p2 = rad(KAABA.lat)
  const dl = rad(KAABA.lng - lng)
  const bearing = (deg(Math.atan2(Math.sin(dl), Math.cos(p1) * Math.tan(p2) - Math.sin(p1) * Math.cos(dl))) + 360) % 360
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  const km = 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)))
  return { bearing, km }
}
