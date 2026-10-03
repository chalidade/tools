// Everything here runs in the visitor's browser: the .pptx is unzipped and
// turned into one absolutely-positioned HTML slide per page by
// @jvmr/pptx-to-html, then snapshotted into a PDF. Nothing is uploaded.
// Heavy libraries are dynamic imports so they load only when used.

const PX_TO_PT = 0.75

export interface Deck {
  /** Sanitized HTML, one `div.slide` per slide. */
  slides: string[]
  /** Slide size in CSS pixels (from the presentation's own slide size). */
  width: number
  height: number
}

const BULLETS = ['•', '◦', '▪']

/**
 * The slides use `list-style-position: inside` bullets, which html2canvas does
 * not paint — so the PDF lost every bullet. Write each marker into the text
 * itself (and switch the native one off), so the thumbnail, the image PDF
 * and the print all show the same bullets.
 */
function textListMarkers(html: string) {
  if (!/<li[\s>]/i.test(html)) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const li of doc.querySelectorAll('li')) {
    const list = li.parentElement
    if (!list) continue
    const declared = list.style.listStyleType || li.style.listStyleType
    if (declared === 'none') continue

    let marker: string
    if (list.tagName === 'OL' || /decimal|alpha|roman/.test(declared)) {
      const index = Array.from(list.children).indexOf(li) + (Number(list.getAttribute('start')) || 1)
      marker = /alpha/.test(declared) ? `${String.fromCharCode(96 + index)}.` : `${index}.`
    } else {
      // Nested lists step through • ◦ ▪ like the browser default.
      let depth = 0
      for (let p = list.parentElement?.closest('ul'); p; p = p.parentElement?.closest('ul')) depth++
      marker = declared === 'circle' ? '◦' : declared === 'square' ? '▪' : BULLETS[depth % BULLETS.length]
    }

    li.style.listStyleType = 'none'
    const span = doc.createElement('span')
    span.textContent = `${marker}\u00a0`
    li.insertBefore(span, li.firstChild)
  }
  return doc.body.innerHTML
}

export async function readPptx(file: File): Promise<Deck> {
  const [{ pptxToHtml }, { default: DOMPurify }] = await Promise.all([
    import('@jvmr/pptx-to-html'),
    import('dompurify'),
  ])
  const raw = await pptxToHtml(await file.arrayBuffer())

  const slides = raw.map((html) =>
    DOMPurify.sanitize(
      // The slide background is a z-index:-1 layer; with the slide not being
      // a stacking context it can fall behind the slide's own white fill.
      // Every other layer sits at z-index 20000+, so 0 keeps it at the back.
      textListMarkers(html.replace(/z-index:\s*-1/g, 'z-index:0')),
      // Slide HTML is built from the file's contents: keep layout (inline
      // styles, SVG charts, data: images) but drop anything executable.
      { ADD_ATTR: ['style'], ALLOW_DATA_ATTR: false },
    ),
  )

  const size = slides[0]?.match(/width:\s*([\d.]+)px;\s*height:\s*([\d.]+)px/)
  return {
    slides,
    width: size ? parseFloat(size[1]) : 960,
    height: size ? parseFloat(size[2]) : 540,
  }
}

/** One page per slide, each page exactly the slide's size. Pages are images. */
export async function downloadPdf(
  slides: HTMLElement[],
  deck: Deck,
  onProgress: (done: number, total: number) => void,
): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')])
  const format: [number, number] = [deck.width * PX_TO_PT, deck.height * PX_TO_PT]
  const orientation = format[0] > format[1] ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ unit: 'pt', format, orientation, compress: true })

  for (const [i, slide] of slides.entries()) {
    const canvas = await html2canvas(slide, { scale: 2, backgroundColor: '#ffffff', logging: false })
    if (i > 0) pdf.addPage(format, orientation)
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, format[0], format[1])
    onProgress(i + 1, slides.length)
  }

  return pdf.output('blob')
}

/** The standalone document `printDeck` prints: one slide per page, page = slide size. */
export function buildPrintHtml(deck: Deck, title: string) {
  const safeTitle = title.replace(/[<>&]/g, '')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>
    @page { size: ${deck.width}px ${deck.height}px; margin: 0 }
    html, body { margin: 0; background: #fff }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact }
    .slide { break-after: page }
    .slide:last-child { break-after: auto }
  </style></head><body>${deck.slides.join('')}</body></html>`
}

/**
 * Prints the slides from an isolated iframe so the browser's own "Save as
 * PDF" keeps text selectable. Not available in the APK WebView, which has no
 * print dialog.
 */
export async function printDeck(deck: Deck, title: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)

  const doc = frame.contentDocument!
  doc.open()
  doc.write(buildPrintHtml(deck, title))
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
