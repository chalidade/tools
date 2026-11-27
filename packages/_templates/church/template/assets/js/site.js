import { config, t, clock, DAYS, dayName, dayShort, churchNow, SERVICES, nextService, isoDate, fromIso, whenDay, dateText, applyTheme, translate, esc, locale } from './common.js'

const $ = (id) => document.getElementById(id)
const styled = applyTheme()
translate()
document.title = config.name

// Identity
for (const id of ['brand-name', 'name', 'foot-name', 'foot-mark']) $(id).textContent = config.name
$('tagline').textContent = config.tagline
$('address').textContent = config.address
$('map').href = config.mapUrl || '#'
$('year').textContent = new Date().getFullYear()
$('today').textContent = dateText(churchNow().day)

// The name in the hero and the footer: as large as the design wants, but never wider than the page
// (a long word in a church's name would otherwise run off a phone screen).
function fit() {
  for (const el of [$('name'), $('foot-mark')]) {
    el.style.fontSize = ''
    if (el.scrollWidth > el.clientWidth) el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * (el.clientWidth / el.scrollWidth) * 0.98}px`
  }
}
styled.then(fit)
document.fonts.addEventListener?.('loadingdone', fit)
addEventListener('resize', fit)

// Mobile menu
$('menu').onclick = () => {
  const open = document.body.classList.toggle('menu-open')
  $('menu').setAttribute('aria-expanded', String(open))
}
$('links').onclick = (e) => e.target.closest('a') && document.body.classList.remove('menu-open')

// Live stream link (a plain link: nothing is embedded)
for (const id of ['live', 'sermons-live']) {
  const a = $(id)
  if (config.live?.url) { a.href = config.live.url; a.textContent = config.live.label || t('Watch live', 'Tonton langsung') }
  else a.hidden = true
}

/** "Sunday 09:00, 11:00 · Wednesday 19:00" (short day names when there are several days). */
const byDay = DAYS.map((_, i) => SERVICES.filter((s) => s.dow === i)).map((list, i) => [i, list]).filter(([, list]) => list.length)
$('services-line').textContent = byDay.map(([i, list]) => `${byDay.length > 1 ? dayShort(i) : dayName(i)} ${list.map((s) => clock(s.start)).join(', ')}`).join(' · ')
if (!byDay.length) $('services-line').hidden = true

// Weekly services: one pointed arch each, the next one lit.
const ARCH = '<svg class="t-arch" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M1 100V46C1 22 26 6 50 1c24 5 49 21 49 45v54"/></svg>'
$('times-grid').style.setProperty('--n', Math.max(1, SERVICES.length))
function renderServices(next) {
  $('times-grid').innerHTML = SERVICES.map((s) => {
    const on = next && next.dow === s.dow && next.start === s.start
    return `<div class="time${on ? ' is-next' : ''}${on && next.live ? ' is-live' : ''}">${ARCH}
      <span class="t-name">${esc(dayName(s.dow))}</span>
      <span class="t-clock">${clock(s.start)}</span>
      <span class="t-iq">${esc(s.name)}</span>
    </div>`
  }).join('')
}
$('times-note').textContent = t(
  `All times are local to ${config.name} (${config.timeZone}).`,
  `Semua waktu mengikuti waktu setempat ${config.name} (${config.timeZone}).`,
)

// The next service, counting down every second.
const pad = (n) => String(n).padStart(2, '0')
function tick() {
  const now = churchNow()
  const next = nextService(now)
  if (!next) { $('next-label').textContent = ''; return }
  const when = whenDay(next.ahead, next.date)
  $('next-mark').textContent = dayName(next.dow)
  $('next-name').textContent = next.name
  $('next-time').textContent = clock(next.start)
  if (next.live) {
    $('next-label').textContent = t('Happening now', 'Sedang berlangsung')
    $('next-count').textContent = t('Live', 'Live')
    $('next-in').textContent = t(`Started at ${clock(next.start)}`, `Dimulai pukul ${clock(next.start)}`)
  } else {
    $('next-label').textContent = t(`Next service · ${when}`, `Ibadah berikutnya · ${when}`)
    const left = Math.max(0, Math.round((next.at - now.min) * 60))
    const d = Math.floor(left / 86400)
    const h = Math.floor((left % 86400) / 3600)
    // More than a day away: days and hours; otherwise hours, minutes and seconds.
    $('next-count').textContent = d ? `${d}${t('d', 'h')} ${pad(h)}${t('h', 'j')}` : [h, Math.floor((left % 3600) / 60), left % 60].map(pad).join(':')
    $('next-in').textContent = dateText(next.date, { weekday: 'long', day: 'numeric', month: 'long' })
  }
  $('next-note').textContent = next.note ?? ''
  document.body.classList.toggle('is-live', next.live)
  const key = `${next.dow}-${next.start}-${next.live}`
  if (tick.last !== key) { tick.last = key; renderServices(next) }
}
tick()
setInterval(tick, 1000)

// Notices
const notices = config.announcements ?? []
$('announce-wrap').hidden = !notices.length
$('notices').innerHTML = notices.map((n) => `<li>${esc(n)}</li>`).join('')
// The same notices as a moving band; the list is repeated so the loop has no gap.
$('marquee').hidden = !notices.length
$('marquee-track').innerHTML = `<div>${notices.map((n) => `<span>${esc(n)}</span>`).join('')}</div>`.repeat(2)
$('marquee-track').style.setProperty('--dur', `${Math.max(30, notices.join(' ').length * 0.22)}s`)

// Sermons: the latest one large, the next few as rows.
const sermons = [...(config.sermons ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))
$('sermons').hidden = !sermons.length
const sDate = (s, opts) => (s.date ? fromIso(s.date).toLocaleDateString(locale, opts) : '')
const watch = (s, cls) => (s.url ? `<a class="${cls}" href="${esc(s.url)}" target="_blank" rel="noopener">${t('Watch', 'Tonton')}${cls === 'btn' ? '<i aria-hidden="true">↗</i>' : ' ↗'}</a>` : '')
if (sermons.length) {
  const s = sermons[0]
  $('sermon').innerHTML = `<div class="s-arch">${ARCH}<span>${t('Latest', 'Terbaru')}</span><b>${esc(sDate(s, { day: 'numeric' }))}</b><span>${esc(sDate(s, { month: 'short', year: 'numeric' }))}</span></div>
    <div class="s-body">
      <p class="s-series">${esc(s.series ?? '')}</p>
      <h3 class="statement">${esc(s.title)}</h3>
      <p class="s-by">${[s.speaker, s.passage].filter(Boolean).map(esc).join('<span>·</span>')}</p>
      ${watch(s, 'btn')}
    </div>`
}
$('sermon-list').innerHTML = sermons.slice(1, 5).map((s) => `<article class="event">
  <div><h3>${esc(s.title)}</h3><p class="who">${esc(s.speaker ?? '')}</p></div>
  <p class="e-when">${esc(sDate(s, { day: 'numeric', month: 'short' }))}</p>
  <p class="e-time">${esc(s.passage ?? '')}</p>
  ${watch(s, 'e-tag') || '<p class="e-tag"></p>'}
</article>`).join('')

// Events: one-off events from today on, weekly ones on their next day, soonest first.
{
  const now = churchNow()
  const today = isoDate(now.day)
  const list = []
  for (const e of config.events ?? []) {
    if (e.every) {
      const dow = DAYS.indexOf(String(e.every).slice(0, 3).toLowerCase())
      if (dow < 0) continue
      const next = new Date(now.y, now.m - 1, now.d + ((dow - now.day.getDay() + 7) % 7))
      list.push({ ...e, sort: isoDate(next), when: t(`Every ${dayName(dow)}`, `Setiap ${dayName(dow)}`) })
    } else if (e.date && e.date >= today) {
      list.push({ ...e, sort: e.date, when: fromIso(e.date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) })
    }
  }
  list.sort((a, b) => a.sort.localeCompare(b.sort) || String(a.time).localeCompare(String(b.time)))
  $('events').hidden = !list.length
  $('events-list').innerHTML = list.slice(0, 6).map((e) => `<article class="event">
    <div><h3>${esc(e.title)}</h3><p class="who">${esc(e.place ?? '')}</p></div>
    <p class="e-when">${esc(e.when)}</p>
    <p class="e-time">${esc(e.time ?? '')}</p>
    <p class="e-tag">${esc(e.tag ?? '')}</p>
  </article>`).join('')
}

// Ministries
const ICONS = {
  kids: '<circle cx="12" cy="7" r="3"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/>',
  youth: '<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8-4.3-4.1 5.9-.9z"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  coffee: '<path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M15 20a4.5 4.5 0 0 1 6-4"/>',
  home: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  food: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M12 3v4M8 5v2M16 5v2"/>',
}
const ministries = config.ministries ?? []
$('ministries').hidden = !ministries.length
$('programs').innerHTML = ministries.map((p) => `<article class="program">
  <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[p.icon] ?? ICONS.heart}</svg>
  <div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>
