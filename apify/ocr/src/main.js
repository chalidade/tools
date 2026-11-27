import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { closeWorkers, LANGUAGES, ocrFile } from './ocr.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one image or PDF URL to "files".')
}

const languages = (Array.isArray(input.languages) && input.languages.length ? input.languages : ['eng']).filter((l) => LANGUAGES.includes(l))
if (!languages.length) await Actor.fail(`Unknown language. Supported: ${LANGUAGES.join(', ')}.`)

const EVENT = 'page-ocr'

await runBatch({
  urls,
  // One event per image / PDF page; the extra pages of a PDF are charged below.
  eventName: EVENT,
  maxMb: input.maxFileSizeMb ?? 50,
  // Tesseract runs on one core per worker and the worker is shared: one file at a time.
  concurrency: 1,
  async process({ name, index, bytes, store }) {
    const r = await ocrFile(bytes, {
      languages,
      psm: input.pageSegmentation === 'single-block' ? 6 : input.pageSegmentation === 'sparse' ? 11 : 3,
      dpi: input.pdfDpi ?? 200,
      maxPages: input.maxPages ?? 50,
      useTextLayer: input.useTextLayer ?? true,
    })
    const extra = r.pages.length - 1
    if (extra > 0) {
      try {
        await Actor.charge({ eventName: EVENT, count: extra })
      } catch (e) {
        log.debug(`charge skipped: ${e.message}`)
      }
    }
    const row = {
      kind: r.kind,
      pages: r.pages.length,
      totalPages: r.totalPages ?? 1,
      confidence: r.confidence,
      characters: r.text.length,
      text: r.text,
    }
    if (input.saveTextFiles) {
      const key = storeKey(index, name.replace(/\.[^.]+$/, '') + '.txt')
      await store.setValue(key, r.text, { contentType: 'text/plain; charset=utf-8' })
      row.downloadUrl = store.getPublicUrl(key)
    }
    if (r.kind === 'pdf' && input.includePages) row.pageTexts = r.pages
    return row
  },
})

await closeWorkers()
await Actor.exit()
