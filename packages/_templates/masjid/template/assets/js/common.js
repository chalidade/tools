// Shared by every page: config, language, prayer times, dates.
import config from '../../config.js'
import { prayerTimes, clock, METHODS } from '../toowl/jadwal-sholat.js'
import { toHijri, utcDate, HIJRI_MONTHS } from '../toowl/hijriah.js'

export { config, clock }

const L = config.lang === 'id' ? 1 : 0
/** Pick the English or Indonesian string. */
export const t = (en, id) => (L ? id : en)
export const locale = L ? 'id-ID' : 'en-GB'

/** The five daily prayers plus sunrise, in the order of the day. */
export const PRAYERS = ['subuh', 'terbit', 'zuhur', 'asar', 'maghrib', 'isya']
export const FARD = ['subuh', 'zuhur', 'asar', 'maghrib', 'isya']
const NAMES = {
  imsak: ['Imsak', 'Imsak'],
  subuh: ['Fajr', 'Subuh'],
  terbit: ['Sunrise', 'Terbit'],
  zuhur: ['Dhuhr', 'Zuhur'],
  asar: ['Asr', 'Asar'],
  maghrib: ['Maghrib', 'Maghrib'],
  isya: ['Isha', 'Isya'],
  jumuah: ['Jumuah', 'Jumat'],
}
export const prayerName = (k, date) => (k === 'zuhur' && date && date.getDay() === 5 ? NAMES.jumuah : NAMES[k])[L]

/** Now, as seen at the mosque (its time zone, not the visitor's). */
export function mosqueNow() {
  const tz = config.location.tz
  const d = new Date(Date.now() + tz * 3600000)
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    /** Minutes after the mosque's midnight, with seconds as a fraction. */
    min: d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60,
    /** A Date whose local fields read as the mosque's calendar day (for weekday and formatting). */
    day: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    sec: d.getUTCSeconds(),
  }
}

const method = () => ({ ...(METHODS[config.method] ?? METHODS.kemenag), asr: config.asr === 2 ? 2 : 1 })

/** Times for a day, minutes after midnight, with the config's adjustments. */
export function timesFor(y, m, d) {
  const raw = prayerTimes(y, m, d, config.location, method())
  const out = { ...raw }
  for (const [k, v] of Object.entries(config.adjust ?? {})) if (out[k] != null) out[k] += Number(v) || 0
  const day = new Date(y, m - 1, d)
  if (day.getDay() === 5 && /^\d{1,2}:\d{2}$/.test(config.jumuah?.time ?? '')) {
    const [h, mm] = config.jumuah.time.split(':').map(Number)
    out.zuhur = h * 60 + mm
  }
  return out
}

/** The next fard prayer after `min` today, or tomorrow's Fajr. */
export function nextPrayer(now = mosqueNow()) {
  const today = timesFor(now.y, now.m, now.d)
  for (const k of FARD) if (today[k] != null && today[k] > now.min) return { key: k, at: today[k], tomorrow: false }
  const tm = new Date(Date.UTC(now.y, now.m - 1, now.d + 1))
  const next = timesFor(tm.getUTCFullYear(), tm.getUTCMonth() + 1, tm.getUTCDate())
  return { key: 'subuh', at: next.subuh + 1440, tomorrow: true }
}

/** "1h 05m" / "12m 30s" until a time in minutes. */
export function until(at, now = mosqueNow().min) {
  const s = Math.max(0, Math.round((at - now) * 60))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h ? `${h}${t('h', 'j')} ${String(m).padStart(2, '0')}m` : `${m}m ${String(sec).padStart(2, '0')}${t('s', 'd')}`
}

export const MONTHS_HIJRI = HIJRI_MONTHS.map((n) => n[L ? 0 : 1])

/** "12 Jumada al-Akhirah 1448 H" for a Gregorian day, with the config's offset. */
export function hijriText(y, m, d) {
  const date = utcDate(y, m, d)
  date.setUTCDate(date.getUTCDate() + (Number(config.hijriOffset) || 0))
  const h = toHijri(date)
  return `${h.day} ${MONTHS_HIJRI[h.month - 1]} ${h.year} H`
}

export const gregText = (day, opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) =>
  day.toLocaleDateString(locale, opts)

/** Apply the theme colors and the page language. */
export function applyTheme() {
  const root = document.documentElement
  root.lang = L ? 'id' : 'en'
  if (config.theme?.primary) root.style.setProperty('--primary', config.theme.primary)
  if (config.theme?.accent) root.style.setProperty('--accent', config.theme.accent)
}

/** Fill every [data-t] element with its translation: data-t="English|Indonesia". */
export function translate(scope = document) {
  for (const el of scope.querySelectorAll('[data-t]')) {
    const [en, id] = el.dataset.t.split('|')
    el.textContent = t(en, id ?? en)
  }
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