</article>`).join('')

// Plan your visit: the main day's services as a sentence, the welcome text, the questions.
{
  const [main, list] = [...byDay].sort((a, b) => b[1].length - a[1].length)[0] ?? []
  const times = (list ?? []).map((s) => clock(s.start))
  const joined = times.length > 1 ? `${times.slice(0, -1).join(', ')} ${t('and', 'dan')} ${times.at(-1)}` : times[0]
  $('visit-title').textContent = times.length ? t(`Join us ${dayName(main)} at ${joined}`, `Hadir setiap ${dayName(main)} pukul ${joined}`) : config.name
  $('visit-text').textContent = config.welcome ?? ''
  $('faq').innerHTML = (config.visit ?? []).map((f, i) => `<details class="qa"${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')
}

// Giving
const g = config.giving ?? {}
$('give-text').textContent = g.text ?? ''
if (g.onlineUrl) $('give-online').href = g.onlineUrl
else $('give-online').hidden = true
$('accounts').innerHTML = (g.accounts ?? []).map((a) => `<div class="account">
  <div><p class="bank">${esc(a.bank)} · ${esc(a.holder)}</p><p class="num">${esc(a.number)}</p></div>
  <button class="copy" data-copy="${esc(String(a.number).replace(/\s+/g, ''))}">${t('Copy', 'Salin')}</button>
</div>`).join('')
$('accounts').onclick = async (e) => {
  const b = e.target.closest('[data-copy]')
  if (!b) return
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = t('Copied', 'Tersalin') } catch { b.textContent = b.dataset.copy }
  setTimeout(() => (b.textContent = t('Copy', 'Salin')), 1800)
}
if (g.qr) $('qr').src = g.qr
else $('qr-wrap').hidden = true

// Contact
const c = config.contact ?? {}
const rows = [
  c.phone && [t('Phone', 'Telepon'), c.phone, `tel:${c.phone.replace(/[^\d+]/g, '')}`],
  c.whatsapp && ['WhatsApp', `+${c.whatsapp}`, `https://wa.me/${c.whatsapp}`],
  c.email && ['Email', c.email, `mailto:${c.email}`],
  c.instagram && ['Instagram', `@${c.instagram}`, `https://instagram.com/${c.instagram}`],
  c.youtube && ['YouTube', c.youtube, c.youtube.startsWith('http') ? c.youtube : `https://youtube.com/@${c.youtube}`],
].filter(Boolean)
$('contact-list').innerHTML = rows.map(([k, v, href]) => `<li><span>${esc(k)}</span><a href="${esc(href)}" target="_blank" rel="noopener">${esc(v)}</a></li>`).join('')
