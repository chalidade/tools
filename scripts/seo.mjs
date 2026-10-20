// scripts/seo.mjs — runs after `vite build`. Writes one real page per tool and
// language, so search engines can list each tool on its own and a visitor who
// clicks a result lands straight in that tool:
//
//   dist/index.html, dist/en/index.html               home (id, en)
//   dist/<slug>/index.html, dist/en/<slug>/index.html each tool (id, en)
//   dist/404.html                                     unknown paths load the app
//   dist/sitemap.xml                                  every page, with hreflang
//
// Each page is the built index.html with its own title, description,
// canonical, hreflang, Open Graph and JSON-LD, plus the page's text as static
// HTML inside #root (React replaces it on load). The text comes from
// src/lib/seo.ts — the same module the app renders — loaded through Vite so
// the TypeScript registry is read as-is.
//
//   node scripts/seo.mjs [--base=/tools/]   (base must match `vite build --base`)

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createServer } from 'vite'

const base = process.argv.find((a) => a.startsWith('--base='))?.slice(7) ?? '/'
const DIST = 'dist'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
})
const seo = await vite.ssrLoadModule('/src/lib/seo.ts')
const { TOOLS, CATEGORIES, toolText, categoryText } = await vite.ssrLoadModule('/src/tools/registry.ts')
await vite.close()

const template = readFileSync(join(DIST, 'index.html'), 'utf8')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const href = (slug, lang) => `${base}${lang === 'en' ? 'en/' : ''}${slug ? `${slug}/` : ''}`

/** Replaces one attribute of the single tag that matches `tag`; fails loudly if the template changed. */
function setAttr(html, tag, attr, value) {
  const re = new RegExp(`(<${tag}[^>]*?\\s${attr}=")[^"]*(")`)
  if (!re.test(html)) throw new Error(`seo.mjs: no <${tag} …${attr}> in dist/index.html`)
  return html.replace(re, `$1${esc(value)}$2`)
}

function page(meta, body, { noindex = false } = {}) {
  const url = seo.absoluteUrl(meta.slug, meta.lang)
  let html = template.replace(/<html lang="[^"]*"/, `<html lang="${meta.lang}"`)
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
  html = setAttr(html, 'meta name="description"', 'content', meta.description)
  html = setAttr(html, 'meta property="og:url"', 'content', url)
  html = setAttr(html, 'meta property="og:title"', 'content', meta.title)
  html = setAttr(html, 'meta property="og:description"', 'content', meta.description)
  html = setAttr(html, 'meta property="og:locale"', 'content', meta.lang === 'en' ? 'en_US' : 'id_ID')
  html = setAttr(html, 'meta name="twitter:title"', 'content', meta.title)
  html = setAttr(html, 'meta name="twitter:description"', 'content', meta.description)
  html = setAttr(html, 'link rel="canonical"', 'href', url)
  html = setAttr(html, 'link rel="alternate" hreflang="id"', 'href', seo.absoluteUrl(meta.slug, 'id'))
  html = setAttr(html, 'link rel="alternate" hreflang="en"', 'href', seo.absoluteUrl(meta.slug, 'en'))
  html = setAttr(html, 'link rel="alternate" hreflang="x-default"', 'href', seo.absoluteUrl(meta.slug, 'id'))
  const ld = JSON.stringify(seo.structuredData(meta)).replace(/</g, '\\u003c')
  html = html.replace(/<script type="application\/ld\+json">[^<]*<\/script>/, `<script type="application/ld+json">${ld}</script>`)
  if (noindex) html = html.replace('</title>', '</title>\n    <meta name="robots" content="noindex" />')
  if (!html.includes('<div id="root"></div>')) throw new Error('seo.mjs: no empty #root in dist/index.html')
  return html.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

function write(path, html) {
  mkdirSync(dirname(join(DIST, path)), { recursive: true })
  writeFileSync(join(DIST, path), html)
}

const MAIN = 'mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14'
const LINK = 'text-muted-foreground hover:text-foreground'

function homeBody(lang) {
  const meta = seo.homeMeta(lang)
  const sections = CATEGORIES.map((c) => {
    const items = TOOLS.filter((t) => t.category === c.id)
      .map((t) => {
        const text = toolText(t, lang)
        return `<li><a class="${LINK}" href="${href(t.slug, lang)}">${esc(text.title)}</a> — ${esc(text.description)}</li>`
      })
      .join('')
    return `<h2 class="mt-8 text-lg font-semibold">${esc(categoryText(c.id, lang).title)}</h2><ul class="mt-3 space-y-1.5 text-sm">${items}</ul>`
  }).join('')
  return `<main class="${MAIN}"><h1 class="text-3xl font-semibold tracking-tight">${esc(meta.title)}</h1><p class="mt-3 text-muted-foreground">${esc(meta.description)}</p>${sections}</main>`
}

function toolBody(tool, lang) {
  const text = toolText(tool, lang)
  const en = lang === 'en'
  const points = seo.aboutPoints(tool, lang).map((p) => `<li>${esc(p)}</li>`).join('')
  const related = seo
    .relatedTools(tool)
    .map((t) => `<li><a class="${LINK}" href="${href(t.slug, lang)}">${esc(toolText(t, lang).title)}</a></li>`)
    .join('')
  return `<main class="${MAIN}">
<a class="text-sm ${LINK}" href="${href('', lang)}">← ${en ? 'All tools' : 'Semua tools'}</a>
<h1 class="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">${esc(text.title)}</h1>
<p class="mt-1 text-muted-foreground">${esc(text.description)}</p>
<p class="mt-3 font-mono text-xs text-muted-foreground">${esc(text.formats)}</p>
<h2 class="mt-10 text-lg font-semibold">${en ? 'Why it is safe to use' : 'Kenapa aman dipakai'}</h2>
<ul class="mt-3 space-y-1.5 text-sm text-muted-foreground">${points}</ul>
${related ? `<h2 class="mt-8 text-lg font-semibold">${esc(seo.relatedHeading(tool, lang))}</h2><ul class="mt-3 space-y-1.5 text-sm">${related}</ul>` : ''}
</main>`
}

const urls = []
for (const lang of ['id', 'en']) {
  write(lang === 'en' ? 'en/index.html' : 'index.html', page(seo.homeMeta(lang), homeBody(lang)))
  for (const tool of TOOLS) write(`${lang === 'en' ? 'en/' : ''}${tool.slug}/index.html`, page(seo.toolMeta(tool, lang), toolBody(tool, lang)))
}
write('404.html', page(seo.homeMeta('id'), homeBody('id'), { noindex: true }))

for (const slug of ['', ...TOOLS.map((t) => t.slug)]) {
  const alt = ['id', 'en']
    .map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${seo.absoluteUrl(slug, l)}"/>`)
    .concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${seo.absoluteUrl(slug, 'id')}"/>`)
    .join('')
  for (const lang of ['id', 'en']) urls.push(`<url><loc>${seo.absoluteUrl(slug, lang)}</loc>${alt}</url>`)
}
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
)
console.log(`seo: ${urls.length} pages (${TOOLS.length} tools × 2 languages + 2 homes), sitemap.xml, 404.html — base ${base}`)
