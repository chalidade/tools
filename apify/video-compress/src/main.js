import os from 'node:os'
import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { compressVideo } from './compress.js'
import { startedMinutes } from './ffmpeg.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one video URL to "files".')
}

// One event per started minute of output video; the first is charged with the
// dataset row, the rest just before it.
const EVENT = 'video-minute'
const format = input.format ?? 'mp4'

await runBatch({
  urls,
  eventName: EVENT,
  maxMb: input.maxFileSizeMb ?? 500,
  // ffmpeg uses every core for one file; two in parallel only on big machines.
  concurrency: os.cpus().length >= 8 ? 2 : 1,
  async process({ name, index, bytes, store }) {
    const t0 = Date.now()
    const r = await compressVideo(bytes, {
      format,
      quality: input.quality ?? 'medium',
      resolution: input.resolution ?? 'original',
      fps: input.fps,
      removeAudio: input.removeAudio,
      start: input.trimStart,
      end: input.trimEnd,
      keepMetadata: input.keepMetadata,
      gifWidth: input.gifWidth,
    })
    const minutes = startedMinutes(r.duration)
    if (minutes > 1) {
      try {
        await Actor.charge({ eventName: EVENT, count: minutes - 1 })
      } catch (e) {
        log.debug(`charge skipped: ${e.message}`)
      }
    }
    const key = storeKey(index, name.replace(/\.[^.]+$/, '') + '.' + r.ext)
    await store.setValue(key, r.output, { contentType: r.mime })
    return {
      downloadUrl: store.getPublicUrl(key),
      key,
      outputFormat: format,
      duration: r.duration,
      minutes,
      widthBefore: r.widthBefore,
      heightBefore: r.heightBefore,
      width: r.width,
      height: r.height,
      inputCodec: r.inputCodec,
      sizeBefore: bytes.length,
      sizeAfter: r.output.length,
      savedPercent: Math.round((1 - r.output.length / bytes.length) * 1000) / 10,
      keptOriginal: r.keptOriginal || undefined,
      seconds: Math.round((Date.now() - t0) / 100) / 10,
    }
  },
})

log.info('Videos are in the key-value store; links are in the dataset.')
await Actor.exit()
