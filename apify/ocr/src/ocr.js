// OCR with Tesseract (tesseract.js 7, wasm, Apache-2.0) — the engine behind
// toowl.my.id/tools/ocr/. Language data comes from the @tesseract.js-data
// packages in node_modules (best_int models), never from a CDN. Scanned PDFs
// are rendered page by page with pdf.js; pages that already have a text layer
// can be read directly instead of OCR'd.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { createWorker, OEM, PSM } from 'tesseract.js'

const require = createRequire(import.meta.url)

export const LANGUAGES = ['eng', 'ind', 'spa', 'fra', 'deu', 'por', 'ita', 'nld']

// tesseract.js reads every language from one folder (langPath), so the
// packages' files are gathered into a temp folder first.
const LANG_DIR = path.join(os.tmpdir(), 'toowl-tessdata')
function langPath(codes) {
  mkdirSync(LANG_DIR, { recursive: true })
  for (const code of codes) {
    const to = path.join(LANG_DIR, `${code}.traineddata.gz`)
    if (existsSync(to)) continue
    const dir = path.dirname(require.resolve(`@tesseract.js-data/${code}/package.json`))
    copyFileSync(path.join(dir, '4.0.0_best_int', `${code}.traineddata.gz`), to)
  }
  return LANG_DIR
}

const workers = new Map()
/** One worker per language set, reused across files. */
export function getWorker(langs) {
  const key = langs.join('+')
  if (!workers.has(key)) {
    workers.set(
      key,
      createWorker(langs, OEM.LSTM_ONLY, { langPath: langPath(langs), cacheMethod: 'none', gzip: true }).catch((e) => {
        workers.delete(key)
        throw e
      }),
    )
  }
  return workers.get(key)
}

export async function closeWorkers() {
  for (const w of workers.values()) await (await w).terminate().catch(() => {})
  workers.clear()
}

const isPdf = (bytes) => bytes.length > 4 && bytes.toString('latin1', 0, 5) === '%PDF-'

/** Image → PNG Tesseract reads well: upright, flattened, at least ~1500 px on the long side for small images. */
async function prepareImage(bytes) {
  const img = sharp(bytes, { failOn: 'none', limitInputPixels: 268_402_689 }).rotate()
  const meta = await img.metadata()
  if (meta.format === 'heif' && meta.compression !== 'av1') {
    throw new Error('HEIC/HEIF photos are not supported here: convert them to JPG first (e.g. with the Image Converter Actor).')
  }
  const long = Math.max(meta.width ?? 0, meta.height ?? 0)
  let s = img.flatten({ background: '#ffffff' })
  // Tiny text OCRs badly: enlarge small images (screenshots, crops) 2×.
  if (long && long < 1000) s = s.resize({ width: (meta.width ?? 0) * 2, kernel: 'lanczos3' })
  // Very large photos slow Tesseract down without helping it.
  else if (long > 5000) s = s.resize({ width: 5000, height: 5000, fit: 'inside' })
  return s.png().toBuffer()
}

async function recognize(worker, png, psm) {
  await worker.setParameters({ tessedit_pageseg_mode: psm ?? PSM.AUTO, preserve_interword_spaces: '1' })
  const { data } = await worker.recognize(png, {}, { text: true, blocks: false, hocr: false, tsv: false })
  return { text: data.text.replace(/\n{3,}/g, '\n\n').trim(), confidence: Math.round(data.confidence) }
}

/** pdf.js text layer of one page as plain lines (for PDFs that are not scans). */
async function pageText(page) {
  const content = await page.getTextContent()
  let out = ''
  let lastY = null
  for (const item of content.items) {
    if (!('str' in item)) continue
    const y = item.transform[5]
    if (lastY !== null && Math.abs(y - lastY) > 2 && !out.endsWith('\n')) out += '\n'
    out += item.str
    if (item.hasEOL) out += '\n'
    lastY = y
  }
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * @param {Buffer} bytes  image or PDF
 * @param {{ languages: string[], psm?: number, dpi?: number, maxPages?: number, useTextLayer?: boolean, onPage?: () => void }} o
 * @returns {Promise<{ kind: 'image'|'pdf', text: string, confidence: number|null, pages: { page: number, text: string, confidence: number|null, source: 'ocr'|'text-layer' }[] }>}
 */
export async function ocrFile(bytes, o) {
  const worker = await getWorker(o.languages)
  if (!isPdf(bytes)) {
    const r = await recognize(worker, await prepareImage(bytes), o.psm)
    return { kind: 'image', text: r.text, confidence: r.confidence, pages: [{ page: 1, ...r, source: 'ocr' }] }
  }

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, verbosity: 0 })
  let pdf
  try {
    pdf = await task.promise
  } catch (e) {
    await task.destroy()
    if (e?.name === 'PasswordException') throw new Error('The PDF is password-protected.')
    throw e
  }
  const pages = []
  try {
    const count = Math.min(pdf.numPages, o.maxPages ?? 200)
    const scale = (o.dpi ?? 200) / 72
    for (let n = 1; n <= count; n++) {
      const page = await pdf.getPage(n)
      if (o.useTextLayer !== false) {
        const text = await pageText(page)
        // A real text layer, not a few stray characters over a scan.
        if (text.replace(/\s/g, '').length >= 40) {
          pages.push({ page: n, text, confidence: null, source: 'text-layer' })
          page.cleanup()
          continue
        }
      }
      let viewport = page.getViewport({ scale })
      // Keep each page under ~25 MP.
      const px = viewport.width * viewport.height
      if (px > 25e6) viewport = page.getViewport({ scale: scale * Math.sqrt(25e6 / px) })
      const { canvas, context } = pdf.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height))
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvas, canvasContext: context, viewport, intent: 'print' }).promise
      const png = canvas.toBuffer('image/png')
      pdf.canvasFactory.destroy({ canvas, context })
      page.cleanup()
      const r = await recognize(worker, png, o.psm)
      pages.push({ page: n, ...r, source: 'ocr' })
      o.onPage?.()
    }
    const ocred = pages.filter((p) => p.confidence !== null)
    const confidence = ocred.length ? Math.round(ocred.reduce((s, p) => s + p.confidence, 0) / ocred.length) : null
    return { kind: 'pdf', text: pages.map((p) => p.text).join('\n\n'), confidence, pages, totalPages: pdf.numPages }
  } finally {
    await task.destroy()
  }
}
