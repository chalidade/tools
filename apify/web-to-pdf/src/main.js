import { Actor, log } from 'apify'
import { chromium } from 'playwright'
import { runItems, slugName } from './items.js'
import { FORMATS, fillTemplate, markdownPage, pdfPageCount, renderPdf } from './render.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}

// Every source becomes { name, url } or { name, html }.
const docs = []
for (const u of input.urls ?? []) {
  const url = typeof u === 'string' ? u : u?.url
  if (url) docs.push({ url: url.trim(), name: slugName(url, 'page') })
}
for (const d of Array.isArray(input.documents) ? input.documents : []) {
  if (!d || typeof d !== 'object') continue
  const name = d.name ? slugName(d.name, 'document') : null
  if (d.url) docs.push({ url: d.url, name: name ?? slugName(d.url, 'page') })
  else if (d.html != null) docs.push({ html: String(d.html), name: name ?? 'document' })
  else if (d.markdown != null) docs.push({ html: markdownPage(d.markdown, { font: input.font, title: d.name }), name: name ?? 'document' })
}
if (input.markdown?.trim()) docs.push({ html: markdownPage(input.markdown, { font: input.font }), name: 'markdown' })
if (input.html?.trim()) docs.push({ html: input.html, name: 'html' })
if (input.template?.trim()) {
  const records = Array.isArray(input.records) ? input.records : []
  if (!records.length) await Actor.fail('"template" needs at least one object in "records" (one PDF per record).')
  records.forEach((r, i) => {
    const name = r?.fileName ?? r?.filename ?? r?.name ?? r?.id
    docs.push({ html: fillTemplate(input.template, r ?? {}), name: slugName(name, `record-${i + 1}`) })
  })
}
if (!docs.length) {
  await Actor.fail('Nothing to convert: add web page URLs, Markdown, HTML, documents, or a template with records.')
}

const opts = {
  format: FORMATS.includes(input.format) ? input.format : 'A4',
  landscape: input.landscape ?? false,
  marginMm: Math.min(50, Math.max(0, input.marginMm ?? 12)),
  printBackground: input.printBackground ?? true,
  scale: Math.min(2, Math.max(0.1, Number(input.scale ?? 1) || 1)),
  pageNumbers: input.pageNumbers ?? false,
  media: input.media === 'screen' ? 'screen' : 'print',
  waitUntil: ['load', 'domcontentloaded', 'networkidle'].includes(input.waitUntil) ? input.waitUntil : 'networkidle',
  waitMs: Math.min(30000, Math.max(0, input.waitMs ?? 0)),
  hideSelectors: (input.hideSelectors ?? []).map((s) => String(s).trim()).filter(Boolean),
  preferCssPageSize: input.preferCssPageSize ?? false,
  timeoutMs: Math.min(180, Math.max(10, input.timeoutSecs ?? 60)) * 1000,
}

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const context = await browser.newContext({
  viewport: { width: input.viewportWidth ?? 1280, height: 900 },
  locale: input.locale || 'en-US',
  userAgent: input.userAgent || undefined,
})

try {
  await runItems({
    items: docs,
    eventName: 'pdf-generated',
    concurrency: 3,
    zipName: docs.length > 1 && (input.zip ?? true) ? 'pdfs.zip' : null,
    async process(doc, { index, store, addFile }) {
      const { pdf, title } = await renderPdf(context, doc, opts)
      const file = `${String(index + 1).padStart(4, '0')}-${doc.name}.pdf`
      await store.setValue(file, pdf, { contentType: 'application/pdf' })
      addFile(file, pdf)
      return {
        source: doc.url ?? 'html',
        name: doc.name,
        title,
        pages: pdfPageCount(pdf),
        sizeKb: Math.round(pdf.length / 102.4) / 10,
        pdfUrl: store.getPublicUrl(file),
      }
    },
  })
} finally {
  await browser.close()
}

log.info('PDFs are in the key-value store; links are in the dataset.')
await Actor.exit()
