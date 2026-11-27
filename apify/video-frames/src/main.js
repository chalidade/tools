import os from 'node:os'
import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { extractFrames } from './frames.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one video URL to "files".')
}

// Charged per video processed (flat): the frames themselves are cheap.
const EVENT = 'video-processed'

await runBatch({
  urls,
  eventName: EVENT,
  maxMb: input.maxFileSizeMb ?? 500,
  concurrency: Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2) || 1)),
  async process({ name, index, bytes, store }) {
    const r = await extractFrames(bytes, {
      mode: input.mode ?? 'interval',
      interval: input.interval,
      count: input.count,
      times: input.timestamps,
      sceneThreshold: input.sceneThreshold,
      maxFrames: input.maxFrames,
      width: input.width,
      format: input.format ?? 'jpg',
      quality: input.quality,
    })
    const base = name.replace(/\.[^.]+$/, '')
    const frames = []
    for (const [i, f] of r.frames.entries()) {
      const key = storeKey(index, `${base}-${String(i + 1).padStart(4, '0')}.${r.ext}`)
      await store.setValue(key, f.output, { contentType: r.mime })
      frames.push({ time: f.time, url: store.getPublicUrl(key) })
    }
    return {
      frameCount: frames.length,
      firstFrame: frames[0]?.url,
      frames,
      duration: r.duration,
      width: r.width,
      height: r.height,
      fps: r.fps,
    }
  },
})

log.info('Frames are in the key-value store; links are in the dataset.')
await Actor.exit()
