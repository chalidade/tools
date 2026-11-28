import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { startedMinutes } from './ffmpeg.js'
import { decodeStereo, encodeStereo, FORMATS, loadModel, splitStems } from './stems.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one song (audio or video URL) to "files".')
}

// One event per started minute of audio; the first is charged with the
// dataset row, the rest just before it.
const EVENT = 'audio-minute'
const mode = input.mode === '4stems' ? '4stems' : 'vocals'
const format = FORMATS[input.format] ? input.format : 'mp3'
const kbps = Math.min(320, Math.max(64, input.bitrate ?? 256))
await loadModel()

await runBatch({
  urls,
  eventName: EVENT,
  maxMb: input.maxFileSizeMb ?? 300,
  // SCNet uses every core for one song.
  concurrency: 1,
  async process({ name, index, bytes, store }) {
    const t0 = Date.now()
    const { left, right, duration } = await decodeStereo(bytes, { start: input.trimStart, end: input.trimEnd })
    if (duration < 1) throw new Error('The audio is shorter than a second.')
    if (duration > (input.maxMinutes ?? 20) * 60) throw new Error(`Longer than ${input.maxMinutes ?? 20} minutes (maxMinutes).`)
    const stems = await splitStems(left, right, {
      mode,
      quality: input.quality,
      onProgress: (done, total) => log.debug(`${name}: segment ${done}/${total}`),
    })
    const minutes = startedMinutes(duration)
    if (minutes > 1) {
      try {
        await Actor.charge({ eventName: EVENT, count: minutes - 1 })
      } catch (e) {
        log.debug(`charge skipped: ${e.message}`)
      }
    }
    const base = name.replace(/\.[^.]+$/, '')
    const row = { mode, format, duration: Math.round(duration * 10) / 10, minutes }
    for (const [stem, planes] of Object.entries(stems)) {
      const audio = await encodeStereo(planes, format, kbps)
      const key = storeKey(index, `${base}-${stem}.${audio.ext}`)
      await store.setValue(key, audio.output, { contentType: audio.mime })
      row[`${stem}Url`] = store.getPublicUrl(key)
    }
    log.info(`${name}: ${duration.toFixed(0)} s split in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
    return row
  },
})

await Actor.exit()
