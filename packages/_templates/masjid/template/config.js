// ─────────────────────────────────────────────────────────────────────────────
//  Your mosque, in one file. Edit the values below, save, and reload the page.
//  Every page (index.html, timetable.html, display.html) reads this file.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  /** Interface language: 'en' (English) or 'id' (Bahasa Indonesia). */
  lang: 'en',

  /** The look of the site: 'bold' (dark, large type, a row of arches) or 'calm' (light, editorial). */
  design: 'bold',
  /** Shows a small Calm / Bold switch in the corner, for trying both. Keep it false on a live site. */
  designSwitcher: false,

  name: 'Al-Noor Mosque',
  tagline: 'A home for prayer, learning and community.',
  /** Shown in the footer and the contact section. */
  address: '24 Example Road, London E1 0AA',
  /** A link to your mosque on a map (opens in a new tab; nothing is embedded). */
  mapUrl: 'https://www.openstreetmap.org/?mlat=51.5194&mlon=-0.0590#map=17/51.5194/-0.0590',

  /**
   * The mosque's position. Find it on any map: right-click → copy coordinates.
   * tz is the time zone by name (it follows daylight saving), e.g. 'Europe/London',
   * 'America/New_York', 'Asia/Jakarta', 'Asia/Kuala_Lumpur'. A fixed number of hours
   * ahead of UTC also works, e.g. 7.
   */
  location: { lat: 51.5194, lng: -0.059, tz: 'Europe/London' },

  /**
   * Calculation method: 'mwl' (Muslim World League), 'isna' (North America), 'egypt',
   * 'karachi', 'makkah' (Umm al-Qura), 'kemenag' (Indonesia), 'jakim' (Malaysia), 'muis' (Singapore).
   */
  method: 'mwl',
  /** Asr: 1 = Shafi'i, Maliki, Hanbali; 2 = Hanafi. */
  asr: 1,
  /** Fine-tune each time by whole minutes to match your local timetable, e.g. { fajr: 2 }. */
  adjust: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  /** Shift the Hijri date by whole days if your local moon sighting differs (−2 … 2). */
  hijriOffset: 0,

  /** Show each prayer's name in Arabic beside it (false to hide). */
  arabic: true,

  /** Minutes from adhan to iqamah. Used on the home page and the TV display. */
  iqamah: { fajr: 20, dhuhr: 15, asr: 10, maghrib: 5, isha: 10 },

  /** Friday prayer. The time follows Dhuhr unless you set a fixed one, e.g. '13:00'. */
  jumuah: {
    time: '12:30',
    schedule: [
      { date: '2026-11-27', khatib: 'Sheikh Ahmad Farid', imam: 'Imam Yusuf Rahman' },
      { date: '2026-12-04', khatib: 'Dr. Abdullah Karim', imam: 'Imam Yusuf Rahman' },
      { date: '2026-12-11', khatib: 'Ustadh Bilal Hassan', imam: 'Imam Idris Malik' },
    ],
  },

  /** Short notices: on the home page and scrolling along the bottom of the TV display. */
  announcements: [
    'Ramadan programme registration is open at the office.',
    'Please keep the car park entrance clear on Fridays.',
    'Community clean-up on the first Sunday of every month, after Fajr.',
  ],

  /** Regular classes and events. */
  events: [
    { title: 'Tafsir of the Quran', speaker: 'Sheikh Ahmad Farid', when: 'Every Tuesday', time: 'After Maghrib', tag: 'Weekly' },
    { title: 'Fiqh of Daily Life', speaker: 'Dr. Abdullah Karim', when: 'Every Thursday', time: 'After Isha', tag: 'Weekly' },
    { title: 'Youth Circle', speaker: 'Al-Noor Youth', when: 'Saturday', time: '16:00', tag: 'Youth' },
    { title: 'Quran Class for Children', speaker: 'Our teachers', when: 'Mon – Fri', time: '17:00', tag: 'Children' },
  ],

  /** What the mosque offers. Icons: quran, kids, food, heart, mic, users, home, book. */
  programs: [
    { icon: 'quran', title: 'Quran School', text: 'Reading and memorisation classes for children and adults.' },
    { icon: 'heart', title: 'Zakat & Charity', text: 'Collected and distributed to those in need in our neighbourhood.' },
    { icon: 'food', title: 'Friday Meals', text: 'A shared meal after Jumuah, open to everyone.' },
    { icon: 'users', title: 'Community', text: 'Weddings, funerals and family support, guided by our imams.' },
  ],

  /** Donations. Replace the placeholders with your real details. */
  donation: {
    text: 'Support the running costs of the mosque, the Quran school and our charity work.',
    accounts: [
      { bank: 'Bank name', number: '00-00-00 0000 0000', holder: 'Al-Noor Mosque' },
      { bank: 'Another bank', number: '11-11-11 1111 1111', holder: 'Al-Noor Mosque Zakat Fund' },
    ],
    /** An image of your QR payment code, or '' to hide it. */
    qr: 'assets/img/qr-placeholder.svg',
  },

  /** Zakat calculator: your currency (ISO code) and a starting gold price per gram, which visitors can change. */
  zakat: { currency: 'GBP', goldPricePerGram: '' },

  contact: {
    phone: '+44 20 0000 0000',
    whatsapp: '447000000000', // country code + number, digits only
    email: 'info@example.org',
    instagram: '',
    youtube: '',
  },

  /**
   * Colors. Leave them empty to use each design's own palette, or set your own:
   * primary = the main color (arches, dark bands, the TV display), accent = highlights.
   */
  theme: { primary: '', accent: '' },

  /** TV / screen display (display.html). */
  display: {
    /** Minutes the adhan notice stays up before the iqamah countdown starts. */
    adhan: 3,
    /** Minutes the "prayer in progress" screen stays up after iqamah. */
    prayer: 10,
    /** Seconds each slide stays up. */
    slideSeconds: 12,
    /** Slides for the big panel: quotes, notices, anything short. */
    slides: [
      { title: 'Indeed, prayer prohibits immorality and wrongdoing.', source: 'Al-Ankabut 29:45' },
      { title: 'The best of you are those who learn the Quran and teach it.', source: 'Sahih al-Bukhari' },
      { title: 'Please switch your phone to silent before the prayer.', source: '' },
    ],
  },
}
