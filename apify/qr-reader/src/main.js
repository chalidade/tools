import { Actor } from 'apify'
import { fileUrls, runBatch } from './batch.js'
import { scanImage } from './scan.js'

await Actor.init()

const input = (await Actor.getInput()) ?? {}
const urls = fileUrls(input.files)
if (!urls.length) {
  await Actor.fail('Add at least one image URL to "files".')
}

await runBatch({
  urls,
  eventName: 'image-scanned',
  maxMb: input.maxFileSizeMb ?? 30,
  concurrency: 4,
  async process({ bytes }) {
    const codes = await scanImage(bytes, { formats: input.formats })
    const row = {
      found: codes.length,
      text: codes[0]?.text ?? null,
      format: codes[0]?.format ?? null,
      codes: input.includePositions ? codes : codes.map(({ position: _position, ...rest }) => rest),
    }
    return row
  },
})

await Actor.exit()
