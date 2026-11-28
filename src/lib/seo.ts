// What a search engine reads about each page: its title, description, the
// short "about" text under a tool, related links and structured data. The app
// renders these (ToolView, App) and scripts/seo.mjs writes the same text into
// each page's static HTML at build time, so the page a crawler fetches and the
// page a visitor sees say the same thing.

import type { Lang } from '@/lib/i18n'
import { TOOL_PAGES, TOOLS, categoryText, toolText, type Tool } from '@/tools/registry'
import { TOOLS_EN } from '@/tools/registry-en'
import { seoCopy } from '@/lib/seo-content'

export const SITE = 'https://toowl.my.id/'

/** Categories whose tools take the visitor's own files. */
const FILE_CATEGORIES = new Set(['reader', 'to-pdf', 'from-pdf', 'pdf', 'media'])
const takesFiles = (tool: Tool) => FILE_CATEGORIES.has(tool.category)

/** Absolute address of a page (home when slug is empty). */
export const absoluteUrl = (slug: string, lang: Lang) => `${SITE}${lang === 'en' ? 'en/' : ''}${slug ? `${slug}/` : ''}`

export interface PageMeta {
  title: string
  description: string
  slug: string
  lang: Lang
}

export function homeMeta(lang: Lang): PageMeta {
  return lang === 'en'
    ? {
        title: 'toowl — Free tools that run in your browser',
        description: `${TOOLS.length} free tools for PDFs, documents, images, video, audio, music and developer data — all running on your device. No account, nothing uploaded.`,
        slug: '',
        lang,
      }
    : {
        title: 'toowl — Kumpulan tools gratis, langsung di browser',
        description: `${TOOLS.length} tools gratis untuk PDF, dokumen, gambar, video, audio, musik, sampai data developer — semuanya berjalan di perangkatmu. Tanpa akun, tanpa upload.`,
        slug: '',
        lang,
      }
}

/** The page for site owners: embed any tool, and what a license adds. */
export const EMBED_SLUG = 'embed'

export function embedMeta(lang: Lang): PageMeta {
  return lang === 'en'
    ? {
        title: 'Embed free tools on your website — toowl for websites',
        description: `Put any of ${TOOLS.length} browser tools (PDF, image, video, finance calculators, prayer times…) on your own site with one line of code. Free with a small credit, or licensed: no credit, your colors.`,
        slug: EMBED_SLUG,
        lang,
      }
    : {
        title: 'Pasang tools gratis di website-mu — toowl untuk situs',
        description: `Pasang ${TOOLS.length} tools browser (PDF, gambar, video, kalkulator keuangan, jadwal sholat…) di situsmu sendiri dengan satu baris kode. Gratis dengan tulisan kecil toowl, atau berlisensi: tanpa tulisan, warna situsmu.`,
        slug: EMBED_SLUG,
        lang,
      }
}

/** Questions a site owner asks before buying; shown on /embed/ and as FAQPage JSON-LD. */
export function embedFaq(lang: Lang): { q: string; a: string }[] {
  const en = lang === 'en'
  return [
    en
      ? { q: 'Is the free embed really free?', a: 'Yes, for any site, personal or commercial. It shows one small "toowl" line under the tool. A license removes that line and lets you set your own accent color.' }
      : { q: 'Apakah embed gratis benar-benar gratis?', a: 'Ya, untuk situs apa pun, pribadi maupun komersial. Di bawah tool tampil satu baris kecil "toowl". Lisensi menghilangkan baris itu dan warnanya bisa kamu atur.' },
    en
      ? { q: 'Do my visitors\' files go to your server?', a: 'No. Every tool runs in the visitor\'s browser. toowl has no backend, so there is nothing to upload to and nothing for you to host or scale.' }
      : { q: 'Apakah file pengunjungku dikirim ke server kalian?', a: 'Tidak. Semua tool berjalan di browser pengunjung. toowl tidak punya backend, jadi tidak ada yang di-upload dan tidak ada server yang perlu kamu urus.' },
    en
      ? { q: 'What counts as one site?', a: 'One domain and its subdomains. For client work across many domains, take the Agency license.' }
      : { q: 'Satu situs itu maksudnya apa?', a: 'Satu domain beserta subdomainnya. Untuk banyak situs klien, ambil lisensi Agensi.' },
    en
      ? { q: 'Do I get new tools?', a: 'Yes. New tools ship almost every day. A pack covers every new tool in its theme, and All-Access and Agency cover every new tool, at no extra cost.' }
      : { q: 'Apakah saya dapat tool baru?', a: 'Ya. Tool baru rilis hampir setiap hari. Paket mencakup tool baru di temanya, sedangkan All-Access dan Agensi mencakup semua tool baru, tanpa biaya tambahan.' },
    en
      ? { q: 'How do I use the license key?', a: 'Open the tool on toowl.my.id, expand "Add it to your site", paste the key from your Gumroad receipt and pick a color. The embed code updates; paste it into your page.' }
      : { q: 'Bagaimana cara memakai kunci lisensi?', a: 'Buka tool di toowl.my.id, buka "Pasang di situsmu", tempel kunci dari email Gumroad, lalu pilih warna. Kode embed langsung berubah; tempel ke halamanmu.' },
    en
      ? { q: 'What if it does not work on my site?', a: 'Email within 14 days of buying for a full refund.' }
      : { q: 'Bagaimana kalau tidak jalan di situsku?', a: 'Kirim email dalam 14 hari setelah membeli untuk refund penuh.' },
  ]
}

