import { Actor, log } from 'apify'
import { download } from './batch.js'
import { itemList, runItems, slugName } from './items.js'
import { color, logoDataUrl, qrMatrix, toPng, toSvg } from './qr.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const items = itemList(input.items)
if (!items.length) await Actor.fail('Add at least one text or URL to "items".')

const format = input.format ?? 'png'
const size = Math.min(4096, Math.max(64, input.size ?? 1024))
const style = input.style ?? 'square'
const margin = Math.min(16, Math.max(0, input.margin ?? 4))
const fg = color(input.foreground, '#000000', 'Foreground colour')
const bg = input.transparent ? null : color(input.background, '#ffffff', 'Background colour')

let logo = null
if (input.logoUrl) {
  try {
    logo = await logoDataUrl((await download(input.logoUrl, 10)).bytes)
  } catch (e) {
    await Actor.fail(`Could not use the logo: ${e.message}`)
  }
}
// A logo hides part of the symbol, so it needs the strongest error correction.
const level = input.errorCorrection && input.errorCorrection !== 'auto' ? input.errorCorrection : logo ? 'H' : 'M'
if (logo && level !== 'H') log.warning(`Error correction ${level} with a logo may not scan reliably; "auto" uses H.`)

const used = new Set()
await runItems({
  items,
  eventName: 'qr-generated',
  concurrency: 8,
  zipName: input.zip === false || items.length < 2 ? null : 'qr-codes.zip',
  async process(item, { index, store, addFile }) {
    const text = typeof item === 'string' ? item : String(item.text ?? item.value ?? item.url ?? '')
    if (!text) throw new Error('Empty item: give a text or URL.')
    let stem = slugName(typeof item === 'object' && item.name ? item.name : text, `qr-${index + 1}`)
    if (used.has(stem)) stem = `${stem}-${index + 1}`
    used.add(stem)

    let m
    try {
      m = qrMatrix(text, level, !!logo)
    } catch (e) {
      throw new Error(/too big|amount of data/i.test(e.message) ? `Too much data for one QR code (${text.length} characters).` : e.message)
    }
    const svg = toSvg(m, { fg, bg, margin, style, logo })
    const row = { input: item, text, name: stem, version: m.version, modules: m.size, errorCorrection: level }
    const key = (ext) => `${String(index + 1).padStart(4, '0')}-${stem}.${ext}`.slice(-250)
    if (format === 'svg' || format === 'both') {
      await store.setValue(key('svg'), svg, { contentType: 'image/svg+xml' })
      addFile(`${stem}.svg`, Buffer.from(svg))
      row.svgUrl = store.getPublicUrl(key('svg'))
    }
    if (format === 'png' || format === 'both') {
      const png = await toPng(svg, size)
      await store.setValue(key('png'), png, { contentType: 'image/png' })
      addFile(`${stem}.png`, png)
      row.pngUrl = store.getPublicUrl(key('png'))
    }
    return row
  },
})

await Actor.exit()
