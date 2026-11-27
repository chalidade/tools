import { Actor, log } from 'apify'
import os from 'node:os'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { vectorize } from './vectorize.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one image URL to "files".')
}

const hex = (v) => (/^#?[0-9a-f]{6}$/i.test(v ?? '') ? `#${v.replace('#', '').toLowerCase()}` : undefined)
const memoryMb = Number(process.env.ACTOR_MEMORY_MBYTES || 1024)

await runBatch({
  urls,
  eventName: 'image-vectorized',
  maxMb: input.maxFileSizeMb ?? 30,
  concurrency: Math.max(1, Math.min(os.cpus().length, Math.floor(memoryMb / 512), 6)),
  async process({ name, index, bytes, store }) {
    const r = await vectorize(bytes, {
      mode: input.mode ?? 'color',
      detail: input.colorDetail ?? 5,
      merge: input.layerDifference ?? 16,
      speckle: input.filterSpeckle ?? 4,
      shape: input.curveMode ?? 'spline',
      corner: input.cornerThreshold ?? 60,
      threshold: input.threshold ?? 128,
      invert: input.invert ?? false,
      color: hex(input.color),
      background: hex(input.background),
      maxSize: input.maxSize ?? 2000,
      timeoutMs: (input.timeoutSecs ?? 120) * 1000,
    })
    const key = storeKey(index, name.replace(/\.[^.]+$/, '') + '.svg')
    const svg = Buffer.from(r.svg)
    await store.setValue(key, svg, { contentType: 'image/svg+xml' })
    return {
      downloadUrl: store.getPublicUrl(key),
      key,
      preview: store.getPublicUrl(key),
      inputFormat: r.inputFormat,
      width: r.width,
      height: r.height,
      shapes: r.shapes,
      sizeBefore: bytes.length,
      sizeAfter: svg.length,
    }
  },
})

log.info('SVG files are in the key-value store; links are in the dataset.')
await Actor.exit()
