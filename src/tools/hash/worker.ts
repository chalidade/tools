// Hashes a file in 4 MB slices, so a multi-GB file never sits in memory whole.
import { hashers } from './algorithms'

const CHUNK = 4 * 1024 * 1024

self.onmessage = async (e: MessageEvent<File>) => {
  const file = e.data
  try {
    const h = await hashers()
    for (let offset = 0; offset < file.size; offset += CHUNK) {
      h.update(new Uint8Array(await file.slice(offset, offset + CHUNK).arrayBuffer()))
      self.postMessage({ progress: Math.min(1, (offset + CHUNK) / file.size) })
    }
    self.postMessage({ digests: h.digest() })
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) })
  }
}
