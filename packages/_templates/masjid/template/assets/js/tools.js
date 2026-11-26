// The Qibla compass and the zakat calculator, drawn by the template itself so
// they follow the design. Both run in the visitor's browser.
import { config, t, esc, locale } from './common.js'
import { qibla } from '../toowl/arah-kiblat.js'
import { zakatMal, num, GOLD_NISAB_G } from '../toowl/zakat.js'

/** Qibla direction from the mosque, or from the visitor's own position. */
export function qiblaTool(stage) {
  let spot = { lat: config.location.lat, lng: config.location.lng, mine: false }
  let heading = null
  const ticks = Array.from({ length: 72 }, (_, i) => `<line x1="100" y1="${i % 18 === 0 ? 7 : 9}" x2="100" y2="${i % 6 === 0 ? 17 : 13}" transform="rotate(${i * 5} 100 100)"/>`).join('')
  stage.innerHTML = `<div class="qibla">
    <div class="q-dial"><svg viewBox="0 0 200 200" aria-hidden="true">
      <g class="q-rose" id="q-rose">
        <circle class="q-ring" cx="100" cy="100" r="96"/>
        <g class="q-ticks">${ticks}</g>
        <text x="100" y="36">N</text><text x="170" y="105">E</text><text x="100" y="174">S</text><text x="30" y="105">W</text>
        <g id="q-needle"><line class="q-line" x1="100" y1="100" x2="100" y2="26"/><path class="q-kaaba" d="M91 12h18v18H91z"/><circle class="q-hub" cx="100" cy="100" r="5"/></g>
      </g>
    </svg></div>
    <div class="q-info">
      <p class="q-label" id="q-from"></p>
      <p class="q-deg" id="q-deg"></p>
      <p class="q-sub" id="q-sub"></p>
      <div class="q-actions">
        <button type="button" class="q-btn" id="q-locate">${t('Use my location', 'Pakai lokasi saya')}</button>
        <button type="button" class="q-btn" id="q-compass" hidden>${t('Turn on phone compass', 'Nyalakan kompas HP')}</button>
      </div>
      <p class="q-note" id="q-note">${t('Measured clockwise from true north. A phone compass can be a few degrees off; check it against the rows of the mosque.', 'Diukur searah jarum jam dari utara sejati. Kompas HP bisa meleset beberapa derajat; cocokkan dengan shaf masjid.')}</p>
    </div>
  </div>`
  const $ = (id) => stage.querySelector('#' + id)
  const draw = () => {
    const q = qibla(spot.lat, spot.lng)
    $('q-from').textContent = spot.mine ? t('Qibla from where you are', 'Kiblat dari posisimu') : t(`Qibla from ${config.name}`, `Kiblat dari ${config.name}`)
    $('q-deg').textContent = `${q.bearing.toFixed(1)}°`
    $('q-sub').textContent = t(`${Math.round(q.km).toLocaleString(locale)} km to the Kaaba`, `${Math.round(q.km).toLocaleString(locale)} km ke Ka'bah`)
    $('q-needle').setAttribute('transform', `rotate(${q.bearing} 100 100)`)
    // With a live heading the whole dial turns, so the needle points the real way.
    $('q-rose').setAttribute('transform', `rotate(${heading == null ? 0 : -heading} 100 100)`)
  }
  draw()
  $('q-locate').onclick = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => { spot = { lat: p.coords.latitude, lng: p.coords.longitude, mine: true }; draw() },
      () => ($('q-note').textContent = t('Your location could not be read. Allow location access and try again.', 'Lokasi tidak terbaca. Izinkan akses lokasi lalu coba lagi.')),
    )
  // The compass sensor exists on phones and tablets only.
  if ('DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) {
    $('q-compass').hidden = false
    $('q-compass').onclick = async () => {
      try { if (typeof DeviceOrientationEvent.requestPermission === 'function' && (await DeviceOrientationEvent.requestPermission()) !== 'granted') return } catch { return }
      const on = (e) => {
        const h = e.webkitCompassHeading ?? (e.absolute && e.alpha != null ? 360 - e.alpha : null)
        if (h != null) { heading = h; draw() }
      }
      addEventListener('deviceorientationabsolute', on)
      addEventListener('deviceorientation', on)
      $('q-compass').hidden = true
    }
  }
}

/** Zakat on wealth: 2.5% once it reaches the value of 85 g of gold. */
export function zakatTool(stage) {
  const z = { currency: 'USD', goldPricePerGram: '', ...config.zakat }
  const money = (n) => {
    try { return n.toLocaleString(locale, { style: 'currency', currency: z.currency, maximumFractionDigits: 2 }) } catch { return `${z.currency} ${n.toLocaleString(locale)}` }
  }
  const field = (id, label, value = '') => `<label class="field"><span>${label}</span><input id="${id}" inputmode="decimal" autocomplete="off" value="${esc(value)}" placeholder="0" /></label>`
  stage.innerHTML = `<form class="zakat" onsubmit="return false">
    <div class="z-fields">
      ${field('z-assets', t(`Savings, gold and trade goods held for a year (${esc(z.currency)})`, `Tabungan, emas dan barang dagangan yang sudah setahun (${esc(z.currency)})`))}
      ${field('z-debts', t(`Debts due now (${esc(z.currency)})`, `Utang jatuh tempo (${esc(z.currency)})`))}
      ${field('z-gold', t(`Gold price per gram (${esc(z.currency)})`, `Harga emas per gram (${esc(z.currency)})`), z.goldPricePerGram)}
    </div>
    <div class="z-result" aria-live="polite">
      <p class="z-label">${t('Zakat due', 'Zakat yang wajib')}</p>
      <p class="z-sum" id="z-sum"></p>
      <p class="z-note" id="z-note"></p>
    </div>
  </form>`
  const $ = (id) => stage.querySelector('#' + id)
  const calc = () => {
    const gold = num($('z-gold').value)
    const r = zakatMal(num($('z-assets').value), num($('z-debts').value), gold)
    $('z-sum').textContent = money(r.zakat)
    $('z-note').textContent = !gold
      ? t('Enter today\'s gold price to work out the nisab.', 'Isi harga emas hari ini untuk menghitung nisab.')
      : r.reached
        ? t(`2.5% of ${money(r.base)}. The nisab (${GOLD_NISAB_G} g of gold) is ${money(r.nisab)}.`, `2,5% dari ${money(r.base)}. Nisab (${GOLD_NISAB_G} g emas) adalah ${money(r.nisab)}.`)
        : t(`Below the nisab of ${money(r.nisab)} (${GOLD_NISAB_G} g of gold), so no zakat is due.`, `Di bawah nisab ${money(r.nisab)} (${GOLD_NISAB_G} g emas), jadi belum wajib zakat.`)
  }
  stage.querySelector('form').oninput = calc
  calc()
}
