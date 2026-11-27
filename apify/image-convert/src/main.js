import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { convertImage } from './convert.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one image URL to "files".')
}

const format = input.format ?? 'webp'
const memoryMb = Number(process.env.ACTOR_MEMORY_MBYTES || 1024)

await runBatch({
  urls,
  eventName: 'image-converted',
  maxMb: input.maxFileSizeMb ?? 50,
  concurrency: Math.max(2, Math.min(8, Math.floor(memoryMb / 256))),
  async process({ name, index, bytes, store }) {
    const r = await convertImage(bytes, {
      format,
      quality: input.quality,
      width: input.width,
      height: input.height,
      fit: input.fit,
      withoutEnlargement: !input.allowUpscale,
      background: input.background,
      keepMetadata: input.keepMetadata,
      lossless: input.lossless,
    })
    const key = storeKey(index, name.replace(/\.[^.]+$/, '') + '.' + r.ext)
    await store.setValue(key, r.output, { contentType: r.mime })
    return {
      downloadUrl: store.getPublicUrl(key),
      key,
      inputFormat: r.inputFormat,
      outputFormat: format,
      width: r.width,
      height: r.height,
      frames: r.frames,
      sizeBefore: bytes.length,
      sizeAfter: r.output.length,
      savedPercent: Math.round((1 - r.output.length / bytes.length) * 1000) / 10,
    }
  },
})

log.info('Converted images are in the key-value store; links are in the dataset.')
await Actor.exit()
