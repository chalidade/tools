// The headless API. The source lives with the site (src/tools/jadwal-sholat/).
//
//   import { prayerTimes, clock } from '@chalidade/jadwal-sholat'
//   clock(prayerTimes(2025, 3, 1, { lat: -6.2088, lng: 106.8456, tz: 7 }).maghrib)

export {
  prayerTimes,
  clock,
  daysInMonth,
  qibla,
  KAABA,
  PRAYER_ORDER,
  PRAYER_NAMES,
  FAJR_ANGLE,
  ISHA_ANGLE,
  DHUHA_ANGLE,
  IHTIYAT,
  type Place,
  type PrayerKey,
  type PrayerTimes,
} from '@/tools/jadwal-sholat/prayer'
