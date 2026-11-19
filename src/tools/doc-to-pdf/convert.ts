// Everything here runs in the visitor's browser: the .docx is read from memory,
// rendered to HTML by docx-preview, and turned into a PDF without any upload.
// Heavy libraries are dynamic imports so they load only when used.

import { EXTEND_CSS, pageHeight, patchParser, placeFloating, type Placement } from './docx-extend'
import { fixPictures } from './metafile'

const PX_TO_PT = 0.75

/** docx-preview's parser class is internal; an empty package hands us an instance to patch. */
let patching: Promise<void> | null = null
function patchDocxPreview(parseAsync: typeof import('docx-preview').parseAsync) {
  return (patching ??= (async () => {
    try {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>')
      const empty = (await parseAsync(await zip.generateAsync({ type: 'blob' }))) as unknown as { _parser?: object }
      if (empty._parser) patchParser(Object.getPrototypeOf(empty._parser))
    } catch {
      // Unpatched, docx-preview still renders everything it did before.
    }
  })())
}

/** Renders the document into `body`; returns one <section> per page. */
export async function renderDocx(file: File, body: HTMLElement, style: HTMLElement) {
  const { parseAsync, renderDocument } = await import('docx-preview')
  await patchDocxPreview(parseAsync)
  const options = {
    className: 'docx',
    inWrapper: true,
    breakPages: true,
    ignoreLastRenderedPageBreak: false,
    experimental: true,
    // Data URLs rather than blob: URLs, so nothing outlives the render.
    useBase64URL: true,
    // A .docx can embed an "altChunk" HTML part that docx-preview would drop
    // into an un-sandboxed <iframe srcdoc>, running its script in our origin.
    // We only ever show the document's own text, so never render those.
    renderAltChunks: false,
  }
  // Rendered detached and cleaned before it touches the page, so nothing in
  // the file can make the browser fetch a URL, even for a moment.
  const doc = await parseAsync(file, options)
  const nodes = await renderDocument(doc, options)
  blockRemote(nodes)
  const extra = document.createElement('style')
  extra.textContent = EXTEND_CSS
  nodes.push(extra)

  // Floating pictures are placed by measuring the laid-out page, and `body`
  // may still be hidden, so lay the document out off-screen first. Positions
  // are relative to each page, so they hold once it moves into `body`.
  const stage = document.createElement('div')
  stage.setAttribute('aria-hidden', 'true')
  stage.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none'
  for (const n of nodes) stage.appendChild(n)
  document.body.appendChild(stage)
  try {
    await fixPictures(stage)
    await document.fonts?.ready
    const list = (doc as unknown as { _parser?: { toowlPlacements?: Placement[] } })._parser?.toowlPlacements ?? []
    if (list.length) placeFloating(stage, list)
  } finally {
    stage.remove()
  }

  body.replaceChildren()
  style.replaceChildren()
  for (const n of Array.from(stage.childNodes)) (n.nodeName === 'STYLE' ? style : body).appendChild(n)
  neutralizeLinks(body)
  return Array.from(body.querySelectorAll<HTMLElement>('section.docx'))
}

/**
 * docx-preview writes names from the file (style ids, font names, list text)
 * into CSS unescaped. A crafted file can therefore add `url(https://…)` rules
 * that report who opened it, or a `</style>` that turns into live markup when
 * the print copy re-parses the HTML. The browser's own CSS parser reads every
 * rule (so escapes like `\75rl(` can't hide a URL), anything that would load
 * a non-embedded resource is dropped, and the rest is written back out.
 */
