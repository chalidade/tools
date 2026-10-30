# @chalidade/jadwal-sholat

Islamic prayer times on any website: one `<script>` tag, one element. Today's
five prayers plus imsak, sunrise and duha, or a whole month as a printable
table. **Everything runs in the visitor's browser**, with no API and no
internet needed after the script loads.

Times are computed from the sun's position with the parameters of Indonesia's
Ministry of Religious Affairs (Kemenag RI): Fajr at 20° below the horizon, Isha
at 18°, Asr at shadow length 1× (Shafi'i), and a 2-minute safety margin
(*ihtiyat*). It is meant for Indonesian mosques, schools and community sites,
and works for any location; other countries use other angles, so local
timetables there may differ by several minutes.

This is the [Prayer Times](https://chalidade.github.io/tools/#/jadwal-sholat) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/jadwal-sholat@0/dist/element.js"></script>

<prayer-times></prayer-times>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Location

**Use my location** asks the browser for the visitor's position only when they
click it. The permission prompt names *your* site, since the element runs on
your page. The position is used for the calculation and kept in memory only:
it is not stored and not sent anywhere. Without it, the visitor picks one of
the bundled Indonesian cities (Jakarta is the default).

### Printing

The monthly view's print button calls `window.print()`, which prints your whole
page.

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
prayer-times {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/jadwal-sholat
```

```js
import '@chalidade/jadwal-sholat/element' // registers <prayer-times>
```

In React, `<prayer-times theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 1.3 KB gzipped:

```js
import { prayerTimes, clock, PRAYER_ORDER } from '@chalidade/jadwal-sholat'

// Jakarta, 1 March 2025 (tz = hours ahead of UTC: 7 = WIB)
const t = prayerTimes(2025, 3, 1, { lat: -6.2088, lng: 106.8456, tz: 7 })
Object.fromEntries(PRAYER_ORDER.map((k) => [k, clock(t[k])]))
// { imsak: '04:32', subuh: '04:42', terbit: '05:56', dhuha: '06:20',
//   zuhur: '12:07', asar: '15:11', maghrib: '18:14', isya: '19:23' }
```

- Times are minutes after local midnight; `clock()` formats them. Keys are the
  Indonesian names (`subuh` = Fajr, `terbit` = sunrise, `zuhur` = Dhuhr,
  `asar` = Asr, `isya` = Isha); `PRAYER_NAMES` has `[Indonesian, English]`.
- A time is `null` when the sun never reaches that angle: in London on 21 June
  Fajr and Isha are `null` at 18–20°.
- Expect 1–2 minutes of difference from official local timetables (altitude,
  rounding); check against your mosque.
- `qibla(lat, lng)` (bearing to the Kaaba) is exported too.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
