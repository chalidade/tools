import os from 'node:os'
import { Actor, log } from 'apify'
import { fileUrls, runBatch, storeKey } from './batch.js'
import { convertAudio } from './convert.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one audio or video URL to "files".')
}

const format = input.format ?? 'mp3'

await runBatch({
  urls,
  // Audio is cheap to encode: one flat event per file.
  eventName: 'audio-converted',
  maxMb: input.maxFileSizeMb ?? 300,
  concurrency: Math.max(1, Math.min(4, os.cpus().length)),
  async process({ name, index, bytes, store }) {
    const r = await convertAudio(bytes, {
      format,
      bitrate: input.bitrate,
      sampleRate: input.sampleRate,
      mono: input.mono,
      normalize: input.normalize,
      loudness: input.loudness,
      trimSilence: input.trimSilence,
      fadeIn: input.fadeIn,
      fadeOut: input.fadeOut,
      start: input.trimStart,
      end: input.trimEnd,
      keepMetadata: input.keepMetadata,
    })
    const key = storeKey(index, name.replace(/\.[^.]+$/, '') + '.' + r.ext)
    await store.setValue(key, r.output, { contentType: r.mime })
    return {
      downloadUrl: store.getPublicUrl(key),
      key,
      inputCodec: r.inputCodec,
      outputFormat: format,
      duration: r.duration,
      channels: r.channels,
      sampleRate: r.sampleRate,
      sizeBefore: bytes.length,
      sizeAfter: r.output.length,
    }
  },
})

log.info('Converted files are in the key-value store; links are in the dataset.')
await Actor.exit()
