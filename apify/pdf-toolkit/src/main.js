import { Actor, log } from 'apify'
import { zipSync } from 'fflate'
import { download, fileName, fileUrls, runBatch, storeKey } from './batch.js'
import { deletePages, extractPages, mergePdfs, pageCount, PdfError, rotatePages, splitPdf, unlockPdf } from './pdf.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
const operation = input.operation ?? 'merge'
if (!urls.length) {
  await Actor.fail('Add at least one PDF URL to "files".')
}

const EVENT = 'pdf-processed'
const maxMb = input.maxFileSizeMb ?? 100
const password = input.password || undefined
const isPdf = (b) => b.toString('latin1', 0, 1024).includes('%PDF-')
const stemOf = (name) => name.replace(/\.pdf$/i, '') || 'document'

if (operation === 'merge') {
  // All files become one PDF: one dataset row, one event per input file.
  if (urls.length < 2) await Actor.fail('Merging needs at least two PDF URLs.')
  let budget = Infinity
  try {
    budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(EVENT)
  } catch {}
  if (budget < urls.length) {
    await Actor.fail(`Merging ${urls.length} files costs ${urls.length} events, but this run's max charge allows ${budget}. Raise "Max cost per run".`)
  }
  const store = await Actor.openKeyValueStore()
  const files = []
  for (const [i, url] of urls.entries()) {
    const name = fileName(url, `file-${i + 1}.pdf`)
    try {
      const { bytes } = await download(url, maxMb)
      if (!isPdf(bytes)) throw new Error('Not a PDF file.')
      files.push({ bytes, name })
      log.info(`↓ ${name}`)
    } catch (e) {
      await Actor.pushData({ url, name, error: e.message })
      await Actor.fail(`Could not merge: ${name}: ${e.message}`)
    }
  }
  let merged
  try {
    merged = await mergePdfs(files, password)
  } catch (e) {
    await Actor.pushData({ name: 'merged.pdf', error: e.message })
    await Actor.fail(`Could not merge: ${e.message}`)
  }
  const outName = (input.outputName || 'merged').replace(/\.pdf$/i, '') + '.pdf'
  const key = storeKey(0, outName)
  await store.setValue(key, Buffer.from(merged), { contentType: 'application/pdf' })
  const pages = await pageCount(merged)
  if (files.length > 1) {
    try {
      await Actor.charge({ eventName: EVENT, count: files.length - 1 })
    } catch (e) {
      log.debug(`charge skipped: ${e.message}`)
    }
  }
  await Actor.pushData(
    {
      name: outName,
      operation,
      downloadUrl: store.getPublicUrl(key),
      key,
      inputFiles: files.length,
      pages,
      sizeBefore: files.reduce((n, f) => n + f.bytes.length, 0),
      sizeAfter: merged.length,
      sources: urls,
    },
    EVENT,
  )
  await Actor.setValue('SUMMARY', { total: urls.length, ok: urls.length, failed: 0, merged: true })
  log.info(`Merged ${files.length} PDFs into ${outName} (${pages} pages).`)
  await Actor.exit()
}

const OPS = {
  split: async (bytes) => splitPdf(bytes, { every: input.splitEvery ?? 1, ranges: input.splitRanges, password }),
  extract: async (bytes) => [{ bytes: await extractPages(bytes, input.pages, password) }],
  delete: async (bytes) => [{ bytes: await deletePages(bytes, input.pages, password) }],
  rotate: async (bytes) => [{ bytes: await rotatePages(bytes, Number(input.rotation ?? 90), input.pages, password) }],
  unlock: async (bytes) => [{ bytes: await unlockPdf(bytes, password) }],
}
if (!OPS[operation]) await Actor.fail(`Unknown operation "${operation}".`)

await runBatch({
  urls,
  eventName: EVENT,
  maxMb,
  concurrency: 3,
  async process({ name, index, bytes, store }) {
    if (!isPdf(bytes)) throw new Error('Not a PDF file.')
    let parts
    try {
      parts = await OPS[operation](bytes)
    } catch (e) {
      if (e instanceof PdfError) throw new Error(e.message)
      throw e
    }
    const stem = stemOf(name)
    if (parts.length === 1 && operation !== 'split') {
      const out = Buffer.from(parts[0].bytes)
      const key = storeKey(index, `${stem}.pdf`)
      await store.setValue(key, out, { contentType: 'application/pdf' })
      return {
        operation,
        downloadUrl: store.getPublicUrl(key),
        key,
        pages: await pageCount(out),
        sizeBefore: bytes.length,
        sizeAfter: out.length,
      }
    }
    const files = []
    const zip = {}
    for (const p of parts) {
      const n = `${stem}-${p.label}.pdf`
      const key = storeKey(index, n)
      const out = Buffer.from(p.bytes)
      await store.setValue(key, out, { contentType: 'application/pdf' })
      files.push({ name: n, pages: p.label, downloadUrl: store.getPublicUrl(key), size: out.length })
      zip[n] = [p.bytes, { level: 0 }]
    }
    const zipKey = storeKey(index, `${stem}-split.zip`)
    await store.setValue(zipKey, Buffer.from(zipSync(zip)), { contentType: 'application/zip' })
    return {
      operation,
      downloadUrl: store.getPublicUrl(zipKey),
      key: zipKey,
      parts: files.length,
      sizeBefore: bytes.length,
      files,
    }
  },
})

log.info('Result PDFs are in the key-value store; links are in the dataset.')
await Actor.exit()
