import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { upscaleImage } from './upscale.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one image URL to "files".')
}

const scale = String(input.scale) === "2" ? 2 : 4

await runBatch({
  urls,
  eventName: 'image-upscaled',
  maxMb: input.maxFileSizeMb ?? 30,
  // The model already uses every core; one image at a time is fastest overall.
  concurrency: 1,
  async process({ name, index, bytes, store }) {
    const started = Date.now()
    const r = await upscaleImage(bytes, { scale, format: input.format, quality: input.quality })
    const key = storeKey(index, `${name.replace(/\.[^.]+$/, '')}-${scale}x.${r.ext}`)
    await store.setValue(key, r.output, { contentType: r.mime })
    return {
      downloadUrl: store.getPublicUrl(key),
      key,
      scale,
      inputFormat: r.inputFormat,
      outputFormat: r.ext,
      widthBefore: r.widthBefore,
      heightBefore: r.heightBefore,
      width: r.width,
      height: r.height,
      sizeAfter: r.output.length,
      seconds: Math.round((Date.now() - started) / 100) / 10,
    }
  },
})

log.info('Upscaled images are in the key-value store; links are in the dataset.')
await Actor.exit()