/** The developer page: toowl's engines as paid Apify Actors (src/lib/apify.ts). */
export const API_SLUG = 'api'

export function apiMeta(lang: Lang): PageMeta {
  return lang === 'en'
    ? {
        title: 'toowl API — Bulk PDF, image, document & video APIs (Apify)',
        description:
          'The engines behind toowl as pay-per-use APIs: PDF to Markdown, OCR, Word/Excel to PDF, PDF compressor, PDF to image, image compressor (TinyPNG alternative), background remover, image to SVG and more. Call them from code, n8n, Make or Zapier. No subscription.',
        slug: API_SLUG,
        lang,
      }
    : {
        title: 'API toowl — API massal untuk PDF, gambar, dokumen & video (Apify)',
        description:
          'Engine di balik toowl sebagai API bayar per pemakaian: PDF ke Markdown, OCR, Word/Excel ke PDF, kompres PDF, PDF ke gambar, kompres gambar, hapus latar, gambar ke SVG dan lainnya. Panggil dari kode, n8n, Make atau Zapier. Tanpa langganan.',
        slug: API_SLUG,
        lang,
      }
}

/** Questions a developer asks first; shown on /api/ and as FAQPage JSON-LD. */
export function apiFaq(lang: Lang): { q: string; a: string }[] {
  const en = lang === 'en'
  return [
    en
      ? { q: 'Is it the same as the free tools on toowl?', a: 'Same engines and settings, run on a server instead of your browser, so you can send thousands of files at once, on a schedule or from your own app.' }
      : { q: 'Apakah sama dengan tool gratis di toowl?', a: 'Engine dan pengaturannya sama, hanya dijalankan di server, bukan di browser. Jadi kamu bisa kirim ribuan file sekaligus, terjadwal, atau dari aplikasimu sendiri.' },
    en
      ? { q: 'Where are my files processed?', a: 'With the API, files are downloaded from the URLs you give and processed on Apify’s servers, then kept in your Apify storage (deleted after your plan’s retention period). The free tools on toowl.my.id still never upload anything.' }
      : { q: 'File-ku diproses di mana?', a: 'Lewat API, file diunduh dari URL yang kamu berikan dan diproses di server Apify, lalu disimpan di storage Apify-mu (dihapus sesuai masa simpan paketmu). Tool gratis di toowl.my.id tetap tidak meng-upload apa pun.' },
    en
      ? { q: 'How much does it cost?', a: 'You pay per file or per page, nothing per month. Every Apify account gets free monthly credit, enough for thousands of files on most of these APIs, so you can try them without paying.' }
      : { q: 'Berapa biayanya?', a: 'Bayar per file atau per halaman, tanpa biaya bulanan. Setiap akun Apify dapat kredit gratis tiap bulan, cukup untuk ribuan file di kebanyakan API ini, jadi bisa dicoba tanpa bayar.' },
    en
      ? { q: 'Do failed files cost anything?', a: 'No. A file that cannot be processed gets a row with the error and is not charged. You can also cap the cost of every run.' }
      : { q: 'Apakah file yang gagal ditagih?', a: 'Tidak. File yang gagal diproses dapat baris berisi error dan tidak ditagih. Kamu juga bisa membatasi biaya maksimal tiap run.' },
    en
      ? { q: 'Can I use it without code?', a: 'Yes. Apify has apps for n8n, Make and Zapier, and you can run any of these from the Apify Console with a form.' }
      : { q: 'Bisa dipakai tanpa coding?', a: 'Bisa. Apify punya integrasi n8n, Make dan Zapier, dan setiap API bisa dijalankan dari Apify Console lewat formulir.' },
    en
      ? { q: 'Is the code open?', a: 'Yes, the Actors live in toowl’s public repository (AGPL-3.0). The API is for when you would rather not host and scale it yourself.' }
      : { q: 'Apakah kodenya terbuka?', a: 'Ya, kode Actor ada di repositori publik toowl (AGPL-3.0). API-nya untuk kamu yang tidak mau repot meng-host dan mengurus server sendiri.' },
  ]
}

