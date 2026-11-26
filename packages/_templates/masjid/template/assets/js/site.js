import { config, t, clock, PRAYERS, prayerName, prayerArabic, mosqueNow, timesFor, nextPrayer, until, hijriText, gregText, applyTheme, translate, esc, locale } from './common.js'

const $ = (id) => document.getElementById(id)
applyTheme()
translate()
document.title = config.name

// Identity
for (const id of ['brand-name', 'name', 'foot-name']) $(id).textContent = config.name
$('tagline').textContent = config.tagline
$('address').textContent = config.address
$('map').href = config.mapUrl || '#'
$('year').textContent = new Date().getFullYear()

// Mobile menu
$('menu').onclick = () => {
  const open = document.body.classList.toggle('menu-open')
  $('menu').setAttribute('aria-expanded', String(open))
}
$('links').onclick = (e) => e.target.closest('a') && document.body.classList.remove('menu-open')

// Prayer times
const METHOD_NAMES = {
  kemenag: 'Kemenag RI', jakim: 'JAKIM', muis: 'MUIS', mwl: 'Muslim World League', isna: 'ISNA',
  egypt: 'Egyptian General Authority', karachi: 'University of Karachi', makkah: 'Umm al-Qura',
}
function renderTimes() {
  const now = mosqueNow()
  const next = nextPrayer(now)
  // After Isha the strip moves on to tomorrow, so it never sits there fully greyed out.
  const day = next.tomorrow ? new Date(now.y, now.m - 1, now.d + 1) : now.day
  const list = timesFor(day.getFullYear(), day.getMonth() + 1, day.getDate())
  $('greg').textContent = gregText(now.day)
  $('hijri').textContent = hijriText(now.y, now.m, now.d)
  $('times-title').textContent = (next.tomorrow ? t('Tomorrow, ', 'Besok, ') : '') + gregText(day, { weekday: 'long', day: 'numeric', month: 'long' })
  $('times-grid').innerHTML = PRAYERS.map((k) => {
    const iq = config.iqamah?.[k]
    const ar = prayerArabic(k, day)
    return `<div class="time${next.key === k ? ' is-next' : ''}${!next.tomorrow && list[k] <= now.min ? ' is-past' : ''}">
      <span class="t-name">${esc(prayerName(k, day))}${ar ? `<span class="t-ar" lang="ar" dir="rtl" aria-hidden="true">${ar}</span>` : ''}</span>
      <span class="t-clock">${clock(list[k])}</span>
      <span class="t-iq">${k === 'terbit' ? '&nbsp;' : iq ? `${t('Iqamah', 'Iqamah')} ${clock(list[k] + iq)}` : '&nbsp;'}</span>
    </div>`
  }).join('')
  $('method-note').textContent = t(
    `Calculated for ${config.location.lat.toFixed(4)}, ${config.location.lng.toFixed(4)} with the ${METHOD_NAMES[config.method] ?? METHOD_NAMES.kemenag} method.`,
    `Dihitung untuk ${config.location.lat.toFixed(4)}, ${config.location.lng.toFixed(4)} dengan metode ${METHOD_NAMES[config.method] ?? METHOD_NAMES.kemenag}.`,
  )
}

function tick() {
  const now = mosqueNow()
  const next = nextPrayer(now)
  const day = next.tomorrow ? new Date(now.y, now.m - 1, now.d + 1) : now.day
  $('next-name').textContent = prayerName(next.key, day)
  $('next-ar').textContent = prayerArabic(next.key, day)
  $('next-time').textContent = clock(next.at)
  $('next-in').textContent = t(`in ${until(next.at, now.min)}`, `${until(next.at, now.min)} lagi`)
  const iq = config.iqamah?.[next.key]
  $('next-iqamah').textContent = iq ? `${t('Iqamah', 'Iqamah')} ${clock(next.at + iq)}` : ''
  // A new prayer, sunrise passing or a new day: redraw the table.
  const key = `${next.key}${next.tomorrow}${now.d}${now.min >= timesFor(now.y, now.m, now.d).terbit}`
  if (tick.last !== key) { tick.last = key; renderTimes() }
}
tick()
setInterval(tick, 1000)

