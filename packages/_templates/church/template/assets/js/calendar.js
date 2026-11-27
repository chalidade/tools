import { config, t, clock, dayShort, churchNow, onDay, applyTheme, translate, esc, locale } from './common.js'

const $ = (id) => document.getElementById(id)
applyTheme()
translate()
document.title = `${t('Calendar', 'Kalender')} · ${config.name}`
$('brand-name').textContent = config.name
$('cal-note').textContent = t(
  `Services repeat every week. Times are local to ${config.name} (${config.timeZone}).`,
  `Ibadah berulang setiap pekan. Waktu mengikuti waktu setempat ${config.name} (${config.timeZone}).`,
)

const now = churchNow()
let y = now.y
let m = now.m

/** A month grid, weeks starting on Sunday. On a phone the CSS turns it into a list of the days with something on. */
function render() {
  const first = new Date(y, m - 1, 1)
  $('month').textContent = first.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const days = new Date(y, m, 0).getDate()
  let html = [0, 1, 2, 3, 4, 5, 6].map((i) => `<p class="cal-dow">${esc(dayShort(i))}</p>`).join('')
  html += '<div class="cal-cell blank"></div>'.repeat(first.getDay())
  let events = 0
  for (let d = 1; d <= days; d++) {
    const day = new Date(y, m - 1, d)
    const items = onDay(day)
    events += items.filter((x) => x.kind === 'event').length
    const today = y === now.y && m === now.m && d === now.d
    html += `<div class="cal-cell${items.length ? ' has' : ''}${today ? ' today' : ''}${day.getDay() === 0 ? ' sun' : ''}">
      <p class="cal-d"><b>${d}</b><span>${esc(day.toLocaleDateString(locale, { weekday: 'long' }))}</span></p>
      <ul>${items.map((x) => `<li class="${x.kind}${x.weekly ? ' weekly' : ''}"><time>${x.start == null ? '' : clock(x.start)}</time><span>${esc(x.title)}</span></li>`).join('')}</ul>
    </div>`
  }
  html += '<div class="cal-cell blank"></div>'.repeat((7 - ((first.getDay() + days) % 7)) % 7)
  $('cal').innerHTML = html
  $('count').textContent = t(`${events} ${events === 1 ? 'event' : 'events'}`, `${events} acara`)
}
const shift = (n) => { const d = new Date(y, m - 1 + n, 1); y = d.getFullYear(); m = d.getMonth() + 1; render() }
$('prev').onclick = () => shift(-1)
$('next').onclick = () => shift(1)
$('today').onclick = () => { y = now.y; m = now.m; render() }
$('print').onclick = () => window.print()
render()
