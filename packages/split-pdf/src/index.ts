// The headless API. The source lives with the site (src/tools/split-pdf/),
// so the tool on chalidade.github.io/tools and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { parseRanges, splitPdf } from '@chalidade/split-pdf'
//   const groups = parseRanges('1-2, 3', 3)          // [[1, 2], [3]], or an error message
//   const { blob, fileName } = await splitPdf(file, groups, 'report', () => {})

export { isPdfFile, LockedPdfError } from '@/lib/pdf-doc'
export { chunkPages, parseRanges, splitPdf, type PageGroup } from '@/tools/split-pdf/split'
