import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { assemble, buildDocx, buildXlsx, paragraphsFromPages, readPdfPages } from './engine.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one PDF URL to "files".')
}

const EVENT = 'pdf-page-converted'
const output = ['docx', 'xlsx', 'both'].includes(input.output) ? input.output : 'docx'
const maxPages = input.maxPages ?? 200
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

await runBatch({
  urls,
  // One event per page; the first page is charged with the dataset row, the rest below.
  eventName: EVENT,
  maxMb: input.maxFileSizeMb ?? 50,
  concurrency: 3,
  async process({ name, index, bytes, store }) {
    if (bytes.toString('latin1', 0, 5) !== '%PDF-') throw new Error('Not a PDF file.')
    let read
    try {
      read = await readPdfPages(new Uint8Array(bytes), maxPages)
    } catch (e) {
      if (e?.constructor?.name === 'LockedPdfError') throw new Error('The PDF is password-protected. Unlock it first.')
      throw e
    }
    const { pages, totalPages, title } = read
    const chars = pages.reduce((n, p) => n + p.lines.reduce((m, l) => m + l.pieces.reduce((k, x) => k + x.text.trim().length, 0), 0), 0)
    if (chars < 20) {
      throw new Error('This PDF has no text layer (a scan or photos). Run it through the OCR Actor first.')
    }

    const stem = name.replace(/\.pdf$/i, '')
    const row = { title, pages: pages.length, totalPages }
    if (output !== 'xlsx') {
      const conversion = paragraphsFromPages(pages)
      const blob = await buildDocx(conversion)
      const key = storeKey(index, `${stem}.docx`)
      await store.setValue(key, Buffer.from(await blob.arrayBuffer()), { contentType: DOCX })
      row.paragraphs = conversion.paragraphs.length
      row.docxUrl = store.getPublicUrl(key)
    }
    if (output !== 'docx') {
      const tables = assemble(pages, {
        mode: input.sheets === 'per-page' ? 'per-page' : 'merge',
        convertNumbers: input.convertNumbers ?? true,
      })
      if (!tables.sheets.length) throw new Error('No text or tables found to put in a spreadsheet.')
      const blob = await buildXlsx(tables)
      const key = storeKey(index, `${stem}.xlsx`)
      await store.setValue(key, Buffer.from(await blob.arrayBuffer()), { contentType: XLSX })
      row.tables = tables.tables
      row.sheets = tables.sheets.length
      row.rows = tables.sheets.reduce((n, s) => n + s.rows.length, 0)
      row.xlsxUrl = store.getPublicUrl(key)
    }

    const extra = pages.length - 1
    if (extra > 0) {
      try {
        await Actor.charge({ eventName: EVENT, count: extra })
      } catch (e) {
        log.debug(`charge skipped: ${e.message}`)
      }
    }
    return row
  },
})

log.info('Word / Excel files are in the key-value store; download links are in the dataset.')
await Actor.exit()
