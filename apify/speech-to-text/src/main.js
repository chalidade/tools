import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { startedMinutes } from './ffmpeg.js'
import { decodeAudio, loadWhisper, transcribe } from './transcribe.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one audio or video URL to "files".')
}

// One event per started minute of audio; the first is charged with the
// dataset row, the rest just before it.
const EVENT = 'audio-minute'
const formats = new Set(input.outputFormats?.length ? input.outputFormats : ['txt', 'srt'])
await loadWhisper()

await runBatch({
  urls,
  eventName: EVENT,
  maxMb: input.maxFileSizeMb ?? 500,
  // Whisper decodes token by token: one file at a time keeps memory flat.
  concurrency: 1,
  async process({ name, index, bytes, store }) {
    const t0 = Date.now()
    const { samples, duration } = await decodeAudio(bytes, { start: input.trimStart, end: input.trimEnd })
    if (duration < 0.2) throw new Error('The audio is empty.')
    if (input.maxMinutes && duration > input.maxMinutes * 60) throw new Error(`Longer than ${input.maxMinutes} minutes (maxMinutes).`)
    const r = await transcribe(samples, { language: input.language ?? 'auto' })
    const minutes = startedMinutes(duration)
    if (minutes > 1) {
      try {
        await Actor.charge({ eventName: EVENT, count: minutes - 1 })
      } catch (e) {
        log.debug(`charge skipped: ${e.message}`)
      }
    }
    const base = name.replace(/\.[^.]+$/, '')
    const files = {}
    const save = async (ext, body, type) => {
      const key = storeKey(index, `${base}.${ext}`)
      await store.setValue(key, body, { contentType: `${type}; charset=utf-8` })
      files[ext] = store.getPublicUrl(key)
    }
    if (formats.has('txt')) await save('txt', r.text + '\n', 'text/plain')
    if (formats.has('srt')) await save('srt', r.srt, 'application/x-subrip')
    if (formats.has('vtt')) await save('vtt', r.vtt, 'text/vtt')
    if (formats.has('json')) await save('json', JSON.stringify({ language: r.language, duration, segments: r.segments }, null, 2), 'application/json')
    log.info(`${name}: ${duration.toFixed(1)} s of audio in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
    return {
      language: r.language,
      duration: Math.round(duration * 10) / 10,
      minutes,
      text: r.text,
      ...(input.includeSegments === false ? {} : { segments: r.segments }),
      txtUrl: files.txt,
      srtUrl: files.srt,
      vttUrl: files.vtt,
      jsonUrl: files.json,
    }
  },
})

await Actor.exit()