export function toolMeta(tool: Tool, lang: Lang): PageMeta {
  const text = toolText(tool, lang)
  const files = takesFiles(tool)
  const online = /online/i.test(text.title) ? '' : ' Online'
  const custom = seoCopy(tool.slug, lang)?.title
  const title = custom
    ? `${custom} | toowl`
    : lang === 'en'
      ? `${text.title}${online} — Free${files ? ', No Upload' : ''} | toowl`
      : `${text.title}${online} Gratis${files ? ', Tanpa Upload' : ''} — toowl`
  const tail =
    lang === 'en'
      ? files
        ? 'Free, no account, and your file is never uploaded — it is processed on your device.'
        : 'Free, no account, and it runs right in your browser.'
      : files
        ? 'Gratis, tanpa akun, dan file tidak di-upload — diproses di perangkatmu.'
        : 'Gratis, tanpa akun, dan langsung jalan di browsermu.'
  return { title, description: `${text.description} ${tail}`, slug: tool.slug, lang }
}

/** The short "why this tool" points shown under every tool. */
export function aboutPoints(tool: Tool, lang: Lang): string[] {
  const en = lang === 'en'
  return [
    takesFiles(tool)
      ? en
        ? 'Your file is processed on your device and is never uploaded to a server.'
        : 'File diproses di perangkatmu dan tidak pernah di-upload ke server.'
      : en
        ? 'Runs entirely in your browser; nothing you enter is sent to a server.'
        : 'Berjalan sepenuhnya di browsermu; tidak ada isian yang dikirim ke server.',
    en ? 'Free, with no account and no sign-up.' : 'Gratis, tanpa akun dan tanpa daftar.',
    en
      ? 'Installable as an app; a tool you have opened keeps working offline.'
      : 'Bisa dipasang sebagai aplikasi; tool yang pernah dibuka tetap jalan saat offline.',
    en ? 'Open source (AGPL-3.0) on GitHub.' : 'Kode sumbernya terbuka (AGPL-3.0) di GitHub.',
  ]
}

/** Questions and answers shown under a tool (and in its static page), if it has any. */
export function toolFaq(tool: Tool, lang: Lang) {
  const own = (lang === 'en' ? TOOLS_EN[tool.slug]?.faq : undefined) ?? (lang === 'en' ? [] : tool.faq) ?? []
  return [...own, ...(seoCopy(tool.slug, lang)?.faq ?? [])]
}

export function faqHeading(lang: Lang) {
  return lang === 'en' ? 'Questions' : 'Tanya jawab'
}

/** The tools most visitors come for (Cloudflare analytics), linked from every tool page. */
const POPULAR = ['pas-foto', 'remove-background', 'compress-pdf', 'compress-image', 'pdf-to-word', 'compress-video', 'qr-generator', 'merge-pdf', 'kpr']

export function popularTools(tool: Tool, max = 6): Tool[] {
  const related = new Set(relatedTools(tool).map((t) => t.slug))
  return POPULAR.filter((s) => s !== tool.slug && !related.has(s))
    .map((s) => TOOLS.find((t) => t.slug === s))
    .filter((t): t is Tool => !!t)
    .slice(0, max)
}

