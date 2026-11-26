// Shared by every page: config, language, the church's clock, services and events.
import config from '../../config.js'

export { config }

const L = config.lang === 'id' ? 1 : 0
/** Pick the English or Indonesian string. */
export const t = (en, id) => (L ? id : en)
export const locale = L ? 'id-ID' : 'en-GB'

export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAY_NAMES = [
  ['Sunday', 'Minggu'], ['Monday', 'Senin'], ['Tuesday', 'Selasa'], ['Wednesday', 'Rabu'],
  ['Thursday', 'Kamis'], ['Friday', 'Jumat'], ['Saturday', 'Sabtu'],
]
/** "Sunday" for a day index 0–6. */
export const dayName = (i) => DAY_NAMES[i][L]
/** "Sun" for a day index 0–6. */
export const dayShort = (i) => new Date(2026, 10, 1 + i).toLocaleDateString(locale, { weekday: 'short' })

/** "HH:MM" from minutes after midnight. */
export const clock = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
const parseTime = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? '').trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** Hours ahead of UTC at the church on `date` (config.timeZone follows daylight saving). */
function tzHours(date = new Date()) {
  const tz = config.timeZone
  if (typeof tz === 'number') return tz
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
    const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, Number(x.value)]))
    return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000) / 3600000
  } catch {
    return -new Date().getTimezoneOffset() / 60
  }
}

/** Now, as seen at the church (its time zone, not the visitor's). */
export function churchNow() {
  const d = new Date(Date.now() + tzHours() * 3600000)
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    /** Minutes after the church's midnight, with seconds as a fraction. */
    min: d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60,
    /** A Date whose local fields read as the church's calendar day (for weekday and formatting). */
    day: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  }
}

/** Services, cleaned up and in weekly order. */
export const SERVICES = (config.services ?? [])
  .map((s) => ({ ...s, dow: DAYS.indexOf(String(s.day).slice(0, 3).toLowerCase()), start: parseTime(s.time), minutes: Number(s.minutes) || 75 }))
  .filter((s) => s.dow >= 0 && s.start != null)
  .sort((a, b) => a.dow - b.dow || a.start - b.start)

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const isoDate = iso
export const fromIso = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d) }

/** Services and events on a calendar day, by start time. */
export function onDay(day) {
  const dow = day.getDay()
  const out = SERVICES.filter((s) => s.dow === dow).map((s) => ({ kind: 'service', title: s.name, note: s.note, start: s.start, minutes: s.minutes }))
  for (const e of config.events ?? []) {
    const weekly = e.every && DAYS.indexOf(String(e.every).slice(0, 3).toLowerCase()) === dow
    if (weekly || (e.date && e.date === iso(day))) out.push({ kind: 'event', title: e.title, note: e.place, tag: e.tag, start: parseTime(e.time), weekly: !!weekly })
  }
  return out.sort((a, b) => (a.start ?? 9999) - (b.start ?? 9999))
}

/**
 * The next service from now (or the one under way), up to a week ahead.
 * `at` is minutes from the church's midnight today; `live` means it has started and not ended.
 */
export function nextService(now = churchNow()) {
  if (!SERVICES.length) return null
  for (let ahead = 0; ahead <= 7; ahead++) {
    const dow = (now.day.getDay() + ahead) % 7
    for (const s of SERVICES.filter((x) => x.dow === dow)) {
      const at = ahead * 1440 + s.start
      if (at + s.minutes > now.min) return { ...s, at, ahead, live: at <= now.min, date: new Date(now.y, now.m - 1, now.d + ahead) }
    }
  }
  return null
}

/** The next few services and events with a time, from now on (for the TV display). */
export function upcoming(now = churchNow(), count = 6) {
  const out = []
  for (let ahead = 0; ahead < 14 && out.length < count; ahead++) {
    const day = new Date(now.y, now.m - 1, now.d + ahead)
    for (const x of onDay(day)) {
      if (x.start == null) continue
      const at = ahead * 1440 + x.start
      if (at + (x.minutes ?? 60) <= now.min) continue
      out.push({ ...x, at, ahead, day })
      if (out.length >= count) break
    }
  }
  return out
}

/** "1d 04h" / "2h 05m" / "12m 30s" until a time in minutes. */
export function until(at, now = churchNow().min) {
  const s = Math.max(0, Math.round((at - now) * 60))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (d) return `${d}${t('d', 'h')} ${pad(h)}${t('h', 'j')}`
  if (h) return `${h}${t('h', 'j')} ${pad(m)}m`
  return `${m}m ${pad(sec)}${t('s', 'd')}`
}

/** "Today", "Tomorrow" or the weekday, for a day a number of days ahead. */
export const whenDay = (ahead, date) => (ahead === 0 ? t('Today', 'Hari ini') : ahead === 1 ? t('Tomorrow', 'Besok') : dayName(date.getDay()))

export const dateText = (day, opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) => day.toLocaleDateString(locale, opts)

const DESIGNS = ['calm', 'bold']
/** The design in use: config.design, or ?design=bold to preview one (remembered for the browser tab). */
export const design = (() => {
  try {
    const q = new URLSearchParams(location.search).get('design')
    if (DESIGNS.includes(q)) sessionStorage.setItem('church-design', q)
    const kept = sessionStorage.getItem('church-design')
    if (DESIGNS.includes(kept)) return kept
  } catch {}
  return DESIGNS.includes(config.design) ? config.design : 'bold'
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
  const ready = new Promise((done) => (link.onload = link.onerror = () => { root.dataset.design = design; done() }))
  document.head.append(link)
  if (config.designSwitcher) switcher()
  /** Resolves once the stylesheet is in and its fonts have loaded. */
  return ready.then(() => new Promise(requestAnimationFrame)).then(() => document.fonts.ready)
}

/** A small Calm / Bold switch for trying the designs (config.designSwitcher). */
function switcher() {
  const el = document.createElement('div')
  el.className = 'design-switch'
  const url = (d) => { const u = new URL(location.href); u.searchParams.set('design', d); return u.search + u.hash }
  el.innerHTML =
    '<style>.design-switch{position:fixed;left:16px;bottom:16px;z-index:50;display:flex;gap:2px;padding:3px;border-radius:999px;background:#141c3a;font:500 12px/1 system-ui,sans-serif;box-shadow:0 8px 24px -8px rgb(0 0 0/.5);transition:opacity .3s}.design-switch a{padding:8px 13px;border-radius:999px;color:#f5f1e8;text-decoration:none;opacity:.65}.design-switch a[aria-current]{background:#f5f1e8;color:#141c3a;opacity:1}body.idle .design-switch{opacity:0}@media print{.design-switch{display:none}}</style>' +
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
