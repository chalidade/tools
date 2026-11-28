import { Actor } from 'apify'
import { download } from './batch.js'
import { itemList, runItems, slugName } from './items.js'
import sharp from 'sharp'
import { inpaint, loadModel, maskFromBoxes, maskFromImage } from './inpaint.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const items = itemList(input.images)
if (!items.length) await Actor.fail('Add at least one image to "images": { "imageUrl", and "maskUrl" or "boxes" }.')

const MAX_SIDE = 6000
const format = ['jpg', 'png', 'webp'].includes(input.format) ? input.format : 'auto'
await loadModel()

await runItems({
  items,
  eventName: 'object-removed',
  concurrency: 2,
  zipName: input.zip === false || items.length < 2 ? null : 'images.zip',
  async process(item, { index, store, addFile }) {
    const imageUrl = typeof item === 'string' ? item : item.imageUrl ?? item.url
    if (!imageUrl) throw new Error('Missing "imageUrl".')
    const boxes = (typeof item === 'object' && item.boxes) || input.boxes
    const maskUrl = (typeof item === 'object' && item.maskUrl) || input.maskUrl
    if (!maskUrl && !boxes?.length) throw new Error('Give a "maskUrl" (white = remove) or "boxes" for each image.')

    const { bytes } = await download(imageUrl, input.maxFileSizeMb ?? 30)
    const img = sharp(bytes, { failOn: 'none' }).rotate()
    const meta = await img.metadata()
    let pipeline = img
    if (Math.max(meta.width, meta.height) > MAX_SIDE) pipeline = pipeline.resize(MAX_SIDE, MAX_SIDE, { fit: 'inside' })
    const { data, info } = await pipeline.removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
    const W = info.width
    const H = info.height

    let mask
    if (maskUrl) mask = await maskFromImage((await download(maskUrl, 30)).bytes, W, H)
    else {
      const unit = (typeof item === 'object' && item.boxUnit) || input.boxUnit || 'px'
      // Pixel boxes are in the original photo's size; scale them if it was shrunk.
      const k = unit === 'px' ? W / (meta.orientation >= 5 ? meta.height : meta.width) : 1
      mask = maskFromBoxes(boxes.map((b) => (k === 1 ? b : { x: b.x * k, y: b.y * k, width: (b.width ?? b.w) * k, height: (b.height ?? b.h) * k })), W, H, unit)
    }
    let marked = 0
    for (const v of mask) marked += v
    if (!marked) throw new Error('The mask is empty: nothing to remove.')
    if (marked > W * H * 0.6) throw new Error('The mask covers more than 60% of the photo; mark only the objects to remove.')

    const areas = await inpaint(data, W, H, mask)
    const ext = format !== 'auto' ? format : meta.format === 'png' || meta.format === 'webp' ? meta.format : 'jpg'
    const raw = sharp(data, { raw: { width: W, height: H, channels: 3 } })
    const out = await (ext === 'png' ? raw.png() : ext === 'webp' ? raw.webp({ quality: 92 }) : raw.jpeg({ quality: 92, mozjpeg: true })).toBuffer()
    const stem = slugName((typeof item === 'object' && item.name) || imageUrl.split('/').pop()?.replace(/\.[^.]+$/, ''), `image-${index + 1}`)
    const key = `${String(index + 1).padStart(4, '0')}-${stem}.${ext}`
    await store.setValue(key, out, { contentType: ext === 'jpg' ? 'image/jpeg' : `image/${ext}` })
    addFile(`${String(index + 1).padStart(4, '0')}-${stem}.${ext}`, out)
    return { imageUrl, name: stem, width: W, height: H, areas, maskedPercent: Math.round((marked / (W * H)) * 1000) / 10, downloadUrl: store.getPublicUrl(key) }
  },
})

await Actor.exit()
