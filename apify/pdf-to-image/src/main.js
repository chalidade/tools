import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { renderPdf, zipPages } from './render.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one PDF URL to "files".')
}

const EVENT = 'pdf-page-rendered'
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const format = input.format ?? 'jpg'

await runBatch({
  urls,
  // One event per page: the first page is charged with the dataset row, the rest below.
  eventName: EVENT,
  maxMb: input.maxFileSizeMb ?? 100,
  concurrency: 2,
  async process({ name, index, bytes, store }) {
    if (bytes.toString('latin1', 0, 1024).indexOf('%PDF-') < 0) throw new Error('Not a PDF file.')
    const { totalPages, pages } = await renderPdf(bytes, {
      format,
      dpi: input.dpi ?? 150,
      quality: input.quality ?? 85,
      pages: input.pages,
      maxPages: input.maxPages ?? 500,
      maxSide: input.maxSide,
      gray: input.grayscale ?? false,
      password: input.password,
    })
    if (!pages.length) throw new Error('No page could be rendered.')
    const extra = pages.length - 1
    if (extra > 0) {
      try {
        await Actor.charge({ eventName: EVENT, count: extra })
      } catch (e) {
        log.debug(`charge skipped: ${e.message}`)
      }
    }
    const stem = name.replace(/\.pdf$/i, '') || `file-${index + 1}`
    const images = []
    for (const p of pages) {
      const key = storeKey(index, `${stem}-p${p.page}.${p.ext}`)
      await store.setValue(key, p.bytes, { contentType: MIME[p.ext] })
      images.push({ page: p.page, downloadUrl: store.getPublicUrl(key), width: p.width, height: p.height, size: p.bytes.length })
    }
    let zipUrl
    if ((input.zip ?? true) && pages.length > 1) {
      const key = storeKey(index, `${stem}-pages.zip`)
      await store.setValue(key, await zipPages(pages, stem), { contentType: 'application/zip' })
      zipUrl = store.getPublicUrl(key)
    }
    return {
      pages: pages.length,
      totalPages,
      format,
      firstPage: images[0].downloadUrl,
      zipUrl,
      images,
    }
  },
})

log.info('Page images are in the key-value store; links are in the dataset.')
await Actor.exit()
