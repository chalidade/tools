// The headless API. The source lives with the site (src/tools/pdf-to-ppt/),
// so the tool on chalidade.github.io/tools and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { buildPptx, readPdfPages } from '@chalidade/pdf-to-ppt'
//   const pptx = await buildPptx(await readPdfPages(file, () => {}), 'editable')

export { buildPptx, LockedPdfError, readPdfPages, type SlideMode, type SlidePage, type TextBox } from '@/tools/pdf-to-ppt/convert'
