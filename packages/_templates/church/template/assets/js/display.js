import { config, t, clock, DAYS, churchNow, nextService, upcoming, until, whenDay, dateText, applyTheme, translate, esc } from './common.js'

const $ = (id) => document.getElementById(id)
applyTheme('display')
translate()
document.title = `${config.name} · ${t('Display', 'Layar')}`
$('name').textContent = config.name

const D = { countdown: 10, slideSeconds: 12, slides: [], ...config.display }

// Preview a moment with ?at=HH:MM, and a weekday with &day=sun (handy for the countdown and welcome screens).
const q = new URLSearchParams(location.search)
let offset = 0
if (/^\d{1,2}:\d{2}$/.test(q.get('at') ?? '')) {
  const [h, m] = q.get('at').split(':').map(Number)
  const n = churchNow()
  const dow = DAYS.indexOf(String(q.get('day') ?? '').slice(0, 3).toLowerCase())
  const ahead = dow < 0 ? 0 : (dow - n.day.getDay() + 7) % 7
  offset = ahead * 1440 + h * 60 + m - n.min
}
/** The church's now, moved by the preview offset (across days if need be). */
function now() {
  const n = churchNow()
  const total = n.min + offset
  const days = Math.floor(total / 1440)
  const day = new Date(n.y, n.m - 1, n.d + days)
  return { y: day.getFullYear(), m: day.getMonth() + 1, d: day.getDate(), day, min: total - days * 1440 }
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

const ARCH = '<svg class="arch" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M1 100V46C1 22 26 6 50 1c24 5 49 21 49 45v54"/></svg>'
const pad = (n) => String(n).padStart(2, '0')

let lastKey = ''
function tick() {
  const n = now()
  const s = Math.floor((n.min % 1) * 60)
  const hm = clock(Math.floor(n.min))
  $('clock').innerHTML = `${hm}<small>${pad(s)}</small>`
  $('mini').textContent = hm
  $('date').textContent = dateText(n.day)

  // Which screen: the welcome while a service runs, a big countdown just before one, otherwise normal.
  const next = nextService(n)
  const kind = !next ? 'normal' : next.live ? 'live' : next.at - n.min <= D.countdown ? 'countdown' : 'normal'

  if (next) {
    $('next-label').textContent = next.live ? t('Now', 'Sekarang') : t(`Next · ${whenDay(next.ahead, next.date)} ${clock(next.start)}`, `Berikutnya · ${whenDay(next.ahead, next.date)} ${clock(next.start)}`)
    $('next-name').textContent = next.name
    $('next-in').textContent = next.live ? t('Live', 'Live') : t(`in ${until(next.at, n.min)}`, `${until(next.at, n.min)} lagi`)
  }
  if (kind === 'countdown') {
    const left = Math.max(0, Math.round((next.at - n.min) * 60))
    $('count').textContent = `${pad(Math.floor(left / 60))}:${pad(left % 60)}`
    $('count-name').textContent = next.name
  }
  if (kind === 'live') {
    $('live-label').textContent = `${next.name} · ${clock(next.start)}`
    $('live-sub').textContent = config.tagline
  }

  // The coming services and events, one arch each; the first is lit.
  const list = upcoming(n, 5)
  const key = `${n.d}-${list.map((x) => x.at).join()}`
  if (key !== lastKey) {
    lastKey = key
    $('times').innerHTML = list.map((x, i) => `<div class="t${i === 0 ? ' on' : ''}">${ARCH}
      <p class="n">${esc(whenDay(x.ahead, x.day))}</p>
      <p class="c">${clock(x.start)}</p>
      <p class="i">${esc(x.title)}</p></div>`).join('')
    $('times').style.setProperty('--n', Math.max(list.length, 1))
  }

  $('normal').hidden = kind !== 'normal'
  $('countdown').hidden = kind !== 'countdown'
  $('live').hidden = kind !== 'live'
  document.body.classList.toggle('is-normal', kind === 'normal')
  document.body.classList.toggle('is-live', kind === 'live')
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
