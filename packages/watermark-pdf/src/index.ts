// The headless API. The source lives with the site (src/tools/watermark-pdf/),
// so the tool on chalidade.github.io/tools and this package are the same code.
// Heavy libraries (pdf-lib, pdf.js, qpdf…) load on first use, not on import.
//
//   import { watermarkPdf } from '@chalidade/watermark-pdf'
//   const blob = await watermarkPdf(file, { kind: 'text', text: 'CONFIDENTIAL', … }, () => {})

export { isPdfFile, LockedPdfError } from '@/lib/pdf-doc'
export {
  layoutWatermark,
  measureText,
  readWatermarkImage,
  watermarkPdf,
  type Layout,
  type Stamp,
  type WatermarkColor,
  type WatermarkImage,
  type WatermarkLayout,
  type WatermarkOptions,
  type WatermarkSize,
} from '@/tools/watermark-pdf/watermark'
