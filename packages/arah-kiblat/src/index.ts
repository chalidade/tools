// The headless API. The bearing maths lives with the prayer-times tool
// (src/tools/jadwal-sholat/prayer.ts), which this tool shares with the site.
//
//   import { qibla } from '@chalidade/arah-kiblat'
//   qibla(-6.2088, 106.8456) // { bearing: 295.15…, km: 7921.… }

export { qibla, KAABA } from '@/tools/jadwal-sholat/prayer'
