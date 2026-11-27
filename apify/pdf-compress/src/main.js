import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { compressPdf } from './compress.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one PDF URL to "files".')
}

const memoryMb = Number(process.env.ACTOR_MEMORY_MBYTES || 1024)
const maxMb = input.maxFileSizeMb ?? 100

await runBatch({
  urls,
  eventName: 'pdf-compressed',
  maxMb,
  // qpdf holds the whole PDF (as JSON) in memory, roughly 4× its size.
  concurrency: Math.max(1, Math.min(4, Math.floor(memoryMb / 512))),
  async process({ name, index, bytes, store }) {
    if (bytes.subarray(0, 1024).indexOf('%PDF') === -1) throw new Error('Not a PDF file.')
    const r = await compressPdf(bytes, {
      level: input.level,
      maxSide: input.maxImageSide,
      quality: input.jpegQuality,
      password: input.password,
    })
    const key = storeKey(index, name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`)
    await store.setValue(key, Buffer.from(r.output), { contentType: 'application/pdf' })
    return {
      downloadUrl: store.getPublicUrl(key),
      key,
      sizeBefore: r.before,
      sizeAfter: r.after,
      savedPercent: Math.round((1 - r.after / r.before) * 1000) / 10,
      imagesFound: r.imagesFound,
      imagesShrunk: r.imagesShrunk,
      alreadyOptimal: r.unchanged,
    }
  },
})

log.info('Compressed PDFs are in the key-value store; links are in the dataset.')
await Actor.exit()
