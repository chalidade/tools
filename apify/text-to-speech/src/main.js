import { Actor } from 'apify'
import { itemList, runItems, slugName } from './items.js'
import { encode, FORMATS } from './encode.js'
import { espeakHasVoice, PRESETS, speak } from './speak.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const items = itemList(input.texts)
if (!items.length) await Actor.fail('Add at least one text to "texts".')

const MAX_CHARS = 100_000
// One event per started 1,000 characters of text; the first is charged with
// the dataset row, the rest just before it.
const EVENT = 'characters-1k'
const format = FORMATS[input.format] ? input.format : 'mp3'
const kbps = Math.min(320, Math.max(32, input.bitrate ?? 128))

function voiceFor(id, espeakVoice) {
  if (espeakVoice) return { id: 'espeak', engine: 'espeak', espeak: espeakVoice }
  const v = PRESETS[id ?? 'en-neural']
  if (!v) throw new Error(`Unknown voice "${id}". Use one of: ${Object.keys(PRESETS).join(', ')}, or set "espeakVoice".`)
  return v
}

const base = voiceFor(input.voice, input.espeakVoice?.trim())
if (base.engine === 'espeak' && !(await espeakHasVoice(base.espeak))) await Actor.fail(`eSpeak has no voice "${base.espeak}".`)

const used = new Set()
await runItems({
  items,
  eventName: EVENT,
  concurrency: 2,
  zipName: input.zip === false || items.length < 2 ? null : `speech-${format}.zip`,
  async process(item, { index, store, addFile }) {
    const text = (typeof item === 'string' ? item : String(item.text ?? '')).trim()
    if (!text) throw new Error('Empty text.')
    if (text.length > MAX_CHARS) throw new Error(`Text is longer than ${MAX_CHARS.toLocaleString('en')} characters; split it.`)
    const voice = typeof item === 'object' && (item.voice || item.espeakVoice) ? voiceFor(item.voice, item.espeakVoice) : base
    const { samples, rate } = await speak(text, voice, {
      speed: Math.min(2, Math.max(0.5, Number(input.speed ?? 1) || 1)),
      pitch: Math.min(99, Math.max(0, input.pitch ?? 50)),
    })
    const audio = await encode(samples, rate, format, kbps)
    const units = Math.max(1, Math.ceil(text.length / 1000))
    if (units > 1) {
      try {
        await Actor.charge({ eventName: EVENT, count: units - 1 })
      } catch {
        // not a pay-per-event run
      }
    }
    let stem = slugName(typeof item === 'object' && item.name ? item.name : text.slice(0, 40), `speech-${index + 1}`)
    if (used.has(stem)) stem = `${stem}-${index + 1}`
    used.add(stem)
    const key = `${String(index + 1).padStart(4, '0')}-${stem}.${audio.ext}`
    await store.setValue(key, audio.output, { contentType: audio.mime })
    addFile(`${stem}.${audio.ext}`, audio.output)
    return {
      name: stem,
      voice: voice.id,
      characters: text.length,
      duration: Math.round((samples.length / rate) * 10) / 10,
      format,
      downloadUrl: store.getPublicUrl(key),
      size: audio.output.length,
      text: text.length > 300 ? text.slice(0, 300) + '…' : text,
    }
  },
})

await Actor.exit()