const loadsRemote = (value: string) => /image-set\(/i.test(value) || /url\((?!\s*["']?data:)/i.test(value)

function cleanDeclarations(style: CSSStyleDeclaration) {
  for (const prop of Array.from(style)) if (loadsRemote(style.getPropertyValue(prop))) style.removeProperty(prop)
}

/**
 * Word bullets are often a private-use character drawn in the Symbol or
 * Wingdings font (U+F0B7 is "•" in Symbol). Phones and Linux have neither
 * font, so the bullet vanished. Swap in the real Unicode character, which any
 * font can draw.
 */
const SYMBOL_BULLETS: Record<string, string> = {
  '\uf0b7': '•', '\uf0a7': '▪', '\uf0d8': '➢', '\uf0fc': '✓', '\uf076': '❖',
  '\uf071': '❑', '\uf06e': '■', '\uf06c': '●', '\uf0a8': '◆', '\uf0e0': '➔', '\uf0f0': '⇨',
}

function plainBullets(style: CSSStyleDeclaration) {
  const content = style.getPropertyValue('content')
  if (!/[\uf000-\uf0ff]/.test(content)) return
  style.setProperty('content', content.replace(/[\uf000-\uf0ff]/g, (c) => SYMBOL_BULLETS[c] ?? '•'))
  if (/symbol|wingdings|webdings/i.test(style.getPropertyValue('font-family'))) style.removeProperty('font-family')
}

function cleanCss(css: string) {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css) // ignores @import
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if ('style' in rule) {
        cleanDeclarations((rule as CSSStyleRule).style)
        plainBullets((rule as CSSStyleRule).style)
      }
      if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules)
    }
  }
  walk(sheet.cssRules)
  // "<" only appears inside CSS strings here; the escape keeps it out of the HTML parser's sight.
  return Array.from(sheet.cssRules, (r) => r.cssText).join('\n').replace(/</g, '\\3c ')
}

