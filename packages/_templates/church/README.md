# Church: Church Website Template

A complete website for a church, plus a TV display for the lobby. Service
times, countdowns and the calendar are worked out in the browser from one
settings file, so there is no database and no server code: upload the files to
any web hosting and edit one file.

- **index.html**: home page with the next service and a live countdown, the
  weekly services as a row of arches, the latest sermon and earlier ones, a
  live-stream link, notices, upcoming events, ministries, a "plan your visit"
  section with questions and answers, giving (online link, bank accounts with
  copy buttons, a QR code) and contact details.
- **calendar.html**: a month of services and events, browsable month by month
  and ready to print on one A4 page. On a phone it becomes a list of the days
  with something on.
- **display.html**: a full-screen display for a TV or projector in the lobby
  or hall: big clock, the next service with a countdown, rotating slides
  (verses, notices), the coming services and events, and a scrolling notice
  bar. Before a service it switches to a large "the service begins in"
  countdown, and while the service runs it shows a welcome screen.

Two designs are included, switched with one setting (`design` in `config.js`):

- **bold**: deep navy with a vermilion accent, large condensed capitals, and a
  row of pointed arches for the week's services.
- **calm**: light and editorial, with serif headings and fine rules.

The text is in English or Bahasa Indonesia (one setting).

## Quick start

1. Open `config.js` in any text editor and change the name, address, time
   zone, services, sermons, events, ministries and giving details.
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
| `name`, `tagline`, `address`, `mapUrl` | The church's identity. `mapUrl` is a plain link: no map is embedded, so no third-party scripts load. |
| `timeZone` | The church's time zone by name, e.g. `'America/Chicago'`, `'Europe/London'`, `'Australia/Sydney'`, `'Asia/Jakarta'`. Countdowns use the church's clock wherever the visitor is, and daylight saving is followed automatically. |
| `services` | Weekly services: `day` (`sun` … `sat`), `time` (24-hour `'HH:MM'`), `name`, `note` and `minutes` (how long it lasts; the TV shows the welcome screen meanwhile). |
| `live` | `url` and `label` of your live stream. A plain link, nothing is embedded. Leave `url` empty to hide it. |
| `sermons` | `title`, `series`, `speaker`, `passage`, `date` (`'YYYY-MM-DD'`) and `url`. The newest is shown large, the next three as rows. |
| `announcements` | Short notices: on the home page and in the TV ticker. |
| `events` | A one-off event has a `date` (`'YYYY-MM-DD'`), a weekly one has `every: 'fri'`. Both have `time`, `place` and `tag`. Past one-off events are hidden automatically. |
| `ministries` | `icon`, `title`, `text`. Icons: `kids`, `youth`, `music`, `heart`, `book`, `coffee`, `globe`, `users`, `home`, `food`. |
| `giving` | `text`, `onlineUrl` (your giving page; empty hides the button), `accounts` and a `qr` image path. Replace `assets/img/qr-placeholder.svg` with your own QR code image. |
| `welcome`, `visit` | The welcome text for first-time guests and their questions (`q`) with answers (`a`). |
| `contact` | Phone, WhatsApp (digits with country code), email, Instagram, YouTube. Empty values are hidden. |
| `theme` | `primary` and `accent` colors. Leave them empty to use each design's own palette. |
| `display` | TV settings: `countdown` (minutes before a service when the big countdown appears), `slideSeconds` and the `slides`. |

## The TV display

Open `display.html` on the computer, TV box or smart TV browser connected to
the screen, then click **Full screen** (or press F11). The mouse pointer hides
itself, and the screen is kept awake where the browser allows it.

The screen changes by itself:

1. **Normal**: clock, date, the next service with a countdown, rotating slides
   and the next five services and events.
2. **Countdown**: `display.countdown` minutes before a service, a large
   "the service begins in" countdown with the service name.
3. **Welcome**: while a service runs (its `minutes`), a welcome screen.

To check these screens without waiting, add `?at=HH:MM` and a weekday to the
address, e.g. `display.html?at=08:55&day=sun`. The display works offline once
loaded; reload it after you change `config.js`.

## Customizing

- **Design**: `design` in `config.js`. Each design is its own stylesheet:
  `assets/css/bold.css` and `calm.css` for the website and calendar,
  `bold-display.css` and `calm-display.css` for the TV display. You can delete
  the pair you don't use.
- **Colors**: `theme` in `config.js`, or the variables at the top of the
  design's stylesheet.
- **Logo**: replace `assets/img/logo.svg` (any square image works; update the
  `<img>` tags if you use PNG). In the bold design it sits on a light circle,
  so a dark logo stays readable.
- **Text**: section titles are in the HTML as `data-t="English|Indonesia"`.
- **Sections**: delete a `<section>` from `index.html` to remove it; empty lists
  in `config.js` hide their sections too.
- **Fonts**: Archivo (bold design), Newsreader (calm design) and Geist (text)
  are included in `assets/fonts`, all under the SIL Open Font License. Nothing
  is loaded from a font service.

## Files

```
index.html, calendar.html, display.html
config.js                 your settings
assets/css/               bold.css, calm.css (website), bold-display.css, calm-display.css (TV)
assets/js/                page scripts (plain JavaScript modules, no build step)
assets/img/               logo, QR placeholder
assets/fonts/             Archivo, Newsreader, Geist (OFL) and their licenses
```

## Browser support

Current Chrome, Edge, Firefox and Safari on desktop and mobile, and Android TV
or smart-TV browsers based on Chromium.

## Support

Questions and bug reports: use the comments or support tab on the item page.
