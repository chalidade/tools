// HTML / Markdown / web page → PDF with headless Chromium (Playwright).
import { marked } from 'marked'

export const FORMATS = ['A4', 'Letter', 'Legal', 'A3', 'A5', 'Tabloid']

// The same paper look as the site's Markdown to PDF tool (src/tools/markdown-to-pdf/render.ts).
const MD_CSS = `
body{margin:0;color:#111;font-size:15px;line-height:1.55;overflow-wrap:anywhere}
body.sans{font-family:Helvetica,Arial,'Liberation Sans',sans-serif}
body.serif{font-family:Georgia,'Times New Roman','Liberation Serif',serif}
h1,h2,h3,h4,h5,h6{line-height:1.25;margin:1.2em 0 .5em;break-after:avoid}
h1{font-size:2em;border-bottom:1px solid #ddd;padding-bottom:.2em}
h2{font-size:1.5em;border-bottom:1px solid #eee;padding-bottom:.15em}
h3{font-size:1.25em}h4{font-size:1.05em}h5,h6{font-size:.95em}
body>:first-child{margin-top:0}
p,ul,ol,blockquote,pre,table{margin:0 0 .9em}
ul,ol{padding-left:1.6em}
li>ul,li>ol{margin:.2em 0}
a{color:#0563c1}
code{font-family:Consolas,'Courier New','Liberation Mono',monospace;font-size:.88em;background:#f1f1f1;padding:.1em .3em;border-radius:3px}
pre{background:#f5f5f5;padding:.7em .9em;border-radius:5px;white-space:pre-wrap;break-inside:avoid}
pre code{background:none;padding:0}
blockquote{border-left:4px solid #bbb;padding:.1em 1em;color:#444}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #bbb;padding:.35em .6em;text-align:left}
th{background:#eee}
tr{break-inside:avoid}
hr{border:0;border-top:1px solid #bbb;margin:1.2em 0}
img{max-width:100%;height:auto}
del{opacity:.7}
input[type=checkbox]{margin-right:.4em}
`

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function markdownPage(source, { font = 'sans', title = '' } = {}) {
  const body = marked.parse(String(source), { gfm: true, async: false })
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${MD_CSS}</style></head><body class="${font === 'serif' ? 'serif' : 'sans'}">${body}</body></html>`
}

/** {{field}} is HTML-escaped, {{{field}}} is inserted as-is; dotted paths reach nested values. */
export function fillTemplate(template, record) {
  const get = (path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), record)
  return String(template)
    .replace(/\{\{\{\s*([\w.-]+)\s*\}\}\}/g, (_, k) => String(get(k) ?? ''))
    .replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => escapeHtml(get(k) ?? ''))
}

/** Counts pages in a PDF Chromium wrote (one /Type /Page object per page). */
export const pdfPageCount = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page(?![a-z])/g) ?? []).length

const FOOTER = `<div style="width:100%;font-size:9px;color:#666;font-family:Helvetica,Arial,sans-serif;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`

export async function renderPdf(context, doc, o) {
  const page = await context.newPage()
  try {
    page.setDefaultTimeout(o.timeoutMs)
    if (doc.url) {
      const res = await page.goto(doc.url, { waitUntil: o.waitUntil, timeout: o.timeoutMs })
      if (res && res.status() >= 400) throw new Error(`The page answered HTTP ${res.status()}.`)
    } else {
      await page.setContent(doc.html, { waitUntil: o.waitUntil, timeout: o.timeoutMs })
    }
    if (o.hideSelectors.length) {
      await page.addStyleTag({ content: `${o.hideSelectors.join(',')}{display:none!important}` })
    }
    if (o.waitMs) await page.waitForTimeout(o.waitMs)
    await page.emulateMedia({ media: o.media })
    const title = (await page.title().catch(() => '')) || null
    const m = `${o.marginMm}mm`
    const pdf = await page.pdf({
      format: o.format,
      landscape: o.landscape,
      printBackground: o.printBackground,
      scale: o.scale,
      margin: { top: m, right: m, bottom: o.pageNumbers ? `${Math.max(o.marginMm, 12)}mm` : m, left: m },
      displayHeaderFooter: o.pageNumbers,
      headerTemplate: '<span></span>',
      footerTemplate: o.pageNumbers ? FOOTER : '<span></span>',
      preferCSSPageSize: o.preferCssPageSize,
      outline: true,
      tagged: true,
    })
    return { pdf, title }
  } finally {
    await page.close().catch(() => {})
  }
}
