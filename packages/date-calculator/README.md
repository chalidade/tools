# @chalidade/date-calculator

Date maths on any website: one `<script>` tag, one element. Exact age, days
between two dates, working days, and adding or subtracting days, months and
years. **Everything runs in the visitor's browser**; nothing is sent anywhere.

Working days skip weekends and **Indonesian** national public holidays, optionally
with *cuti bersama* (collective leave days the government adds around holidays),
from the joint ministerial decree (SKB 3 Menteri). The bundled list covers 2025
and 2026; for other years only weekends are skipped, and the element says so.
Holiday names stay in Indonesian.

This is the [Date Calculator](https://chalidade.github.io/tools/#/date-calculator) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/date-calculator@0/dist/element.js"></script>

<date-calculator></date-calculator>
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
date-calculator {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/date-calculator
```

```js
import '@chalidade/date-calculator/element' // registers <date-calculator>
```

In React, `<date-calculator theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 2 KB gzipped (holiday list included). Dates are
`Date` objects at UTC midnight, so time zones never shift a day:

```js
import { parseISO, toISO, workdaysBetween, addWorkdays, holidayMap, age } from '@chalidade/date-calculator'

const holidays = holidayMap(true) // true: include cuti bersama
workdaysBetween(parseISO('2025-12-22'), parseISO('2026-01-02'), holidays)
// { workdays: 7, holidays: [
//   { date: '2025-12-25', name: 'Hari Raya Natal' },
//   { date: '2025-12-26', name: 'Cuti Bersama Natal' },
//   { date: '2026-01-01', name: 'Tahun Baru Masehi' } ] }

toISO(addWorkdays(parseISO('2025-12-24'), 3, holidays)) // '2025-12-31'

age(parseISO('1990-02-28'), parseISO('2025-10-30'))
// { years: 35, months: 8, days: 2, totalDays: 13028,
//   nextBirthday: 2026-02-28T00:00:00.000Z, daysToBirthday: 121 }
```

- `parseISO()` returns `null` for anything but a real `YYYY-MM-DD` date.
- `SUPPORTED_YEARS` is `[2025, 2026]`; `uncoveredYears(a, b)` tells you which
  years of a range have no holiday data.
- Also exported: `daysBetween`, `addDays`, `addMonths` (31 Jan + 1 month =
  28/29 Feb), `diffYMD`, `isWeekend`, `isWorkday`, `todayISO`.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
