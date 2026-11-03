// CV data, sample content, JSON import and the plain document model that both
// the preview and the PDF/Word writers render. Pure logic, no browser APIs.

export type CvLang = 'id' | 'en'
export type Layout = 'classic' | 'modern' | 'compact'
export type SectionId = 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certs' | 'languages'

export const SECTION_IDS: SectionId[] = ['summary', 'experience', 'education', 'skills', 'projects', 'certs', 'languages']
export const LAYOUTS: Layout[] = ['classic', 'modern', 'compact']

export interface Exp {
  role: string
  org: string
  place: string
  period: string
  /** One bullet per line. */
  bullets: string
}
export interface Edu {
  school: string
  degree: string
  period: string
  note: string
}

export interface CvData {
  lang: CvLang
  layout: Layout
  name: string
  headline: string
  email: string
  phone: string
  location: string
  /** One link per line (LinkedIn, portfolio, GitHub). */
  links: string
  summary: string
  experience: Exp[]
  education: Edu[]
  /** Separated by commas or new lines. */
  skills: string
  /** One per line. */
  projects: string
  certs: string
  languages: string
  order: SectionId[]
}

export const emptyExp = (): Exp => ({ role: '', org: '', place: '', period: '', bullets: '' })
export const emptyEdu = (): Edu => ({ school: '', degree: '', period: '', note: '' })

/** Standard ATS headings, which is what parsers look for. */
export const HEADINGS: Record<SectionId, Record<CvLang, string>> = {
  summary: { id: 'Ringkasan', en: 'Summary' },
  experience: { id: 'Pengalaman Kerja', en: 'Work Experience' },
  education: { id: 'Pendidikan', en: 'Education' },
  skills: { id: 'Keahlian', en: 'Skills' },
  projects: { id: 'Proyek', en: 'Projects' },
  certs: { id: 'Sertifikasi', en: 'Certifications' },
  languages: { id: 'Bahasa', en: 'Languages' },
}

export function sampleCv(lang: CvLang): CvData {
  const base = { lang, layout: 'classic' as Layout, order: [...SECTION_IDS] }
  if (lang === 'en')
    return {
      ...base,
      name: 'Alex Morgan',
      headline: 'Marketing Analyst',
      email: 'alex.morgan@example.com',
      phone: '+62 812 0000 0000',
      location: 'Jakarta, Indonesia',
      links: 'linkedin.com/in/alexmorgan',
      summary: 'Marketing analyst with 4 years of experience turning campaign data into decisions. Comfortable with SQL, dashboards and clear reporting to non-technical teams.',
      experience: [
        {
          role: 'Marketing Analyst',
          org: 'PT Maju Bersama',
          place: 'Jakarta',
          period: 'Jan 2022 – Present',
          bullets: 'Built weekly dashboards that cut reporting time by 60%\nRan A/B tests on email campaigns, lifting click-through rate by 18%\nPresented monthly results to the sales and product leads',
        },
        {
          role: 'Marketing Intern',
          org: 'Toko Sejahtera',
          place: 'Bandung',
          period: 'Jun 2020 – Dec 2021',
          bullets: 'Managed social media calendar for 3 brands\nCleaned and merged customer lists of 20,000 rows',
        },
      ],
      education: [{ school: 'Universitas Indonesia', degree: 'B.Sc. Statistics', period: '2016 – 2020', note: 'GPA 3.62 / 4.00' }],
      skills: 'SQL, Excel, Google Analytics, Looker Studio, A/B testing, Copywriting',
      projects: 'Customer churn analysis (SQL + Python), 2023\nOpen-source campaign template pack, 2022',
      certs: 'Google Data Analytics Certificate, 2021',
      languages: 'Indonesian (native)\nEnglish (fluent)',
    }
  return {
    ...base,
    name: 'Budi Santoso',
    headline: 'Analis Pemasaran',
    email: 'budi.santoso@example.com',
    phone: '0812-0000-0000',
    location: 'Jakarta, Indonesia',
    links: 'linkedin.com/in/budisantoso',
    summary: 'Analis pemasaran dengan pengalaman 4 tahun mengubah data kampanye menjadi keputusan. Terbiasa dengan SQL, dasbor, dan laporan yang mudah dipahami tim non-teknis.',
    experience: [
      {
        role: 'Analis Pemasaran',
        org: 'PT Maju Bersama',
        place: 'Jakarta',
        period: 'Jan 2022 – Sekarang',
        bullets: 'Membuat dasbor mingguan yang memangkas waktu pelaporan sebesar 60%\nMenjalankan A/B test kampanye email, rasio klik naik 18%\nMemaparkan hasil bulanan kepada tim penjualan dan produk',
      },
      {
        role: 'Magang Pemasaran',
        org: 'Toko Sejahtera',
        place: 'Bandung',
        period: 'Jun 2020 – Des 2021',
        bullets: 'Mengelola kalender media sosial untuk 3 merek\nMembersihkan dan menggabungkan daftar pelanggan 20.000 baris',
      },
    ],
    education: [{ school: 'Universitas Indonesia', degree: 'S1 Statistika', period: '2016 – 2020', note: 'IPK 3,62 / 4,00' }],
    skills: 'SQL, Excel, Google Analytics, Looker Studio, A/B testing, Penulisan iklan',
    projects: 'Analisis churn pelanggan (SQL + Python), 2023\nPaket templat kampanye open-source, 2022',
    certs: 'Google Data Analytics Certificate, 2021',
    languages: 'Indonesia (ibu)\nInggris (lancar)',
  }
}

