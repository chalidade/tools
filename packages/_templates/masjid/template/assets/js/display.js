import { config, t, clock, PRAYERS, FARD, prayerName, prayerArabic, mosqueNow, timesFor, nextPrayer, until, hijriText, gregText, applyTheme, translate, esc } from './common.js'

const $ = (id) => document.getElementById(id)
applyTheme()
translate()
document.title = `${config.name} · ${t('Display', 'Layar')}`
$('name').textContent = config.name

const D = { adhan: 3, prayer: 10, slideSeconds: 12, slides: [], ...config.display }

// Preview a moment with ?at=HH:MM (handy for testing the adhan and iqamah screens).
const at = new URLSearchParams(location.search).get('at')
let offset = 0
if (/^\d{1,2}:\d{2}$/.test(at ?? '')) {
  const [h, m] = at.split(':').map(Number)
  offset = h * 60 + m - mosqueNow().min
}
const now = () => {
  const n = mosqueNow()
  n.min += offset
  return n
}

// Ticker
const notices = config.announcements ?? []
$('ticker').innerHTML = notices.map((n) => `<span>${esc(n)}</span>`).join('')
$('ticker').style.setProperty('--dur', `${Math.max(25, notices.join(' ').length * 0.28)}s`)
$('ticker').parentElement.hidden = !notices.length

// Slides
const slides = D.slides.length ? D.slides : [{ title: config.tagline, source: '' }]
let si = 0
function showSlide() {
  const s = slides[si++ % slides.length]
  $('slide').classList.add('out')
  setTimeout(() => {
    $('quote').textContent = s.title
    $('source').textContent = s.source ?? ''
    $('slide').classList.remove('out')
  }, slides.length > 1 ? 600 : 0)
}
showSlide()
if (slides.length > 1) setInterval(showSlide, D.slideSeconds * 1000)

/** Which screen to show: normal, adhan, iqamah or praying, for the current minute. */
function phase(n, today) {
  for (const k of FARD) {
    const T = today[k]
    if (T == null) continue
    const iq = Number(config.iqamah?.[k]) || 0
    const end = T + iq
    if (n.min >= T && n.min < T + Math.min(D.adhan, iq || D.adhan)) return { kind: 'adhan', k, T }
    if (iq && n.min >= T + D.adhan && n.min < end) return { kind: 'iqamah', k, T, end }
    if (n.min >= end && n.min < end + D.prayer) return { kind: 'praying', k, T }
  }
  return { kind: 'normal' }
}

let lastKey = ''
function tick() {
  const n = now()
  const today = timesFor(n.y, n.m, n.d)
  const s = Math.floor(((n.min % 1) * 60))
  const h = Math.floor(n.min / 60) % 24
  const mm = Math.floor(n.min % 60)
  const hm = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  $('clock').innerHTML = `${hm}<small>${String(s).padStart(2, '0')}</small>`
  $('mini').textContent = hm
  $('greg').textContent = gregText(n.day)
  $('hijri').textContent = hijriText(n.y, n.m, n.d)

  const next = nextPrayer(n)
  const nextDay = next.tomorrow ? new Date(n.y, n.m - 1, n.d + 1) : n.day
  $('next-name').textContent = prayerName(next.key, nextDay)
  $('next-in').textContent = t(`in ${until(next.at, n.min)}`, `${until(next.at, n.min)} lagi`)

  const p = phase(n, today)
  // During adhan, iqamah and prayer the current prayer is marked, otherwise the next one.
  // After Isha the list moves on to tomorrow.
  const ahead = p.kind === 'normal' && next.tomorrow
  const list = ahead ? timesFor(nextDay.getFullYear(), nextDay.getMonth() + 1, nextDay.getDate()) : today
  const listDay = ahead ? nextDay : n.day
  const on = p.kind === 'normal' ? next.key : p.k
  const past = ahead ? 0 : PRAYERS.filter((k) => today[k] <= n.min).length
  const key = `${n.y}-${n.m}-${n.d}-${on}-${past}-${ahead}`
  if (key !== lastKey) {
    lastKey = key
    $('times').innerHTML = PRAYERS.map((k) => {
      const iq = config.iqamah?.[k]
      const ar = prayerArabic(k, listDay)
      return `<div class="t${on === k ? ' on' : !ahead && list[k] <= n.min ? ' past' : ''}">
        <p class="n">${esc(prayerName(k, listDay))}${ar ? `<span class="a" lang="ar" dir="rtl" aria-hidden="true">${ar}</span>` : ''}</p>
        <p class="i">${k !== 'terbit' && iq ? `${t('Iqamah', 'Iqamah')} ${clock(list[k] + iq)}` : ''}</p>
        <p class="c">${clock(list[k])}</p></div>`
    }).join('')
  }

  $('normal').hidden = p.kind !== 'normal'
  $('adhan').hidden = p.kind !== 'adhan'
  $('iqamah').hidden = p.kind !== 'iqamah'
  $('praying').hidden = p.kind !== 'praying'
  document.body.classList.toggle('is-praying', p.kind === 'praying')
  document.body.classList.toggle('is-normal', p.kind === 'normal')
  if (p.kind === 'adhan') { $('adhan-name').textContent = prayerName(p.k, n.day); $('adhan-ar').textContent = prayerArabic(p.k, n.day) }
  if (p.kind === 'iqamah') {
    $('iqamah-label').textContent = t(`Iqamah for ${prayerName(p.k, n.day)} in`, `Iqamah ${prayerName(p.k, n.day)} dalam`)
    const left = Math.max(0, Math.round((p.end - n.min) * 60))
    $('iqamah-count').textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`
  }
}
tick()
setInterval(tick, 250)

// Full screen, hidden cursor, screen kept awake.
$('fs').onclick = () => document.documentElement.requestFullscreen?.()
let idle
addEventListener('pointermove', () => {
  document.body.classList.remove('idle')
  clearTimeout(idle)
  idle = setTimeout(() => document.body.classList.add('idle'), 3000)
})
async function wake() { try { await navigator.wakeLock?.request('screen') } catch {} }
wake()
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && wake())
