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
const ARABIC = { imsak: 'الإمساك', subuh: 'الفجر', terbit: 'الشروق', zuhur: 'الظهر', asar: 'العصر', maghrib: 'المغرب', isya: 'العشاء', jumuah: 'الجمعة' }
/** The prayer's name in Arabic, or '' when config.arabic is false. */
export const prayerArabic = (k, date) => (config.arabic === false ? '' : ARABIC[k === 'zuhur' && date && date.getDay() === 5 ? 'jumuah' : k] ?? '')
export const prayerName = (k, date) => (k === 'zuhur' && date && date.getDay() === 5 ? NAMES.jumuah : NAMES[k])[L]

/** config.js may name prayers in English (fajr, sunrise, dhuhr, asr, maghrib, isha); the engine's own keys are Indonesian. */
const ALIAS = { fajr: 'subuh', sunrise: 'terbit', dhuhr: 'zuhur', zuhr: 'zuhur', asr: 'asar', isha: 'isya' }
const keys = (o) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [ALIAS[k] ?? k, v]))
/** Minutes from adhan to iqamah, by prayer. */
export const IQAMAH = keys(config.iqamah)
const ADJUST = keys(config.adjust)

/**
 * Hours ahead of UTC at the mosque on `date`. location.tz is either a number
 * or a zone name such as 'Europe/London', which follows daylight saving.
 */
function tzHours(date = new Date()) {
  const tz = config.location.tz
  if (typeof tz !== 'string') return Number(tz) || 0
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
    const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, Number(x.value)]))
    return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000) / 3600000
  } catch {
    return 0
  }
}

/** Now, as seen at the mosque (its time zone, not the visitor's). */
export function mosqueNow() {
  const tz = tzHours()
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
  const place = { ...config.location, tz: tzHours(new Date(Date.UTC(y, m - 1, d, 12))) }
  const out = { ...prayerTimes(y, m, d, place, method()) }
  for (const [k, v] of Object.entries(ADJUST)) if (out[k] != null) out[k] += Number(v) || 0
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

const DESIGNS = ['calm', 'bold']
/** The design in use: config.design, or ?design=bold to preview one (remembered for the browser tab). */
export const design = (() => {
  try {
    const q = new URLSearchParams(location.search).get('design')
    if (DESIGNS.includes(q)) sessionStorage.setItem('masjid-design', q)
    const kept = sessionStorage.getItem('masjid-design')
    if (DESIGNS.includes(kept)) return kept
  } catch {}
  return DESIGNS.includes(config.design) ? config.design : 'calm'
})()

/** Load the design's stylesheet, then apply the config's colors and the page language. */
export function applyTheme(kind = 'site') {
  const root = document.documentElement
  root.lang = L ? 'id' : 'en'
  if (config.theme?.primary) root.style.setProperty('--primary', config.theme.primary)
  if (config.theme?.accent) root.style.setProperty('--accent', config.theme.accent)
  // The page stays hidden until its stylesheet is in (see the <style> in each page's head).
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `assets/css/${design}${kind === 'display' ? '-display' : ''}.css`
  link.onload = link.onerror = () => (root.dataset.design = design)
  document.head.append(link)
  if (config.designSwitcher) switcher()
}

/** A small Calm / Bold switch for trying the designs (config.designSwitcher). */
function switcher() {
  const el = document.createElement('div')
  el.className = 'design-switch'
  const url = (d) => { const u = new URL(location.href); u.searchParams.set('design', d); return u.search + u.hash }
  el.innerHTML =
    '<style>.design-switch{position:fixed;left:16px;bottom:16px;z-index:50;display:flex;gap:2px;padding:3px;border-radius:999px;background:#141815;font:500 12px/1 system-ui,sans-serif;box-shadow:0 8px 24px -8px rgb(0 0 0/.5);transition:opacity .3s}.design-switch a{padding:8px 13px;border-radius:999px;color:#f5f3ee;text-decoration:none;opacity:.65}.design-switch a[aria-current]{background:#f5f3ee;color:#141815;opacity:1}body.idle .design-switch{opacity:0}@media print{.design-switch{display:none}}</style>' +
    DESIGNS.map((d) => `<a href="${esc(url(d))}"${d === design ? ' aria-current="true"' : ''}>${d[0].toUpperCase() + d.slice(1)}</a>`).join('')
  document.body.append(el)
}

/** Fill every [data-t] element with its translation: data-t="English|Indonesia". */
export function translate(scope = document) {
  for (const el of scope.querySelectorAll('[data-t]')) {
    const [en, id] = el.dataset.t.split('|')
    el.textContent = t(en, id ?? en)
  }
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
