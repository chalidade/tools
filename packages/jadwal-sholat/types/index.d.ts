// Public types of @chalidade/jadwal-sholat. They mirror
// src/tools/jadwal-sholat/prayer.ts; types/check.ts fails the build if they drift.

export interface Place {
  lat: number
  lng: number
  /** Hours ahead of UTC at the place (7 = WIB, 8 = WITA, 9 = WIT). */
  tz: number
}

/** Indonesian keys: imsak, subuh (Fajr), terbit (sunrise), dhuha, zuhur (Dhuhr), asar (Asr), maghrib, isya (Isha). */
export type PrayerKey = 'imsak' | 'subuh' | 'terbit' | 'dhuha' | 'zuhur' | 'asar' | 'maghrib' | 'isya'

/** Times as minutes after local midnight; null when the sun never reaches that angle (high latitudes). */
export type PrayerTimes = Record<PrayerKey, number | null>

/** The keys in the order of the day. */
export declare const PRAYER_ORDER: PrayerKey[]
/** Names as [Indonesian, English]. */
export declare const PRAYER_NAMES: Record<PrayerKey, [string, string]>
/** Sun depression for Fajr (subuh), degrees below the horizon. Kemenag RI: 20. */
export declare const FAJR_ANGLE = 20
/** Sun depression for Isha, degrees. Kemenag RI: 18. */
export declare const ISHA_ANGLE = 18
/** Sun altitude for Dhuha, degrees above the horizon. */
export declare const DHUHA_ANGLE = 4.5
/** Safety margin (ihtiyat) in minutes added to each time. */
export declare const IHTIYAT = 2

/** Prayer times for a calendar day (month 1–12) at a place. */
export declare function prayerTimes(y: number, m: number, d: number, p: Place): PrayerTimes
/** "04:07" for minutes after midnight, rounded to the minute; "–" for null. */
export declare function clock(min: number | null): string
/** Days in a month (1–12). */
export declare const daysInMonth: (y: number, m: number) => number
/** The Kaaba in Mecca. */
export declare const KAABA: { lat: number; lng: number }
/** Great-circle bearing to the Kaaba (degrees clockwise from true north) and the distance in km. */
export declare function qibla(lat: number, lng: number): { bearing: number; km: number }
