// Public types of @chalidade/arah-kiblat. They mirror
// src/tools/jadwal-sholat/prayer.ts; types/check.ts fails the build if they drift.

/** The Kaaba in Mecca. */
export declare const KAABA: { lat: number; lng: number }
/** Great-circle bearing to the Kaaba (degrees clockwise from true north) and the distance in km. */
export declare function qibla(lat: number, lng: number): { bearing: number; km: number }
