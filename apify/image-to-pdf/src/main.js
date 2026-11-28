import { Actor, log } from 'apify'
import { zipSync } from 'fflate'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { PAPER, buildPdf, prepareImage } from './pdf.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one image URL to "files".')
}

const merge = input.mode !== 'separate'
const layout = {
  pageSize: input.pageSize === 'fit' || PAPER[input.pageSize] ? input.pageSize : 'a4',
  orientation: ['auto', 'portrait', 'landscape'].includes(input.orientation) ? input.orientation : 'auto',
  marginMm: Math.min(50, Math.max(0, input.marginMm ?? 10)),
  fill: input.fit === 'cover',
}
const prep = {
  maxPx: Math.min(10000, Math.max(300, input.maxImagePx ?? 2480)),
  quality: Math.min(100, Math.max(30, input.quality ?? 85)),
  keepTransparency: input.keepTransparency ?? false,
  grayscale: input.grayscale ?? false,
}
const pages = [] // merge mode: prepared images by input index
const separate = {} // separate mode: name → PDF bytes (for the ZIP)

const summary = await runBatch({
  urls,
  eventName: 'image-converted',
  maxMb: input.maxFileSizeMb ?? 50,
  concurrency: 4,
  async process({ name, index, bytes, store }) {
    const im = await prepareImage(bytes, prep)
    const row = { width: im.width, height: im.height }
    if (merge) {
      pages[index] = im
      return row
    }
    const pdf = await buildPdf([im], { ...layout, title: name })
    const key = storeKey(index, name.replace(/\.[a-z0-9]+$/i, '') + '.pdf')
    await store.setValue(key, pdf, { contentType: 'application/pdf' })
    separate[key] = [pdf, { level: 0 }]
    return { ...row, sizeKb: Math.round(pdf.length / 102.4) / 10, pdfUrl: store.getPublicUrl(key) }
  },
})

const store = await Actor.openKeyValueStore()
if (merge) {
  const images = pages.filter(Boolean)
  if (images.length) {
    const name = `${(input.outputName || 'images').replace(/\.pdf$/i, '').replace(/[^\w.-]+/g, '-')}.pdf`
    const pdf = await buildPdf(images, { ...layout, title: input.outputName || null })
    await store.setValue(name, pdf, { contentType: 'application/pdf' })
    summary.pdfUrl = store.getPublicUrl(name)
    summary.pages = images.length
    summary.sizeKb = Math.round(pdf.length / 102.4) / 10
    // A last, free row so the combined PDF's link is in the dataset too.
    await Actor.pushData({ name, combined: true, pages: images.length, sizeKb: summary.sizeKb, pdfUrl: summary.pdfUrl })
    log.info(`One PDF with ${images.length} pages: ${summary.pdfUrl}`)
  }
} else if (Object.keys(separate).length > 1) {
  await store.setValue('pdfs.zip', Buffer.from(zipSync(separate)), { contentType: 'application/zip' })
  summary.zipUrl = store.getPublicUrl('pdfs.zip')
}
await Actor.setValue('SUMMARY', summary)
await Actor.exit()
