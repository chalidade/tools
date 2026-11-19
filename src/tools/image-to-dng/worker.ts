// Encodes one DNG off the main thread: lossless-JPEG tiles of a 24 MP photo
// take a few seconds.
import { encodeDng } from './dng'

export interface DngJob {
  rgba: ArrayBuffer
  width: number
  height: number
  date: number
}

export type DngReply = { progress: number } | { blob: Blob } | { error: string }

self.onmessage = (e: MessageEvent<DngJob>) => {
  const { rgba, width, height, date } = e.data
  try {
    const blob = encodeDng({
      rgba: new Uint8ClampedArray(rgba),
      width,
      height,
      date: new Date(date),
      onProgress: (progress) => self.postMessage({ progress } satisfies DngReply),
    })
    self.postMessage({ blob } satisfies DngReply)
  } catch (err) {
    self.postMessage({ error: String(err) } satisfies DngReply)
  }
}
