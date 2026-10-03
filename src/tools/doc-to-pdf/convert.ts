// Everything here runs in the visitor's browser: the .docx is read from memory,
// rendered to HTML by docx-preview, and turned into a PDF without any upload.
// Heavy libraries are dynamic imports so they load only when used.

const PX_TO_PT = 0.75

/** Renders the document into `body`; returns one <section> per page. */
export async function renderDocx(file: File, body: HTMLElement, style: HTMLElement) {
  const { renderAsync } = await import('docx-preview')
  body.replaceChildren()
  style.replaceChildren()
  await renderAsync(file, body, style, {
    className: 'docx',
    inWrapper: true,
    breakPages: true,
    ignoreLastRenderedPageBreak: false,
    experimental: true,
    // Data URLs rather than blob: URLs, so nothing outlives the render.
    useBase64URL: true,
  })
  return Array.from(body.querySelectorAll<HTMLElement>('section.docx'))
}

/** Page height in CSS px — the section's min-height is the Word page size. */
function pageHeight(section: HTMLElement) {
  return parseFloat(getComputedStyle(section).minHeight) || section.offsetHeight
}

/** Vertical extent of every rendered line of text and every image, in section px. */
function lineBoxes(section: HTMLElement, origin: number) {
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
  const padTop = parseFloat(style.paddingTop) || 0
  const padBottom = parseFloat(style.paddingBottom) || 0
  const usable = pageH - padTop - padBottom
  const end = section.offsetHeight - padBottom

  if (section.offsetHeight <= pageH + 1 || usable <= 0) return null

  const boxes = lineBoxes(section, section.getBoundingClientRect().top)

  const ranges: [number, number][] = []
  let from = padTop
  while (end - from > 1) {
    const limit = Math.min(from + usable, end)
    const to = limit < end ? safeCut(boxes, from, limit) : limit
    ranges.push([from, to])
    from = to
  }
  return { ranges, padTop }
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
      const sy = Math.round(from * ratio)
      const sh = Math.round((to - from) * ratio)
      ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, Math.round(dest * ratio), canvas.width, sh)

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

  return `<!doctype html><html><head><meta charset="utf-8"><title>${document.title}</title>${style.innerHTML}<style>
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
