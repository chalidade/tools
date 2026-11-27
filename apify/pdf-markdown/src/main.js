import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { readPdfPages, toMarkdown } from './engine.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one PDF URL to "files".')
}

const EVENT = 'pdf-page-converted'
const maxPages = input.maxPages ?? 200

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
      if (e?.constructor?.name === 'LockedPdfError') throw new Error('The PDF is password-protected.')
      throw e
    }
    const { pages, totalPages, title } = read
    const chars = pages.reduce((n, p) => n + p.lines.reduce((m, l) => m + l.pieces.reduce((k, x) => k + x.text.trim().length, 0), 0), 0)
    if (chars < 20) {
      throw new Error('This PDF has no text layer (a scan or photos). Run it through the OCR Actor first.')
    }
    const markdown = toMarkdown(pages, { pageBreaks: input.pageBreaks ?? false })
    const extra = pages.length - 1
    if (extra > 0) {
      try {
        await Actor.charge({ eventName: EVENT, count: extra })
      } catch (e) {
        log.debug(`charge skipped: ${e.message}`)
      }
    }
    const key = storeKey(index, name.replace(/\.pdf$/i, '') + '.md')
    await store.setValue(key, markdown, { contentType: 'text/markdown; charset=utf-8' })
    const row = {
      title,
      pages: pages.length,
      totalPages,
      characters: markdown.length,
      headings: (markdown.match(/^#{1,3} /gm) ?? []).length,
      tables: (markdown.match(/^\|( --- \|)+$/gm) ?? []).length,
      downloadUrl: store.getPublicUrl(key),
      key,
    }
    if (input.includeMarkdown ?? true) row.markdown = markdown
    return row
  },
})

log.info('Markdown files are in the key-value store; links (and the text) are in the dataset.')
await Actor.exit()
