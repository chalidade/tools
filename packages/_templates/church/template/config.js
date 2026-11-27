// ─────────────────────────────────────────────────────────────────────────────
//  Your church, in one file. Edit the values below, save, and reload the page.
//  Every page (index.html, calendar.html, display.html) reads this file.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  /** Interface language: 'en' (English) or 'id' (Bahasa Indonesia). */
  lang: 'en',

  /** The look of the site: 'bold' (deep navy, large type, a row of arches) or 'calm' (light, editorial). */
  design: 'bold',
  /** Shows a small Calm / Bold switch in the corner, for trying both. Keep it false on a live site. */
  designSwitcher: false,

  name: 'Grace Community Church',
  tagline: 'A place to belong, to grow and to serve. Everyone is welcome.',
  /** Shown in the visit section and the footer. */
  address: '120 Example Street, Austin, TX 78701',
  /** A link to your church on a map (opens in a new tab; nothing is embedded). */
  mapUrl: 'https://www.openstreetmap.org/?mlat=30.2672&mlon=-97.7431#map=17/30.2672/-97.7431',
  /**
   * The church's time zone by name, e.g. 'America/Chicago', 'Europe/London',
   * 'Australia/Sydney', 'Asia/Jakarta'. Countdowns follow it, wherever the visitor is.
   */
  timeZone: 'America/Chicago',

  /**
   * Weekly services. day: sun, mon, tue, wed, thu, fri, sat. time: 24-hour 'HH:MM'.
   * minutes: how long it lasts (the TV display shows a welcome screen meanwhile).
   */
  services: [
    { day: 'sun', time: '09:00', name: 'Morning Worship', note: 'Hymns and choir', minutes: 75 },
    { day: 'sun', time: '11:00', name: 'Contemporary Service', note: 'Band and kids church', minutes: 80 },
    { day: 'sun', time: '18:00', name: 'Evening Service', note: 'Quiet and reflective', minutes: 60 },
    { day: 'wed', time: '19:00', name: 'Midweek Prayer', note: 'Prayer and Bible study', minutes: 60 },
  ],

  /** Live stream. A plain link: nothing is embedded, so no third-party scripts load. */
  live: { url: 'https://www.youtube.com/', label: 'Watch live on YouTube' },

  /** The latest sermon, shown large, then a few earlier ones. url can be '' to hide the link. */
  sermons: [
    { title: 'Light in the Waiting', series: 'Advent: Hope Is Near', speaker: 'Pastor James Miller', passage: 'Isaiah 9:2–7', date: '2026-11-22', url: 'https://www.youtube.com/' },
    { title: 'A Table for Everyone', series: 'The Gospel of Luke', speaker: 'Pastor Sarah Okafor', passage: 'Luke 14:15–24', date: '2026-11-15', url: 'https://www.youtube.com/' },
    { title: 'Faith That Lasts', series: 'The Gospel of Luke', speaker: 'Pastor James Miller', passage: 'Luke 18:1–8', date: '2026-11-08', url: 'https://www.youtube.com/' },
    { title: 'The Lost Sheep', series: 'The Gospel of Luke', speaker: 'Elder David Chen', passage: 'Luke 15:1–7', date: '2026-11-01', url: 'https://www.youtube.com/' },
  ],

  /** Short notices: on the home page and scrolling along the bottom of the TV display. */
  announcements: [
    'Christmas Eve candlelight services at 16:00 and 22:00.',
    'Coat drive: bring warm clothes to the foyer until 20 December.',
    'New here? Join us for coffee after any Sunday service.',
  ],

  /**
   * Events. A one-off event has a date ('YYYY-MM-DD'); a weekly one has every: 'tue' (a day).
   * Both show on the home page, the calendar and the TV display.
   */
  events: [
    { title: 'Christmas Concert', date: '2026-12-13', time: '19:00', place: 'Main hall', tag: 'Music' },
    { title: 'Community Food Bank', date: '2026-12-05', time: '09:00', place: 'Fellowship hall', tag: 'Outreach' },
    { title: 'Christmas Eve Candlelight', date: '2026-12-24', time: '16:00', place: 'Sanctuary', tag: 'Christmas' },
    { title: 'Youth Night', every: 'fri', time: '19:00', place: 'Youth room', tag: 'Youth' },
    { title: 'Women’s Bible Study', every: 'tue', time: '10:00', place: 'Room 2', tag: 'Weekly' },
  ],

  /** Ministries. Icons: kids, youth, music, heart, book, coffee, globe, users, home, food. */
  ministries: [
    { icon: 'kids', title: 'Kids Church', text: 'Safe, fun classes for ages 0 to 11 during the 11:00 service.' },
    { icon: 'youth', title: 'Youth', text: 'Friday nights and summer camp for ages 12 to 18.' },
    { icon: 'music', title: 'Worship & Choir', text: 'Singers and musicians are always welcome to join.' },
    { icon: 'globe', title: 'Outreach', text: 'Food bank, missions and care for our neighbours.' },
  ],

  /** Giving. Replace the placeholders with your real details; onlineUrl links to your giving page. */
  giving: {
    text: 'Your generosity supports our ministries, our building and our care for the city.',
    onlineUrl: 'https://example.org/give',
    accounts: [
      { bank: 'Bank name', number: '000000000 · 0000000000', holder: 'Grace Community Church' },
      { bank: 'Building fund', number: '111111111 · 1111111111', holder: 'Grace Community Church' },
    ],
    /** An image of your QR payment code, or '' to hide it. */
    qr: 'assets/img/qr-placeholder.svg',
  },

  /** Plan your visit: a welcome for first-time guests, then short answers. */
  welcome: 'Come as you are. Someone at the door will help you find a seat, and the coffee is on after every service.',
  visit: [
    { q: 'What should I wear?', a: 'Whatever you are comfortable in. You will see everything from jeans to suits.' },
    { q: 'Is there something for my kids?', a: 'Yes. Kids Church runs during the 11:00 service, with a check-in desk in the foyer.' },
    { q: 'Where do I park?', a: 'Free parking behind the building, with spaces kept near the door for guests.' },
  ],

  contact: {
    phone: '+1 512 000 0000',
    whatsapp: '', // country code + number, digits only
    email: 'hello@example.org',
    instagram: '',
    youtube: '',
  },

  /**
   * Colors. Leave them empty to use each design's own palette, or set your own:
   * primary = the main color, accent = highlights.
   */
  theme: { primary: '', accent: '' },

  /** TV / lobby screen (display.html). */
  display: {
    /** Minutes before a service when the screen switches to a big countdown. */
    countdown: 10,
    /** Seconds each slide stays up. */
    slideSeconds: 12,
    /** Slides for the big panel: verses, notices, anything short. */
    slides: [
      { title: 'Come to me, all you who are weary and burdened, and I will give you rest.', source: 'Matthew 11:28' },
      { title: 'New here? Stop by the welcome desk. We would love to meet you.', source: '' },
      { title: 'Please silence your phone before the service begins.', source: '' },
    ],
  },
}
