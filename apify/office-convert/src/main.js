import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { convertDocument, MIME } from './convert.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one document URL to "files".')
}

const memoryMb = Number(process.env.ACTOR_MEMORY_MBYTES || 2048)

await runBatch({
  urls,
  eventName: 'document-converted',
  maxMb: input.maxFileSizeMb ?? 100,
  // About 1 GB per LibreOffice process is comfortable for big workbooks.
  concurrency: Math.max(1, Math.min(4, Math.floor(memoryMb / 1024))),
  async process({ name, index, bytes, store }) {
    const r = await convertDocument(bytes, name, {
      output: input.outputFormat ?? 'pdf',
      pdfA: input.pdfA ?? false,
      onePagePerSheet: input.onePagePerSheet ?? false,
      includeNotes: input.includeNotes ?? false,
      imageQuality: input.imageQuality,
      timeoutMs: (input.timeoutSecs ?? 180) * 1000,
    })
    const files = []
    for (const [i, o] of r.outputs.entries()) {
      const key = storeKey(index, r.outputs.length > 1 ? `${i + 1}-${o.name}` : o.name)
      await store.setValue(key, o.bytes, { contentType: MIME[o.ext] })
      files.push({ name: o.name, key, downloadUrl: store.getPublicUrl(key), size: o.bytes.length })
    }
    return {
      downloadUrl: files[0].downloadUrl,
      key: files[0].key,
      inputFormat: r.inputFormat,
      outputFormat: r.outputs[0].ext,
      pages: r.pages ?? undefined,
      sizeBefore: bytes.length,
      sizeAfter: files.reduce((n, f) => n + f.size, 0),
      files: files.length > 1 ? files : undefined,
    }
  },
})

log.info('Converted files are in the key-value store; links are in the dataset.')
await Actor.exit()
