// The headless API. The source lives with the site (src/tools/pdf-to-markdown/),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { readPdfText, toMarkdown } from '@chalidade/pdf-to-markdown'
//   const pages = await readPdfText(file, (done, total) => {})
//   const md = toMarkdown(pages, { pageBreaks: true })

export { LockedPdfError, readPdfText, ScannedPdfError, toMarkdown } from '@/tools/pdf-to-markdown/convert'
export type { PageText, TextLine, TextPiece } from '@/lib/pdf-text'
