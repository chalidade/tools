import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { removeBackground } from './segment.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one image URL to "files".')
}

await runBatch({
  urls,
  eventName: 'background-removed',
  maxMb: input.maxFileSizeMb ?? 30,
  // The model already uses every core for one image.
  concurrency: 1,
  async process({ name, index, bytes, store }) {
    const t0 = Date.now()
    const r = await removeBackground(bytes, {
      output: input.output ?? 'cutout',
      format: input.format ?? 'png',
      background: input.background,
      quality: input.quality,
      crop: input.cropToSubject,
      padding: input.padding,
      hardEdges: input.hardEdges,
      maxWidth: input.maxWidth,
    })
    const key = storeKey(index, name.replace(/\.[^.]+$/, '') + (input.output === 'mask' ? '-mask.' : '-nobg.') + r.ext)
    await store.setValue(key, r.output, { contentType: r.mime })
    return {
      downloadUrl: store.getPublicUrl(key),
      key,
      width: r.width,
      height: r.height,
      subjectPercent: r.subjectPercent,
      sizeAfter: r.output.length,
      seconds: Math.round((Date.now() - t0) / 100) / 10,
    }
  },
})

log.info('Cut-outs are in the key-value store; links are in the dataset.')
await Actor.exit()