// Notices
const notices = config.announcements ?? []
$('announce-wrap').hidden = !notices.length
$('notices').innerHTML = notices.map((n) => `<li>${esc(n)}</li>`).join('')

// Events
$('events-list').innerHTML = (config.events ?? []).map((e) => `<article class="event">
  <div><h3>${esc(e.title)}</h3><p class="who">${esc(e.speaker)}</p></div>
  <p class="e-when">${esc(e.when)}</p>
  <p class="e-time">${esc(e.time)}</p>
  <p class="e-tag">${esc(e.tag ?? '')}</p>
</article>`).join('')
$('events').hidden = !(config.events ?? []).length

// Friday
{
  const now = mosqueNow()
  const ahead = (5 - now.day.getDay() + 7) % 7
  const fri = new Date(now.day.getTime() + ahead * 86400000)
  const ft = timesFor(fri.getFullYear(), fri.getMonth() + 1, fri.getDate())
  const friday = gregText(fri, { weekday: 'long', day: 'numeric', month: 'long' })
  $('jumuah-title').textContent = t(`${friday}, khutbah at ${clock(ft.zuhur)}`, `${friday}, khutbah pukul ${clock(ft.zuhur)}`)
  $('jumuah-text').textContent = t(
    'Please arrive early, and keep the rows straight and close.',
    'Mohon datang lebih awal, rapatkan dan luruskan shaf.',
  )
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const rows = (config.jumuah?.schedule ?? []).filter((r) => r.date >= iso(now.day))
  $('jumuah-list').innerHTML = rows.length
    ? rows.map((r) => {
        const [y, m, d] = r.date.split('-').map(Number)
        return `<tr${r.date === iso(fri) ? ' class="is-next"' : ''}><td>${esc(new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'long' }))}</td><td>${esc(r.khatib)}</td><td>${esc(r.imam)}</td></tr>`
      }).join('')
    : `<tr><td colspan="3" class="muted">${t('The schedule will be announced soon.', 'Jadwal segera diumumkan.')}</td></tr>`
}

// Programs
const ICONS = {
  quran: '<path d="M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2z"/>',
  kids: '<circle cx="12" cy="7" r="3"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/>',
  food: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M12 3v4M8 5v2M16 5v2"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M15 20a4.5 4.5 0 0 1 6-4"/>',
  home: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
}
const programs = config.programs ?? []
$('programs-wrap').hidden = !programs.length
$('programs').innerHTML = programs.map((p) => `<article class="program">
  <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[p.icon] ?? ICONS.home}</svg>
  <div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>
</article>`).join('')

// Tools: each one is a toowl web component, loaded only when its tab opens.
const FILES = { 'qibla-direction': 'arah-kiblat', 'hijri-calendar': 'hijriah', 'zakat-calculator': 'zakat', 'tasbih-counter': 'tasbih' }
async function openTool(tag) {
  for (const b of $('tool-tabs').children) b.setAttribute('aria-selected', String(b.dataset.tool === tag))
  await import(`../toowl/elements/${FILES[tag]}.js`)
  $('tool-stage').innerHTML = `<${tag} theme="light" lang="${config.lang === 'id' ? 'id' : 'en'}"></${tag}>`
}
$('tool-tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) openTool(b.dataset.tool) }
// Load the first tool when the section comes into view.
new IntersectionObserver((entries, io) => {
  if (entries.some((e) => e.isIntersecting)) { io.disconnect(); openTool('qibla-direction') }
}, { rootMargin: '200px' }).observe($('tools'))

// Donations
$('donate-text').textContent = config.donation?.text ?? ''
$('accounts').innerHTML = (config.donation?.accounts ?? []).map((a) => `<div class="account">
  <div><p class="bank">${esc(a.bank)} · ${esc(a.holder)}</p><p class="num">${esc(a.number)}</p></div>
  <button class="copy" data-copy="${esc(a.number.replace(/\s+/g, ''))}">${t('Copy', 'Salin')}</button>
</div>`).join('')
$('accounts').onclick = async (e) => {
  const b = e.target.closest('[data-copy]')
  if (!b) return
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = t('Copied', 'Tersalin') } catch { b.textContent = b.dataset.copy }
  setTimeout(() => (b.textContent = t('Copy', 'Salin')), 1800)
}
if (config.donation?.qr) $('qr').src = config.donation.qr
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
