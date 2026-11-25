// Markdown → sanitized HTML laid out as a paper page, ready for the Word-to-PDF
// engine (doc-to-pdf/convert.ts): downloadPdf snapshots each `section.docx`,
// printDocx prints it for a text PDF. Remote images are dropped — the file
// never makes the browser fetch anything.

export type PageKind = 'a4' | 'letter'
export type FontKind = 'sans' | 'serif'

export interface PageOptions {
  page: PageKind
  marginMm: number
  font: FontKind
  breaks: boolean
}

/** Page size in CSS px (96 dpi). */
export const PAGE_PX: Record<PageKind, [number, number]> = { a4: [794, 1123], letter: [816, 1056] }
const mmToPx = (mm: number) => Math.round((mm * 96) / 25.4)

export async function renderMarkdown(source: string, breaks: boolean): Promise<string> {
  const [{ marked }, { default: DOMPurify }] = await Promise.all([import('marked'), import('dompurify')])
  const raw = marked.parse(source, { gfm: true, breaks, async: false })
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node instanceof HTMLImageElement) {
      const src = node.getAttribute('src') ?? ''
      if (!/^data:image\//i.test(src)) {
        const alt = node.getAttribute('alt')
        const span = document.createElement('em')
        span.textContent = alt ? `[${alt}]` : ''
        node.replaceWith(span)
      }
    } else if (node instanceof HTMLAnchorElement) {
      const href = node.getAttribute('href') ?? ''
      if (!/^(https?:|mailto:|#)/i.test(href)) node.removeAttribute('href')
      else {
        node.setAttribute('rel', 'noopener noreferrer nofollow')
        node.setAttribute('target', '_blank')
      }
    }
  })
  try {
    return DOMPurify.sanitize(raw, { FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'svg', 'math'], FORBID_ATTR: ['style'] })
  } finally {
    DOMPurify.removeHook('afterSanitizeAttributes')
  }
}

/** The page shell (inline size and margins) around already-sanitized HTML. */
export function pageHtml(html: string, o: PageOptions) {
  const [w, h] = PAGE_PX[o.page]
  const m = mmToPx(o.marginMm)
  return `<div class="docx-wrapper"><section class="docx md-page md-${o.font}" style="width:${w}px;min-height:${h}px;padding:${m}px">${html}</section></div>`
}

export const PAGE_CSS = `
.docx-wrapper{background:#e5e7eb;padding:16px;display:flex;flex-direction:column;align-items:center;width:max-content;min-width:100%;box-sizing:border-box}
section.docx.md-page{box-sizing:border-box;background:#fff;color:#111;font-size:15px;line-height:1.55;overflow-wrap:anywhere;box-shadow:0 1px 6px rgba(0,0,0,.25)}
.md-sans{font-family:Helvetica,Arial,sans-serif}
.md-serif{font-family:Georgia,'Times New Roman',serif}
.md-page h1,.md-page h2,.md-page h3,.md-page h4,.md-page h5,.md-page h6{line-height:1.25;margin:1.2em 0 .5em;break-after:avoid}
.md-page h1{font-size:2em;border-bottom:1px solid #ddd;padding-bottom:.2em}
.md-page h2{font-size:1.5em;border-bottom:1px solid #eee;padding-bottom:.15em}
.md-page h3{font-size:1.25em}.md-page h4{font-size:1.05em}.md-page h5,.md-page h6{font-size:.95em}
.md-page>:first-child{margin-top:0}
.md-page p,.md-page ul,.md-page ol,.md-page blockquote,.md-page pre,.md-page table{margin:0 0 .9em}
.md-page ul,.md-page ol{padding-left:1.6em}
.md-page li>ul,.md-page li>ol{margin:.2em 0}
.md-page a{color:#0563c1}
.md-page code{font-family:Consolas,'Courier New',monospace;font-size:.88em;background:#f1f1f1;padding:.1em .3em;border-radius:3px}
.md-page pre{background:#f5f5f5;padding:.7em .9em;border-radius:5px;white-space:pre-wrap;break-inside:avoid}
.md-page pre code{background:none;padding:0}
.md-page blockquote{border-left:4px solid #bbb;padding:.1em 1em;color:#444}
.md-page table{border-collapse:collapse;width:100%}
.md-page th,.md-page td{border:1px solid #bbb;padding:.35em .6em;text-align:left}
.md-page th{background:#eee}
.md-page hr{border:0;border-top:1px solid #bbb;margin:1.2em 0}
.md-page img{max-width:100%;height:auto}
.md-page del{opacity:.7}
.md-page input[type=checkbox]{margin-right:.4em}
`
