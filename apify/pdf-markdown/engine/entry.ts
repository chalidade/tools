// Entry for the bundled engine (src/engine.js): the site's own PDF → Markdown
// converter, plus a Node loader for pdf.js. Built by build-engine.mjs.
export { toMarkdown } from '@/tools/pdf-to-markdown/convert'
export { readPdfPages } from './pdf-node'
