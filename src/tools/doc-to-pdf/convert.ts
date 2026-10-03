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

/**
 * docx-preview only breaks pages where Word recorded a break, so a section can
 * run taller than one page. Splits its content area into page-sized ranges,
 * cutting between paragraphs/table rows rather than through a line of text.
 */
function contentRanges(section: HTMLElement, pageH: number) {
  const style = getComputedStyle(section)
  const padTop = parseFloat(style.paddingTop) || 0
  const padBottom = parseFloat(style.paddingBottom) || 0
  const usable = pageH - padTop - padBottom
  const end = section.offsetHeight - padBottom

  if (section.offsetHeight <= pageH + 1 || usable <= 0) return null

  const origin = section.getBoundingClientRect().top
  const cuts = Array.from(section.querySelectorAll<HTMLElement>('article > *, article tr'))
    .map((el) => el.getBoundingClientRect().top - origin)
    .sort((a, b) => a - b)

  const ranges: [number, number][] = []
  let from = padTop
  while (end - from > 1) {
    let to = Math.min(from + usable, end)
    if (to < end) {
      const fit = cuts.filter((c) => c > from + 1 && c <= to)
      if (fit.length) to = fit[fit.length - 1]
    }
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
 * Prints the rendered document from an isolated iframe so the browser's own
 * "Save as PDF" produces real, selectable text. Not available in the APK
 * WebView, which has no print dialog.
 */
export async function printDocx(body: HTMLElement, style: HTMLElement, sections: HTMLElement[]) {
  const first = sections[0]
  const size = first ? `${first.offsetWidth}px ${pageHeight(first)}px` : 'auto'

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)

  const doc = frame.contentDocument!
  doc.open()
  doc.write(`<!doctype html><html><head><title>${document.title}</title>${style.innerHTML}<style>
    @page { size: ${size}; margin: 0 }
    html, body { margin: 0; background: #fff }
    .docx-wrapper { background: none !important; padding: 0 !important; display: block !important }
    .docx-wrapper > section.docx { box-shadow: none !important; margin: 0 !important; break-after: page }
    .docx-wrapper > section.docx:last-child { break-after: auto }
  </style></head><body>${body.innerHTML}</body></html>`)
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
