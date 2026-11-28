import { Actor, log } from 'apify'
import { zipSync } from 'fflate'
import { download, fileUrls, runBatch, storeKey } from './batch.js'
import { POSITIONS } from './layout.js'
import { logoMark, textMark, watermark } from './mark.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) await Actor.fail('Add at least one image URL to "files".')

const text = String(input.text ?? '').trim()
if (!text && !input.logoUrl) await Actor.fail('Give a watermark: "text" (e.g. © My Shop) or "logoUrl" (a PNG with transparency works best).')

let mark
try {
  if (input.logoUrl) {
    const { bytes } = await download(input.logoUrl, 20)
    mark = await logoMark(bytes)
  } else {
    const color = /^#[0-9a-f]{3,8}$/i.test(input.color ?? '') || ['white', 'black'].includes(input.color) ? input.color : 'white'
    mark = await textMark(text, color)
  }
} catch (e) {
  await Actor.fail(`Could not prepare the watermark: ${e.message}`)
}

const position = POSITIONS.includes(input.position) ? input.position : 'br'
const opts = {
  position,
  margin: Math.min(30, Math.max(0, input.marginPercent ?? 3)),
  spacing: Math.min(400, Math.max(0, input.spacingPercent ?? 80)),
  angle: Math.min(90, Math.max(-90, input.angle ?? -30)),
  size: Math.min(100, Math.max(1, input.sizePercent ?? (position === 'tile' ? 22 : 25))),
  opacity: Math.min(100, Math.max(1, input.opacity ?? 60)),
  maxSide: Math.max(0, input.maxSide ?? 0),
  format: ['auto', 'jpg', 'png', 'webp'].includes(input.format) ? input.format : 'auto',
  quality: Math.min(100, Math.max(30, input.quality ?? 88)),
  keepMetadata: input.keepMetadata ?? false,
}

const zip = {}
const summary = await runBatch({
  urls,
  eventName: 'image-watermarked',
  maxMb: input.maxFileSizeMb ?? 50,
  concurrency: 4,
  async process({ name, index, bytes, store }) {
    const out = await watermark(bytes, mark, opts)
    const key = storeKey(index, name.replace(/\.[a-z0-9]+$/i, '') + '.' + out.format)
    await store.setValue(key, out.data, { contentType: out.format === 'jpg' ? 'image/jpeg' : `image/${out.format}` })
    if (input.zip ?? true) zip[key] = [out.data, { level: 0 }]
    return {
      width: out.width,
      height: out.height,
      format: out.format,
      sizeKb: Math.round(out.data.length / 102.4) / 10,
      imageUrl: store.getPublicUrl(key),
    }
  },
})

if (Object.keys(zip).length > 1) {
  const store = await Actor.openKeyValueStore()
  await store.setValue('watermarked.zip', Buffer.from(zipSync(zip)), { contentType: 'application/zip' })
  summary.zipUrl = store.getPublicUrl('watermarked.zip')
  await Actor.setValue('SUMMARY', summary)
  log.info(`All images in one ZIP: ${summary.zipUrl}`)
}
await Actor.exit()