function blockRemote(nodes: Node[]) {
  for (const node of nodes) {
    if (!(node instanceof Element)) continue
    for (const el of [node, ...node.querySelectorAll('*')]) {
      if (el.localName === 'style') el.textContent = cleanCss(el.textContent ?? '')
      if (el instanceof HTMLElement || el instanceof SVGElement) cleanDeclarations(el.style)
      if (el.localName === 'a') continue // a link loads nothing until clicked; neutralizeLinks handles it
      for (const name of ['src', 'srcset', 'href', 'xlink:href', 'poster', 'data']) {
        const v = el.getAttribute(name)?.trim()
        if (v && !/^(data:|#)/i.test(v)) el.removeAttribute(name)
      }
    }
  }
}

/**
 * docx-preview copies hyperlink targets from the file verbatim, so a crafted
 * document can carry a `javascript:` (or `data:`) link that runs on click.
 * Keep only http(s)/mailto/anchors; turn anything else into inert text.
 */
function neutralizeLinks(root: HTMLElement) {
  for (const a of root.querySelectorAll('a[href]')) {
    const href = (a.getAttribute('href') ?? '').trim()
    if (!/^(https?:|mailto:|#)/i.test(href)) {
      a.removeAttribute('href')
    } else {
      a.setAttribute('rel', 'noopener noreferrer nofollow')
      a.setAttribute('target', '_blank')
    }
  }
}

/** Vertical extent of every rendered line of text and every image, in section px. */
function lineBoxes(section: HTMLElement, origin: number, limitH: number) {
  const boxes: [number, number][] = []
  const range = document.createRange()
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue
    range.selectNodeContents(node)
    // One rect per line the text node wraps onto.
    for (const r of range.getClientRects()) {
      if (r.height > 0) boxes.push([r.top - origin, r.bottom - origin])
    }
  }
  for (const el of section.querySelectorAll('img, svg, canvas')) {
    const r = el.getBoundingClientRect()
    // A floating picture as tall as the page (a page background behind the
    // text) leaves no gap to cut in, so it would force a cut through text.
    if (el.closest('.toowl-abs') && r.height >= limitH) continue
    if (r.height > 0) boxes.push([r.top - origin, r.bottom - origin])
  }
  return boxes
}

// Lines whose boxes overlap by less than this still count as separate, so a
// tight line-height does not drag the cut up through a whole paragraph.
const OVERLAP_TOLERANCE = 1.5

/** The lowest y in (floor, limit] that does not pass through a line or image. */
function safeCut(boxes: [number, number][], floor: number, limit: number) {
  let y = limit
  for (let moved = true; moved && y > floor; ) {
    moved = false
    for (const [top, bottom] of boxes) {
      if (top < y - OVERLAP_TOLERANCE && bottom > y + OVERLAP_TOLERANCE) {
        y = top
        moved = true
      }
    }
  }
  // Nothing fits (e.g. one image taller than a page): cut hard at the limit.
  return y > floor + 1 ? y : limit
}

/**
 * docx-preview only breaks pages where Word recorded a break, so a section can
 * run taller than one page. Splits its content area into page-sized ranges,
 * cutting in the gap between two lines of text — never through one, even when
 * the whole document sits inside a single layout table.
 */
function contentRanges(section: HTMLElement, pageH: number) {
  const style = getComputedStyle(section)
  const header = section.querySelector<HTMLElement>(':scope > header')
  const footer = section.querySelector<HTMLElement>(':scope > footer')
  // Later pages repeat the header and footer, so their text starts below the
  // header and stops above the footer, even when those outgrow the margins.
  const padTop = Math.max(parseFloat(style.paddingTop) || 0, header ? header.offsetTop + header.offsetHeight : 0)
  const footerTop = footer ? footer.offsetTop : section.offsetHeight
  const padBottom = Math.max(parseFloat(style.paddingBottom) || 0, section.offsetHeight - footerTop)
  const usable = pageH - padTop - padBottom
  const end = Math.min(section.offsetHeight - (parseFloat(style.paddingBottom) || 0), footerTop)

  if (section.offsetHeight <= pageH + 1 || usable <= 0) return null

  const boxes = lineBoxes(section, section.getBoundingClientRect().top, usable)

  const ranges: [number, number][] = []
  let from = header ? header.offsetTop + header.offsetHeight : padTop
  while (end - from > 1) {
    const limit = Math.min(from + usable, end)
    const to = limit < end ? safeCut(boxes, from, limit) : limit
    ranges.push([from, to])
    from = to
  }
  return { ranges, padTop, header, footer }
}

/**
 * Snapshots each rendered page and saves a PDF. The result is an image per
 * page: faithful to the preview, but its text cannot be selected —
 * `printDocx` covers that case.
 */
export async function downloadPdf(
  sections: HTMLElement[],
  fileName: string,
  onProgress: (done: number, total: number) => void,
) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ])

  let pdf: InstanceType<typeof jsPDF> | null = null

  for (const [i, section] of sections.entries()) {
    const width = section.offsetWidth
    const pageH = pageHeight(section)

    const canvas = await html2canvas(section, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      // Snapshot without the preview's drop shadow.
      onclone: (_doc, el) => {
        el.style.boxShadow = 'none'
      },
    })
    const ratio = canvas.width / width

    // [source top, source bottom, destination top] in CSS px.
    const split = contentRanges(section, pageH)
    const slices: [number, number, number][] = split
      ? // The first page keeps its top margin (and any Word header) as rendered.
        split.ranges.map(([from, to], k) => (k === 0 ? [0, to, 0] : [from, to, split.padTop]))
      : [[0, Math.min(section.offsetHeight, pageH), 0]]

    for (const [from, to, dest] of slices) {
      const page = document.createElement('canvas')
      page.width = canvas.width
      page.height = Math.round(pageH * ratio)
      const ctx = page.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, page.width, page.height)
      const copy = (top: number, bottom: number, at: number) => {
        const sh = Math.round((bottom - top) * ratio)
        if (sh > 0) ctx.drawImage(canvas, 0, Math.round(top * ratio), canvas.width, sh, 0, Math.round(at * ratio), canvas.width, sh)
      }
      copy(from, to, dest)
      if (split) {
        // A section that runs over several pages has one Word header and
        // footer, rendered once at its top and bottom: repeat them on every
        // page, as Word does, so their pictures and text are not lost.
        const { header, footer } = split
        if (header && from > 0) copy(header.offsetTop, header.offsetTop + header.offsetHeight, header.offsetTop)
        if (footer) copy(footer.offsetTop, footer.offsetTop + footer.offsetHeight, pageH - (section.offsetHeight - footer.offsetTop))
      }

      const format: [number, number] = [width * PX_TO_PT, pageH * PX_TO_PT]
      const orientation = format[0] > format[1] ? 'landscape' : 'portrait'
      if (!pdf) pdf = new jsPDF({ unit: 'pt', format, orientation, compress: true })
      else pdf.addPage(format, orientation)
      pdf.addImage(page.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, format[0], format[1])
    }

    onProgress(i + 1, sections.length)
  }

  pdf?.save(fileName)
}

