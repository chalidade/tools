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

Everything is in English or Bahasa Indonesia (one setting).

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
| `name`, `tagline`, `address`, `mapUrl` | The mosque's identity. `mapUrl` is a plain link: no map is embedded, so no third-party scripts load. |
| `location` | `lat`, `lng` (decimal degrees) and `tz` (hours ahead of UTC, e.g. 7 for Jakarta, 0 for London, -5 for New York in winter). |
| `method` | `kemenag` (Indonesia), `jakim` (Malaysia), `muis` (Singapore), `mwl` (Muslim World League), `isna` (North America), `egypt`, `karachi`, `makkah` (Umm al-Qura). |
| `asr` | `1` for Shafi'i, Maliki and Hanbali, `2` for Hanafi. |
| `adjust` | Minutes added to a time to match your local timetable exactly, e.g. `{ subuh: 2, isya: -1 }`. |
| `hijriOffset` | Shifts the Hijri date by whole days when your local moon sighting differs. |
| `arabic` | `true` shows each prayer's name in Arabic beside it, `false` hides it. |
| `iqamah` | Minutes from adhan to iqamah for each prayer. |
| `jumuah` | `time` fixes the Friday prayer time (empty = Dhuhr), `schedule` lists dates with khatib and imam. Past dates are hidden automatically. |
| `announcements` | Short notices: on the home page and in the TV ticker. |
| `events`, `programs` | Classes and activities. Program icons: `quran`, `kids`, `food`, `heart`, `mic`, `users`, `home`, `book`. |
| `donation` | Text, bank accounts and a QR image path. Replace `assets/img/qr-placeholder.svg` with your QR code image. |
| `contact` | Phone, WhatsApp (digits with country code), email, Instagram, YouTube. Empty values are hidden. |
| `theme` | `primary` (the arch, the donate band, the TV display) and `accent` (small highlights). |
| `display` | TV settings: how long the adhan and "prayer in progress" screens stay up, slide timing, and the slides. |

Daylight saving time: `tz` is a fixed offset. If your city changes its clocks,
update `tz` when it does.

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

- **Colors**: `theme` in `config.js`, or the variables at the top of
  `assets/css/style.css` and `assets/css/display.css`.
- **Logo**: replace `assets/img/logo.svg` (any square image works; update the
  `<img>` tags if you use PNG). On the TV display it sits on a light tab, so a
  dark logo stays readable.
- **Arabic prayer names**: shown beside each prayer; set `arabic: false` in
  `config.js` to hide them.
- **Text**: section titles are in the HTML as `data-t="English|Indonesia"`.
- **Sections**: delete a `<section>` from `index.html` to remove it; empty lists
  in `config.js` hide their sections too.
- **Fonts**: Newsreader (headings), Geist (text and numbers) and Amiri (Arabic)
  are included in `assets/fonts`, all under the SIL Open Font License. Nothing
  is loaded from a font service.

## How prayer times are calculated

Times come from the sun's position for the mosque's coordinates (the same
astronomical formulas used by published timetables), with the twilight angles
of the chosen method. Results usually match official timetables within a minute
or two; use `adjust` to match yours exactly. Hijri dates use the Umm al-Qura
calendar built into the browser, adjustable with `hijriOffset`.

The qibla compass uses the phone's orientation sensor, which needs HTTPS. The
zakat calculator and the other tools run entirely in the visitor's browser.

## Files

```
index.html, timetable.html, display.html
config.js                 your settings
assets/css/               styles
assets/js/                page scripts (plain JavaScript modules, no build step)
assets/img/               logo, QR placeholder
assets/fonts/             Newsreader, Geist, Amiri (OFL) and their licenses
assets/toowl/             prayer-time engine and tool components (toowl Islamic Kit)
```

## Browser support

Current Chrome, Edge, Firefox and Safari on desktop and mobile, and Android TV
or smart-TV browsers based on Chromium.

## Support

Questions and bug reports: use the comments or support tab on the item page.
