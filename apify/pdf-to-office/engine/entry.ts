// Entry for the bundled engine (src/engine.js): the site's own PDF → Word and
// PDF → Excel converters, plus a Node loader for pdf.js. Built by build-engine.mjs.
export { buildDocx, paragraphsFromPages } from '@/tools/pdf-to-word/convert'
export { assemble, buildXlsx } from '@/tools/pdf-to-excel/convert'
export { readPdfPages } from './pdf-node'
