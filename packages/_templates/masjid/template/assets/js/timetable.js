import { config, t, clock, prayerName, prayerArabic, mosqueNow, timesFor, hijriText, applyTheme, translate, locale } from './common.js'

const $ = (id) => document.getElementById(id)
applyTheme()
translate()
document.title = `${t('Timetable', 'Jadwal sholat')} · ${config.name}`
$('brand-name').textContent = config.name

const COLS = ['imsak', 'subuh', 'terbit', 'zuhur', 'asar', 'maghrib', 'isya']
const now = mosqueNow()
let y = now.y
let m = now.m

$('cols').innerHTML = `<th>${t('Date', 'Tanggal')}</th>` + COLS.map((k) => `<th>${prayerName(k)}${prayerArabic(k) ? `<span lang="ar" dir="rtl" aria-hidden="true">${prayerArabic(k)}</span>` : ''}</th>`).join('')
$('method-note').textContent = t(
  `Times for ${config.name}, ${config.location.lat.toFixed(4)}, ${config.location.lng.toFixed(4)}. Fridays are highlighted.`,
  `Jadwal untuk ${config.name}, ${config.location.lat.toFixed(4)}, ${config.location.lng.toFixed(4)}. Hari Jumat ditandai.`,
)

function render() {
  const first = new Date(y, m - 1, 1)
  $('month').textContent = first.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const days = new Date(y, m, 0).getDate()
  $('hijri-range').textContent = `${hijriText(y, m, 1)} – ${hijriText(y, m, days)}`
  let html = ''
  for (let d = 1; d <= days; d++) {
    const day = new Date(y, m - 1, d)
    const tt = timesFor(y, m, d)
    const cls = [day.getDay() === 5 && 'fri', y === now.y && m === now.m && d === now.d && 'today'].filter(Boolean).join(' ')
    html += `<tr class="${cls}"><td><span class="d">${day.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })}</span><span class="h">${hijriText(y, m, d)}</span></td>`
    html += COLS.map((k) => `<td class="${k === 'terbit' || k === 'imsak' ? 'sun' : ''}">${clock(tt[k])}</td>`).join('') + '</tr>'
  }
  $('rows').innerHTML = html
}
const shift = (n) => { const d = new Date(y, m - 1 + n, 1); y = d.getFullYear(); m = d.getMonth() + 1; render() }
$('prev').onclick = () => shift(-1)
$('next').onclick = () => shift(1)
$('today').onclick = () => { y = now.y; m = now.m; render() }
$('print').onclick = () => window.print()
render()
