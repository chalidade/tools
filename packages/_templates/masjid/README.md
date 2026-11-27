# Masjid: Mosque Website Template

A complete website for a mosque, plus a TV display for the prayer hall. Prayer
times are calculated in the browser from the mosque's position, so there is no
prayer-time API, no database and no server code: upload the files to any web
hosting and edit one file.

- **index.html**: home page with the next prayer and a live countdown, today's
  times with iqamah, notices, classes, the Friday khatib schedule, programs,
  donation accounts with copy buttons and a QR code, contact details, and four
  tools (qibla compass, Hijri calendar, zakat calculator, tasbih counter).
- **timetable.html**: a whole month of prayer times with Hijri dates, ready to
  print on A4.
- **display.html**: a full-screen display for a TV or projector in the prayer
  hall: big clock, Gregorian and Hijri dates, the six times, the next prayer
  with a countdown, rotating slides, a scrolling notice bar, and automatic
  adhan, iqamah-countdown and "prayer in progress" screens.

Two designs are included, switched with one setting (`design` in `config.js`):

- **bold**: dark emerald with a saffron accent, large condensed capitals, and
  a row of arches for the day's prayers.
- **calm**: light and editorial, with serif headings and fine rules.

The text is in English or Bahasa Indonesia (one setting).

## Quick start

1. Open `config.js` in any text editor and change the name, address,
   coordinates, iqamah minutes, classes, khatib schedule and donation details.
2. Upload the whole folder to your web hosting (cPanel, Netlify, GitHub Pages,
   Cloudflare Pages, any static host). Open `index.html` on your domain.

To try it on your computer first, run a local web server in this folder, for
example `npx serve .` (Node.js) or `python3 -m http.server` (Python), and open
the address it prints. Opening `index.html` by double-clicking does not work:
browsers block module scripts on `file://` pages, and the page tells you so.

## config.js

Every page reads `config.js`. The file is commented; the main settings are:

| Setting | What it does |
| --- | --- |
| `lang` | `'en'` or `'id'` |
| `design` | `'bold'` or `'calm'`. Add `?design=calm` (or `bold`) to any page address to preview the other one without editing the file; the choice is kept for that browser tab. |
| `designSwitcher` | `true` shows a small Calm / Bold switch in the corner. Meant for trying the designs; keep it `false` on a live site. |
| `name`, `tagline`, `address`, `mapUrl` | The mosque's identity. `mapUrl` is a plain link: no map is embedded, so no third-party scripts load. |
| `location` | `lat`, `lng` (decimal degrees) and `tz`, the time zone by name, e.g. `'Europe/London'`, `'America/New_York'`, `'Asia/Jakarta'` (daylight saving is followed automatically). A fixed number of hours ahead of UTC also works. |
| `method` | `mwl` (Muslim World League), `isna` (North America), `egypt`, `karachi`, `makkah` (Umm al-Qura), `kemenag` (Indonesia), `jakim` (Malaysia), `muis` (Singapore). |
| `asr` | `1` for Shafi'i, Maliki and Hanbali, `2` for Hanafi. |
| `adjust` | Minutes added to a time to match your local timetable exactly, e.g. `{ fajr: 2, isha: -1 }`. Prayers are named `fajr`, `dhuhr`, `asr`, `maghrib`, `isha`. |
| `hijriOffset` | Shifts the Hijri date by whole days when your local moon sighting differs. |
| `arabic` | `true` shows each prayer's name in Arabic beside it, `false` hides it. |
| `iqamah` | Minutes from adhan to iqamah for each prayer. |
| `jumuah` | `time` fixes the Friday prayer time (empty = Dhuhr), `schedule` lists dates with khatib and imam. Past dates are hidden automatically. |
| `announcements` | Short notices: on the home page and in the TV ticker. |
| `events`, `programs` | Classes and activities. Program icons: `quran`, `kids`, `food`, `heart`, `mic`, `users`, `home`, `book`. |
| `donation` | Text, bank accounts and a QR image path. Replace `assets/img/qr-placeholder.svg` with your QR code image. |
| `zakat` | The zakat calculator's `currency` (ISO code such as `GBP`, `USD`, `EUR`, `IDR`) and an optional starting `goldPricePerGram`. |
| `contact` | Phone, WhatsApp (digits with country code), email, Instagram, YouTube. Empty values are hidden. |
| `theme` | `primary` and `accent` colors. Leave them empty to use each design's own palette. |
| `display` | TV settings: how long the adhan and "prayer in progress" screens stay up, slide timing, and the slides. |

## The TV display

Open `display.html` on the computer, TV box or smart TV browser connected to
the screen, then click **Full screen** (or press F11). The mouse pointer hides
itself, and the screen is kept awake where the browser allows it.

The screen changes by itself:

1. **Normal**: clock, dates, the countdown to the next prayer, today's times
   and a rotating line of text. After Isha the list shows tomorrow.
2. **Adhan**: when a prayer time arrives, for `display.adhan` minutes.
3. **Iqamah countdown**: until the iqamah time from `iqamah`.
4. **Prayer in progress**: a dimmed screen for `display.prayer` minutes.

To check these screens without waiting, add `?at=HH:MM` to the address, e.g.
`display.html?at=12:01`. The display works offline once loaded; reload it after
you change `config.js`.

## Customizing

- **Design**: `design` in `config.js`. Each design is its own stylesheet:
  `assets/css/bold.css` and `calm.css` for the website, `bold-display.css` and
  `calm-display.css` for the TV display. You can delete the pair you don't use.
- **Colors**: `theme` in `config.js`, or the variables at the top of the
  design's stylesheet.
- **Logo**: replace `assets/img/logo.svg` (any square image works; update the
  `<img>` tags if you use PNG). On the TV display it sits on a light tab, so a
  dark logo stays readable.
- **Arabic prayer names**: shown beside each prayer; set `arabic: false` in
  `config.js` to hide them.
- **Text**: section titles are in the HTML as `data-t="English|Indonesia"`.
- **Sections**: delete a `<section>` from `index.html` to remove it; empty lists
  in `config.js` hide their sections too.
- **Fonts**: Archivo (bold design), Newsreader (calm design), Geist (text) and
  Amiri (Arabic) are included in `assets/fonts`, all under the SIL Open Font
  License. Nothing is loaded from a font service.

## How prayer times are calculated

Times come from the sun's position for the mosque's coordinates (the same
astronomical formulas used by published timetables), with the twilight angles
of the chosen method. Results usually match official timetables within a minute
or two; use `adjust` to match yours exactly. Hijri dates use the Umm al-Qura
calendar built into the browser, adjustable with `hijriOffset`.

The Qibla tool shows the direction from the mosque, or from the visitor's own
position; its live compass uses the phone's orientation sensor, which needs
HTTPS. The zakat calculator works out 2.5% of net wealth once it reaches the
nisab (85 g of gold at the price entered). Every tool runs entirely in the
visitor's browser.

## Files

```
index.html, timetable.html, display.html
config.js                 your settings
assets/css/               bold.css, calm.css (website), bold-display.css, calm-display.css (TV)
assets/js/                page scripts (plain JavaScript modules, no build step)
assets/img/               logo, QR placeholder
assets/fonts/             Archivo, Newsreader, Geist, Amiri (OFL) and their licenses
assets/toowl/             prayer-time engine and tool components (toowl Islamic Kit)
```

## Browser support

Current Chrome, Edge, Firefox and Safari on desktop and mobile, and Android TV
or smart-TV browsers based on Chromium.

## Support

Questions and bug reports: use the comments or support tab on the item page.