/**
 * The standalone document `printDocx` prints. Word margins move from each
 * section's padding onto `@page`, so the browser repeats them on every printed
 * page — including the pages a long section spills onto — without relying on
 * `box-decoration-break` support. docx-preview's on-screen section layout
 * (flex + overflow:hidden) is undone for print so nothing can clip a line at
 * the page edge.
 */
export function buildPrintHtml(body: HTMLElement, style: HTMLElement, sections: HTMLElement[]) {
  const first = sections[0]
  const css = first ? getComputedStyle(first) : null
  const size = first ? `${first.offsetWidth}px ${pageHeight(first)}px` : 'auto'
  const margin = css ? `${css.paddingTop} 0 ${css.paddingBottom} 0` : '0'

  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:"><title>${document.title.replace(/[<>&]/g, '')}</title>${style.innerHTML}<style>
    @page { size: ${size}; margin: ${margin} }
    html, body { margin: 0; background: #fff }
    .docx-wrapper { background: none !important; padding: 0 !important; display: block !important }
    .docx-wrapper > section.docx {
      display: block !important; overflow: visible !important; min-height: 0 !important;
      padding-top: 0 !important; padding-bottom: 0 !important;
      box-shadow: none !important; margin: 0 !important; break-after: page;
    }
    .docx-wrapper > section.docx:last-child { break-after: auto }
    /* Headers/footers sit in the page margin on screen; in print they flow
       with the content instead of being pulled into the @page margin. */
    .docx-wrapper > section.docx > header,
    .docx-wrapper > section.docx > footer { margin: 0 !important; min-height: 0 !important }
    .docx-wrapper p { orphans: 2; widows: 2 }
    .docx-wrapper tr, .docx-wrapper img { break-inside: avoid }
    /* Floating pictures and frames are placed against the screen page, whose
       top margin is padding; here that margin moves to @page. */
    .docx-wrapper .toowl-abs { translate: 0 calc(-1 * var(--toowl-pad, 0px)) }
    .docx-wrapper > section.docx.toowl-one-page { height: var(--toowl-body) !important; overflow: clip !important }
  </style></head><body>${body.innerHTML}</body></html>`
}

/**
 * Prints the rendered document from an isolated iframe so the browser's own
 * "Save as PDF" produces real, selectable text. Not available in the APK
 * WebView, which has no print dialog.
 */
export async function printDocx(body: HTMLElement, style: HTMLElement, sections: HTMLElement[]) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  // Scripts can never run in the print copy, whatever the file managed to slip into its HTML.
  frame.setAttribute('sandbox', 'allow-same-origin allow-modals')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)

  const doc = frame.contentDocument!
  doc.open()
  doc.write(buildPrintHtml(body, style, sections))
  doc.close()

  await doc.fonts?.ready
  await Promise.all(
    Array.from(doc.images).map((img) =>
      img.complete
        ? null
        : new Promise((r) => {
            img.addEventListener('load', r, { once: true })
            img.addEventListener('error', r, { once: true })
          }),
    ),
  )

  frame.contentWindow!.focus()
  frame.contentWindow!.print()
  // print() blocks until the dialog closes in most browsers; clean up after.
  setTimeout(() => frame.remove(), 1000)
}
