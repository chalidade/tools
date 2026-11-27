import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { compressImage } from './compress.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one image URL to "files".')
}

const memoryMb = Number(process.env.ACTOR_MEMORY_MBYTES || 1024)

await runBatch({
  urls,
  eventName: 'image-compressed',
  maxMb: input.maxFileSizeMb ?? 50,
  concurrency: Math.max(2, Math.min(8, Math.floor(memoryMb / 256))),
  async process({ name, index, bytes, store }) {
    const r = await compressImage(bytes, {
      format: input.format ?? 'same',
      quality: input.quality,
      maxWidth: input.maxWidth,
      maxHeight: input.maxHeight,
      targetKb: input.targetSizeKb,
      keepMetadata: input.keepMetadata,
      lossless: input.lossless,
    })
    const key = storeKey(index, name.replace(/\.[^.]+$/, '') + '.' + r.ext)
    await store.setValue(key, r.output, { contentType: r.mime })
    return {
      downloadUrl: store.getPublicUrl(key),
      key,
      inputFormat: r.inputFormat,
      outputFormat: r.outputFormat,
      quality: r.quality,
      width: r.width,
      height: r.height,
      sizeBefore: bytes.length,
      sizeAfter: r.output.length,
      savedPercent: Math.round((1 - r.output.length / bytes.length) * 1000) / 10,
      keptOriginal: r.keptOriginal || undefined,
      targetMet: r.targetMet,
    }
  },
})

log.info('Compressed images are in the key-value store; links are in the dataset.')
await Actor.exit()