const str = (x: unknown) => (typeof x === 'string' ? x : '')

/** Reads a CV from JSON text (a file made by this tool). Unknown fields are dropped. */
export function parseCv(text: string): CvData | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (typeof o.name !== 'string' && !Array.isArray(o.experience)) return null
  const lang: CvLang = o.lang === 'en' ? 'en' : 'id'
  const layout = LAYOUTS.includes(o.layout as Layout) ? (o.layout as Layout) : 'classic'
  const listOf = <T>(x: unknown, f: (r: Record<string, unknown>) => T): T[] =>
    Array.isArray(x) ? x.slice(0, 50).filter((r): r is Record<string, unknown> => !!r && typeof r === 'object').map(f) : []
  const given = Array.isArray(o.order) ? (o.order as unknown[]).filter((s): s is SectionId => SECTION_IDS.includes(s as SectionId)) : []
  const order = [...new Set([...given, ...SECTION_IDS])]
  return {
    lang,
    layout,
    name: str(o.name),
    headline: str(o.headline),
    email: str(o.email),
    phone: str(o.phone),
    location: str(o.location),
    links: str(o.links),
    summary: str(o.summary),
    experience: listOf(o.experience, (r) => ({ role: str(r.role), org: str(r.org), place: str(r.place), period: str(r.period), bullets: str(r.bullets) })),
    education: listOf(o.education, (r) => ({ school: str(r.school), degree: str(r.degree), period: str(r.period), note: str(r.note) })),
    skills: str(o.skills),
    projects: str(o.projects),
    certs: str(o.certs),
    languages: str(o.languages),
    order,
  }
}

// ---- document model -------------------------------------------------------

export type DocBlock =
  | { kind: 'entry'; title: string; right: string; sub: string; bullets: string[] }
  | { kind: 'text'; text: string }
  | { kind: 'bullets'; items: string[] }

export interface CvDoc {
  name: string
  headline: string
  contact: string[]
  sections: { id: SectionId; heading: string; blocks: DocBlock[] }[]
}

const lines = (s: string) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
const join = (parts: string[], sep: string) => parts.map((p) => p.trim()).filter(Boolean).join(sep)
/** Skills may be typed with commas, semicolons or new lines. */
export const skillList = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean)

export function buildDoc(d: CvData): CvDoc {
  const sections: CvDoc['sections'] = []
  for (const id of d.order) {
    let blocks: DocBlock[] = []
    if (id === 'summary') {
      if (d.summary.trim()) blocks = [{ kind: 'text', text: d.summary.trim().replace(/\s*\n\s*/g, ' ') }]
    } else if (id === 'experience') {
      blocks = d.experience
        .filter((e) => e.role.trim() || e.org.trim() || e.bullets.trim())
        .map((e) => ({ kind: 'entry' as const, title: join([e.role, e.org], ', '), right: e.period.trim(), sub: e.place.trim(), bullets: lines(e.bullets) }))
    } else if (id === 'education') {
      blocks = d.education
        .filter((e) => e.school.trim() || e.degree.trim())
        .map((e) => ({ kind: 'entry' as const, title: join([e.degree, e.school], ', '), right: e.period.trim(), sub: e.note.trim(), bullets: [] }))
    } else if (id === 'skills') {
      const list = skillList(d.skills)
      if (list.length) blocks = [{ kind: 'text', text: list.join(', ') }]
    } else {
      const items = lines(d[id])
      if (items.length) blocks = [{ kind: 'bullets', items }]
    }
    if (blocks.length) sections.push({ id, heading: HEADINGS[id][d.lang], blocks })
  }
  return {
    name: d.name.trim(),
    headline: d.headline.trim(),
    contact: [d.email, d.phone, d.location, ...lines(d.links)].map((x) => x.trim()).filter(Boolean),
    sections,
  }
}

export const cvFileName = (d: CvData) => {
  const slug = d.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug ? `cv-${slug}` : 'cv'
}