export function popularHeading(lang: Lang) {
  return lang === 'en' ? 'Popular tools' : 'Tools populer'
}

/** Other tools in the same category, for the "related" links. */
export function relatedTools(tool: Tool, max = 6): Tool[] {
  // A tool and its landing pages (twibbon → twibbon-ramadan …) link to each other first.
  const family = tool.variantOf ?? tool.slug
  const kin = TOOL_PAGES.filter((t) => t.slug !== tool.slug && (t.slug === family || t.variantOf === family))
  const rest = TOOLS.filter((t) => t.category === tool.category && t.slug !== tool.slug && t.slug !== family)
  return [...kin, ...rest].slice(0, Math.max(max, kin.length))
}

export function relatedHeading(tool: Tool, lang: Lang) {
  const cat = categoryText(tool.category, lang).title
  return lang === 'en' ? `More in ${cat}` : `Tools lain di ${cat}`
}

/** schema.org data for the page, as a JSON-LD object. */
export function structuredData(meta: PageMeta) {
  const url = absoluteUrl(meta.slug, meta.lang)
  if (!meta.slug)
    return [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'toowl', url, inLanguage: meta.lang, description: meta.description, publisher: { '@id': `${SITE}#org` } },
      { '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE}#org`, name: 'toowl', url: SITE, logo: `${SITE}icon-512.png`, sameAs: ['https://github.com/chalidade/tools'] },
    ]
  if (meta.slug === EMBED_SLUG || meta.slug === API_SLUG)
    return [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: meta.title, url, inLanguage: meta.lang, description: meta.description, isPartOf: { '@type': 'WebSite', name: 'toowl', url: SITE } },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: meta.lang,
        mainEntity: (meta.slug === API_SLUG ? apiFaq : embedFaq)(meta.lang).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ]
  const tool = TOOL_PAGES.find((t) => t.slug === meta.slug)!
  const app = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: toolText(tool, meta.lang).title,
    url,
    description: meta.description,
    inLanguage: meta.lang,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' },
    isPartOf: { '@type': 'WebSite', name: 'toowl', url: SITE },
  }
  const parent = tool.variantOf ? TOOL_PAGES.find((t) => t.slug === tool.variantOf) : undefined
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'toowl', item: absoluteUrl('', meta.lang) },
      ...(parent ? [{ '@type': 'ListItem', position: 2, name: toolText(parent, meta.lang).title, item: absoluteUrl(parent.slug, meta.lang) }] : []),
      { '@type': 'ListItem', position: parent ? 3 : 2, name: toolText(tool, meta.lang).title, item: url },
    ],
  }
  const faq = toolFaq(tool, meta.lang)
  if (!faq.length) return [app, crumbs]
  return [
    app,
    crumbs,
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: meta.lang,
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ]
}

/**
 * Keeps <head> in step with the page after an in-app navigation. The build
 * writes the same tags into each page's HTML, so a fresh load already has them.
 */
export function applyHead(meta: PageMeta) {
  document.title = meta.title
  const url = absoluteUrl(meta.slug, meta.lang)
  const set = (selector: string, attr: string, value: string) => document.head.querySelector(selector)?.setAttribute(attr, value)
  set('meta[name="description"]', 'content', meta.description)
  set('link[rel="canonical"]', 'href', url)
  set('link[rel="alternate"][hreflang="id"]', 'href', absoluteUrl(meta.slug, 'id'))
  set('link[rel="alternate"][hreflang="en"]', 'href', absoluteUrl(meta.slug, 'en'))
  set('link[rel="alternate"][hreflang="x-default"]', 'href', absoluteUrl(meta.slug, 'id'))
  set('meta[property="og:url"]', 'content', url)
  set('meta[property="og:title"]', 'content', meta.title)
  set('meta[property="og:description"]', 'content', meta.description)
  set('meta[name="twitter:title"]', 'content', meta.title)
  set('meta[name="twitter:description"]', 'content', meta.description)
  const ld = document.head.querySelector('script[type="application/ld+json"]')
  if (ld) ld.textContent = JSON.stringify(structuredData(meta))
}
