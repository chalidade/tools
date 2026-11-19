// JPG/PNG/WebP/HEIC → DNG, all in the browser. The picture is decoded with
// the image helpers (EXIF rotation applied), flattened onto white (DNG raw
// data has no transparency) and handed to a worker that writes the file.

import { decodeImage, newCanvas } from '@/lib/image'
import { decodeHeic, isHeic } from '../convert-image/heic'
import type { DngJob, DngReply } from './worker'

export interface DngResult {
  blob: Blob
  width: number
  height: number
}

async function pixels(file: File): Promise<ImageData> {
  if (isHeic(file)) return decodeHeic(file)
  const img = await decodeImage(file)
  try {
    const canvas = newCanvas(img.width, img.height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height)
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  } finally {
    img.close()
  }
}

function flatten(data: ImageData) {
  // HEIC can carry alpha too; blend it onto white like the canvas path does.
  const p = data.data
  for (let i = 0; i < p.length; i += 4) {
    const a = p[i + 3]
    if (a === 255) continue
    const k = a / 255
    p[i] = p[i] * k + 255 * (1 - k)
    p[i + 1] = p[i + 1] * k + 255 * (1 - k)
    p[i + 2] = p[i + 2] * k + 255 * (1 - k)
    p[i + 3] = 255
  }
  return data
}

export async function imageToDng(file: File, onProgress: (done: number) => void): Promise<DngResult> {
  const data = flatten(await pixels(file))
  const { width, height } = data
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<DngReply>) => {
        if ('progress' in e.data) onProgress(e.data.progress)
        else if ('blob' in e.data) resolve(e.data.blob)
        else reject(new Error(e.data.error))
      }
      worker.onerror = () => reject(new Error('worker'))
      const job: DngJob = { rgba: data.data.buffer as ArrayBuffer, width, height, date: file.lastModified || Date.now() }
      worker.postMessage(job, [job.rgba])
    })
    return { blob, width, height }
  } finally {
    worker.terminate()
  }
}
