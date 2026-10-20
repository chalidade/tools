// What a search engine reads about each page: its title, description, the
// short "about" text under a tool, related links and structured data. The app
// renders these (ToolView, App) and scripts/seo.mjs writes the same text into
// each page's static HTML at build time, so the page a crawler fetches and the
// page a visitor sees say the same thing.

import type { Lang } from '@/lib/i18n'
import { TOOLS, categoryText, toolText, type Tool } from '@/tools/registry'

export const SITE = 'https://chalidade.github.io/tools/'

/** Categories whose tools take the visitor's own files. */
const FILE_CATEGORIES = new Set(['to-pdf', 'from-pdf', 'pdf', 'media'])
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
        title: 'Tools — Free tools that run in your browser',
        description: `${TOOLS.length} free tools for PDFs, documents, images, video, audio, music and developer data — all running on your device. No account, nothing uploaded.`,
        slug: '',
        lang,
      }
    : {
        title: 'Tools — Kumpulan tools gratis, langsung di browser',
        description: `${TOOLS.length} tools gratis untuk PDF, dokumen, gambar, video, audio, musik, sampai data developer — semuanya berjalan di perangkatmu. Tanpa akun, tanpa upload.`,
        slug: '',
        lang,
      }
}

export function toolMeta(tool: Tool, lang: Lang): PageMeta {
  const text = toolText(tool, lang)
  const files = takesFiles(tool)
  const online = /online/i.test(text.title) ? '' : ' Online'
  const title =
    lang === 'en'
      ? `${text.title}${online} — Free${files ? ', No Upload' : ''} | Tools`
      : `${text.title}${online} Gratis${files ? ', Tanpa Upload' : ''} — Tools`
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
    en ? 'Open source (MIT) on GitHub.' : 'Kode sumbernya terbuka (MIT) di GitHub.',
  ]
}

/** Other tools in the same category, for the "related" links. */
export function relatedTools(tool: Tool, max = 6): Tool[] {
  return TOOLS.filter((t) => t.category === tool.category && t.slug !== tool.slug).slice(0, max)
}

export function relatedHeading(tool: Tool, lang: Lang) {
  const cat = categoryText(tool.category, lang).title
  return lang === 'en' ? `More in ${cat}` : `Tools lain di ${cat}`
}

/** schema.org data for the page, as a JSON-LD object. */
export function structuredData(meta: PageMeta) {
  const url = absoluteUrl(meta.slug, meta.lang)
  if (!meta.slug)
    return { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Tools', url, inLanguage: meta.lang, description: meta.description }
  const tool = TOOLS.find((t) => t.slug === meta.slug)!
  return {
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
    isPartOf: { '@type': 'WebSite', name: 'Tools', url: SITE },
  }
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
