# @chalidade/hijriah

Convert dates between the Gregorian and Hijri calendars on any website: one
`<script>` tag, one element. Plus a year of Islamic holidays. **Everything runs
in the visitor's browser**; nothing is sent anywhere.

The Hijri calendar is the Islamic lunar calendar (12 months of 29 or 30 days)
used for Ramadan, Eid and other religious dates. Conversion uses the Umm al-Qura
calendar built into the browser (`Intl`). Official dates in some countries,
Indonesia included, are set by moon sighting and can be a day later; the element
says so.

This is the [Hijri ⇄ Gregorian Converter](https://chalidade.github.io/tools/#/hijriah) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/hijriah@0/dist/element.js"></script>

<hijri-calendar></hijri-calendar>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
hijri-calendar {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/hijriah
```

```js
import '@chalidade/hijriah/element' // registers <hijri-calendar>
```

In React, `<hijri-calendar theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 1.4 KB gzipped. Gregorian dates are `Date` objects at
UTC midnight:

```js
import { toHijri, toGregorian, utcDate, hijriMonthLength, holidaysIn } from '@chalidade/hijriah'

toHijri(utcDate(2025, 3, 1))                          // { year: 1446, month: 9, day: 1 }
toGregorian({ year: 1447, month: 9, day: 1 })         // 2026-02-18T00:00:00.000Z
toGregorian({ year: 1446, month: 9, day: 30 })        // null (that Ramadan had 29 days)
hijriMonthLength(1446, 9)                             // 29

holidaysIn(2026).map((h) => [h.date.toISOString().slice(0, 10), h.name[1]])
// [['2026-01-16', 'Isra and Mi’raj'], ['2026-02-03', 'Mid-Sha’ban'],
//  ['2026-02-18', 'First day of Ramadan'], ['2026-03-06', 'Nuzul al-Quran'],
//  ['2026-03-20', 'Eid al-Fitr'], ['2026-05-26', 'Day of Arafah'],
//  ['2026-05-27', 'Eid al-Adha'], ['2026-06-16', 'Islamic New Year'],
//  ['2026-06-25', 'Day of Ashura'], ['2026-08-25', 'Mawlid (Prophet’s birthday)']]
```

- `toGregorian()` accepts years `MIN_YEAR` (1318) to `MAX_YEAR` (1500) and
  returns `null` for a day that doesn't exist.
- `HIJRI_MONTHS` and holiday names are `[Indonesian, English]` pairs.
- Results depend on the browser's (or Node's) Umm al-Qura data.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
