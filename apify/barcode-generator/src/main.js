import { Actor } from 'apify'
import { itemList, runItems, slugName } from './items.js'
import { autoType, cleanError, options, toPng, toSvg, TYPES } from './barcode.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const items = itemList(input.codes)
if (!items.length) await Actor.fail('Add at least one value to "codes".')

const HEX = /^#[0-9a-f]{6}$/i
const fg = (input.foreground ?? '#000000').trim()
const bgIn = (input.background ?? '#ffffff').trim()
if (!HEX.test(fg) || (!input.transparent && !HEX.test(bgIn))) await Actor.fail('Colours must be 6-digit hex values like #000000.')
const type = input.type ?? 'auto'
if (type !== 'auto' && !TYPES[type]) await Actor.fail(`Unknown barcode type "${type}".`)
const format = input.format ?? 'png'
const base = {
  scale: Math.min(10, Math.max(1, input.scale ?? 3)),
  height: Math.min(100, Math.max(5, input.heightMm ?? 15)),
  includeText: input.includeText ?? true,
  fg,
  bg: input.transparent ? null : bgIn,
  padding: Math.min(50, Math.max(0, input.padding ?? 10)),
}

const used = new Set()
await runItems({
  items,
  eventName: 'barcode-generated',
  concurrency: 8,
  zipName: input.zip === false || items.length < 2 ? null : 'barcodes.zip',
  async process(item, { index, store, addFile }) {
    const text = (typeof item === 'string' ? item : String(item.text ?? item.code ?? item.value ?? '')).trim()
    if (!text) throw new Error('Empty item.')
    const itemType = (typeof item === 'object' && item.type) || type
    const t = itemType === 'auto' ? autoType(text) : itemType
    let stem = slugName(typeof item === 'object' && item.name ? item.name : text, `barcode-${index + 1}`)
    if (used.has(stem)) stem = `${stem}-${index + 1}`
    used.add(stem)

    let opts
    let png
    let svg
    try {
      opts = options(text, { ...base, type: t })
      if (format === 'png' || format === 'both') png = await toPng(opts)
      if (format === 'svg' || format === 'both') svg = toSvg(opts)
    } catch (e) {
      throw new Error(cleanError(e))
    }
    const row = { input: item, text, type: t, name: stem }
    const key = (ext) => `${String(index + 1).padStart(4, '0')}-${stem}.${ext}`
    if (png) {
      await store.setValue(key('png'), png, { contentType: 'image/png' })
      addFile(`${stem}.png`, png)
      row.pngUrl = store.getPublicUrl(key('png'))
    }
    if (svg) {
      await store.setValue(key('svg'), svg, { contentType: 'image/svg+xml' })
      addFile(`${stem}.svg`, Buffer.from(svg))
      row.svgUrl = store.getPublicUrl(key('svg'))
    }
    return row
  },
})

await Actor.exit()
