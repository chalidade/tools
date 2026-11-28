import { Actor } from 'apify'
import { zipSync } from 'fflate'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { buildSet, HTML_SNIPPET } from './favicon.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) await Actor.fail('Add at least one image URL to "files".')

const HEX = /^#[0-9a-f]{6}$/i
const themeColor = (input.themeColor ?? '#ffffff').trim()
const bg = (input.background ?? '').trim()
if (!HEX.test(themeColor) || (bg && !HEX.test(bg))) await Actor.fail('Colours must be 6-digit hex values like #ffffff.')

const opts = {
  shape: input.shape ?? 'square',
  fit: input.fit ?? 'contain',
  padding: Math.min(40, Math.max(0, input.paddingPercent ?? 0)) / 100,
  background: bg || null,
}

await runBatch({
  urls,
  eventName: 'favicon-set-generated',
  maxMb: input.maxFileSizeMb ?? 20,
  concurrency: 3,
  async process({ name, index, bytes, store }) {
    const stem = name.replace(/\.[^.]+$/, '') || `icon-${index + 1}`
    const appName = (input.appName ?? '').trim() || stem
    let set
    try {
      set = await buildSet(bytes, opts, { appName, themeColor })
    } catch (e) {
      throw new Error(/unsupported image format|Input buffer/i.test(e.message) ? 'Not an image sharp can read (PNG, JPG, WebP, AVIF, GIF, TIFF, SVG).' : e.message)
    }
    const zipKey = storeKey(index, `${stem}-favicons.zip`)
    await store.setValue(zipKey, Buffer.from(zipSync(Object.fromEntries(set.files.map(([n, b]) => [n, [b, { level: 6 }]])))), {
      contentType: 'application/zip',
    })
    const previewKey = storeKey(index, `${stem}-512.png`)
    await store.setValue(previewKey, set.files.find(([n]) => n === 'android-chrome-512x512.png')[1], { contentType: 'image/png' })
    return {
      appName,
      files: set.files.map(([n]) => n),
      previewUrl: store.getPublicUrl(previewKey),
      zipUrl: store.getPublicUrl(zipKey),
      html: HTML_SNIPPET,
      manifest: set.manifest,
    }
  },
})

await Actor.exit()
