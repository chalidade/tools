// ─────────────────────────────────────────────────────────────────────────────
//  Your mosque, in one file. Edit the values below, save, and reload the page.
//  Every page (index.html, timetable.html, display.html) reads this file.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  /** Interface language: 'en' (English) or 'id' (Bahasa Indonesia). */
  lang: 'en',

  name: 'Masjid Al-Ikhlas',
  tagline: 'A home for prayer, learning and community.',
  /** Shown in the footer and the contact section. */
  address: 'Jl. Contoh Raya No. 1, Jakarta 12345',
  /** A link to your mosque on a map (opens in a new tab; nothing is embedded). */
  mapUrl: 'https://www.openstreetmap.org/?mlat=-6.2088&mlon=106.8456#map=17/-6.2088/106.8456',

  /** The mosque's position. Find it on any map: right-click → copy coordinates. */
  location: { lat: -6.2088, lng: 106.8456, tz: 7 /* hours ahead of UTC */ },

  /**
   * Calculation method: 'kemenag' (Indonesia), 'jakim' (Malaysia), 'muis' (Singapore),
   * 'mwl' (Muslim World League), 'isna' (North America), 'egypt', 'karachi', 'makkah' (Umm al-Qura).
   */
  method: 'kemenag',
  /** Asr: 1 = Shafi'i, Maliki, Hanbali; 2 = Hanafi. */
  asr: 1,
  /** Fine-tune each time by whole minutes to match your local timetable, e.g. { subuh: 2 }. */
  adjust: { subuh: 0, zuhur: 0, asar: 0, maghrib: 0, isya: 0 },
  /** Shift the Hijri date by whole days if your local moon sighting differs (−2 … 2). */
  hijriOffset: 0,

  /** Minutes from adhan to iqamah. Used on the home page and the TV display. */
  iqamah: { subuh: 15, zuhur: 10, asar: 10, maghrib: 7, isya: 10 },

  /** Friday prayer. The time follows Dhuhr unless you set a fixed one, e.g. '12:15'. */
  jumuah: {
    time: '',
    schedule: [
      { date: '2026-11-27', khatib: 'Ust. Ahmad Fauzi', imam: 'Ust. Hasan' },
      { date: '2026-12-04', khatib: 'Dr. Abdullah Rahman', imam: 'Ust. Hasan' },
      { date: '2026-12-11', khatib: 'Ust. Muhammad Iqbal', imam: 'Ust. Yusuf' },
    ],
  },

  /** Short notices: on the home page and scrolling along the bottom of the TV display. */
  announcements: [
    'Ramadan programme registration is open at the secretariat.',
    'Please keep the parking area clear for the ambulance on Fridays.',
    'Community clean-up every first Sunday of the month after Subuh.',
  ],

  /** Regular classes and events. */
  events: [
    { title: 'Tafsir Al-Quran', speaker: 'Ust. Ahmad Fauzi', when: 'Every Tuesday', time: 'After Maghrib', tag: 'Weekly' },
    { title: 'Fiqh of Daily Life', speaker: 'Dr. Abdullah Rahman', when: 'Every Thursday', time: 'After Isya', tag: 'Weekly' },
    { title: 'Youth Halaqah', speaker: 'Remaja Masjid', when: 'Saturday', time: '16:00', tag: 'Youth' },
    { title: 'Quran Class for Kids (TPQ)', speaker: 'TPQ Teachers', when: 'Mon – Fri', time: '15:30', tag: 'Kids' },
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
      { bank: 'Bank Name', number: '000 000 0000', holder: 'Masjid Al-Ikhlas' },
      { bank: 'Another Bank', number: '111 111 1111', holder: 'Masjid Al-Ikhlas Zakat' },
    ],
    /** An image of your QR payment code, or '' to hide it. */
    qr: 'assets/img/qr-placeholder.svg',
  },

  contact: {
    phone: '+62 21 0000 0000',
    whatsapp: '6281200000000', // country code + number, digits only
    email: 'info@example.org',
    instagram: '',
    youtube: '',
  },

  /** Colors. primary = buttons and headings, accent = highlights. */
  theme: { primary: '#0f5f4a', accent: '#c9a227' },

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
