// The headless API. The source lives with the site (src/tools/pdf-to-image/),
// so the tool on chalidade.github.io/tools and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { exportImages } from '@chalidade/pdf-to-image'
//   const { blob, fileName } = await exportImages(file, [1, 2], { dpi: 150, format: 'png', baseName: 'report' }, () => {})

export { exportImages, LockedPdfError, openPdf, type ImageFormat, type PdfPages } from '@/tools/pdf-to-image/convert'
